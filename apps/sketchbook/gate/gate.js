// The password gate in front of the deployed playground. One shared password
// gets a signed session cookie; every other request needs that cookie, except a
// share link's page and what it loads. See
// docs/adr/0017-password-gate-in-routing-middleware.md and
// docs/adr/0018-share-links.md.
//
// This module is plain request-in, response-out so node:test can drive it. It
// returns undefined to let a request through; middleware.js turns that into
// Vercel's "continue" response.
//
// Plain JavaScript with JSDoc types: Vercel compiles a TypeScript middleware
// with the app's own `typescript`, and TypeScript 7 has no compiler API for it.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "sketchbook_session";
const SESSION_SECONDS = 30 * 24 * 60 * 60;
export const SHARE_SECONDS = 180 * 24 * 60 * 60;

// The share build's output (playground/share-pages.ts): a page per entry, its
// unfurl image, and hashed assets that only those pages name.
const SHARE_PAGE = /^\/s\/([^/]+)\/(?:index\.html)?$/;
const SHARE_OG_IMAGE = /^\/s\/[^/]+\/og\.[a-z]+$/;
const SHARE_ASSETS = "/s/assets/";
// An entry folder name, `<date>-<slug>` (ADR 0013).
const ENTRY_DIR = /^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/;

// Best effort: the counts live in one function instance's memory, so they
// slow a guesser down rather than stop one. A long password is the real
// defence.
const MAX_FAILURES = 10;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;
const FAILURE_DELAY_MS = 1000;

/**
 * @typedef {{ password?: string, secret?: string, shareSecret?: string }} GateConfig
 * @typedef {{ now?: () => number, delay?: (ms: number) => Promise<void> }} GateDeps
 * @typedef {(request: Request) => Promise<Response | undefined>} Gate
 */

/**
 * @param {GateConfig} config
 * @param {GateDeps} [deps]
 * @returns {Gate}
 */
export function createGate(
  { password, secret, shareSecret },
  { now = Date.now, delay = sleep } = {},
) {
  // Fail closed: a deploy without both secrets serves nothing. Without a share
  // secret, share links are off and the rest works.
  if (!password || !secret) {
    return async () => text("The sketchbook isn't configured.", 503);
  }

  /** @type {Map<string, { count: number, resetAt: number }>} */
  const failures = new Map();

  /** @param {number} at */
  const pruneFailures = (at) => {
    for (const [ip, record] of failures) {
      if (record.resetAt <= at) failures.delete(ip);
    }
  };

  /** @param {Request} request */
  const logIn = async (request) => {
    const form = new URLSearchParams(await request.text());
    const next = safeNext(form.get("next"));
    const ip = clientIp(request);
    const at = now();

    const record = failures.get(ip);
    if (record && record.resetAt > at && record.count >= MAX_FAILURES) {
      return page(loginPage(next, "Too many attempts. Try again later."), 429);
    }

    if (passwordMatches(form.get("password") ?? "", password)) {
      failures.delete(ip);
      const cookie = sessionCookie(signSession(at, password, secret));
      return redirect(next, 303, cookie);
    }

    if (!record || record.resetAt <= at) {
      if (failures.size > 1000) pruneFailures(at);
      failures.set(ip, { count: 1, resetAt: at + FAILURE_WINDOW_MS });
    } else {
      record.count += 1;
    }
    await delay(FAILURE_DELAY_MS);
    return page(loginPage(next, "That password isn't right."), 401);
  };

  // Signs a share link to one entry for someone with a session.
  /** @param {Request} request */
  const share = async (request) => {
    if (!shareSecret) return text("Sharing isn't configured.", 503);
    const dir = new URLSearchParams(await request.text()).get("dir") ?? "";
    if (!ENTRY_DIR.test(dir)) return text("Not an entry.", 400);
    const token = signShare(dir, now(), shareSecret);
    const expires = new Date(Number(token.split(".")[0]) * 1000).toISOString();
    const url = `${new URL(request.url).origin}/s/${dir}/?t=${token}`;
    return json({ url, expires });
  };

  // Requests that skip the session check: a share page with a valid token for
  // that entry, plus the share build's assets and unfurl images. Those assets
  // are hashed and named only by the share pages, and hold one entry each.
  /** @param {URL} url */
  const isPublic = ({ pathname, searchParams }) => {
    if (pathname.startsWith(SHARE_ASSETS) || SHARE_OG_IMAGE.test(pathname)) return true;
    const dir = pathname.match(SHARE_PAGE)?.[1];
    const token = searchParams.get("t");
    return Boolean(dir && token && shareSecret && verifyShare(dir, token, shareSecret, now()));
  };

  return async (request) => {
    const url = new URL(request.url);
    const { pathname } = url;

    if (pathname === "/robots.txt") {
      return text("User-agent: *\nDisallow: /\n", 200);
    }
    if (pathname === "/logout") {
      return redirect("/login", 303, clearCookie());
    }
    if (pathname === "/login") {
      if (request.method === "POST") return logIn(request);
      return page(loginPage(safeNext(url.searchParams.get("next"))), 200);
    }
    if (isPublic(url)) return undefined;

    const session = readCookie(request, SESSION_COOKIE);
    if (session && verifySession(session, password, secret, now())) {
      if (pathname === "/share" && request.method === "POST") return share(request);
      return undefined;
    }

    // Someone holding a share link that has expired, or was revoked by rotating
    // the share secret, is told so rather than asked for a password.
    if (SHARE_PAGE.test(pathname) && url.searchParams.has("t")) {
      return page(messagePage("This share link has expired or is no longer valid."), 403);
    }

    if (request.method === "GET" || request.method === "HEAD") {
      const next = encodeURIComponent(pathname + url.search);
      return redirect(`/login?next=${next}`, 302);
    }
    return text("Unauthorized", 401);
  };
}

// A session is `<expiry>.<signature>`. The signature covers a hash of the
// password, so changing either the password or the secret ends every session.
/**
 * @param {number} at
 * @param {string} password
 * @param {string} secret
 */
export function signSession(at, password, secret) {
  const expires = Math.floor(at / 1000) + SESSION_SECONDS;
  return `${expires}.${signature(expires, password, secret)}`;
}

/**
 * @param {string} value
 * @param {string} password
 * @param {string} secret
 * @param {number} at
 * @returns {boolean}
 */
export function verifySession(value, password, secret, at) {
  const [expiresText, given] = value.split(".");
  const expires = Number(expiresText);
  if (!Number.isInteger(expires) || !given) return false;
  if (expires * 1000 <= at) return false;
  return sameBytes(given, signature(expires, password, secret));
}

// A share token is `<expiry>.<signature>` over the entry's folder name, signed
// with its own secret: rotating it revokes every share link and no session.
/**
 * @param {string} dir
 * @param {number} at
 * @param {string} secret
 */
export function signShare(dir, at, secret) {
  const expires = Math.floor(at / 1000) + SHARE_SECONDS;
  return `${expires}.${shareSignature(dir, expires, secret)}`;
}

/**
 * @param {string} dir
 * @param {string} token
 * @param {string} secret
 * @param {number} at
 * @returns {boolean}
 */
export function verifyShare(dir, token, secret, at) {
  const [expiresText, given] = token.split(".");
  const expires = Number(expiresText);
  if (!Number.isInteger(expires) || !given) return false;
  if (expires * 1000 <= at) return false;
  return sameBytes(given, shareSignature(dir, expires, secret));
}

/**
 * @param {string} dir
 * @param {number} expires
 * @param {string} secret
 */
function shareSignature(dir, expires, secret) {
  return createHmac("sha256", secret).update(`share.${dir}.${expires}`).digest("base64url");
}

/**
 * @param {number} expires
 * @param {string} password
 * @param {string} secret
 */
function signature(expires, password, secret) {
  return createHmac("sha256", secret)
    .update(`${expires}.${sha256(password)}`)
    .digest("base64url");
}

// Hashing both sides first gives equal-length inputs, so the comparison takes
// the same time whatever the guess's length.
/**
 * @param {string} input
 * @param {string} password
 */
function passwordMatches(input, password) {
  return timingSafeEqual(
    createHash("sha256").update(input).digest(),
    createHash("sha256").update(password).digest(),
  );
}

/**
 * @param {string} a
 * @param {string} b
 */
function sameBytes(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** @param {string} value */
function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

// Only same-site paths, so the login form can't be used as an open redirect.
// The fragment is kept: the playground routes on it.
/**
 * @param {string | null} value
 * @returns {string}
 */
export function safeNext(value) {
  if (!value || !value.startsWith("/")) return "/";
  if (value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}

/** @param {Request} request */
function clientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

/**
 * @param {Request} request
 * @param {string} name
 */
function readCookie(request, name) {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return undefined;
}

/** @param {string} value */
function sessionCookie(value) {
  return `${SESSION_COOKIE}=${value}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Lax`;
}

function clearCookie() {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

/**
 * @param {string} location
 * @param {number} status
 * @param {string} [cookie]
 */
function redirect(location, status, cookie) {
  const headers = new Headers({ Location: location, "Cache-Control": "no-store" });
  if (cookie) headers.set("Set-Cookie", cookie);
  return new Response(null, { status, headers });
}

/**
 * @param {string} body
 * @param {number} status
 */
function text(body, status) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/** @param {unknown} body */
function json(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/**
 * @param {string} body
 * @param {number} status
 */
function page(body, status) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** @param {string} value */
function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/**
 * @param {string} next
 * @param {string} [error]
 */
function loginPage(next, error) {
  const errorBlock = error
    ? `<p id="error" class="error" role="alert">${escapeHtml(error)}</p>`
    : "";
  return documentFor(`<form method="post" action="/login">
  <h1>Sketchbook</h1>
  <label for="password">Password</label>
  <input id="password" name="password" type="password" autocomplete="current-password" required autofocus${error ? ' aria-describedby="error"' : ""}>
  ${errorBlock}
  <input type="hidden" name="next" value="${escapeHtml(next)}">
  <button type="submit">Open</button>
</form>
<script>
  // The playground routes on the URL fragment, which never reaches the server.
  // The redirect here kept it, so carry it through the form post.
  document.querySelector("form").addEventListener("submit", function () {
    var next = this.elements.next;
    if (location.hash && next.value.indexOf("#") === -1) next.value += location.hash;
  });
</script>`);
}

/** @param {string} message */
function messagePage(message) {
  return documentFor(`<main>
  <h1>Sketchbook</h1>
  <p>${escapeHtml(message)}</p>
</main>`);
}

// Self-contained: the playground's CSS and fonts sit behind the gate.
/** @param {string} body */
function documentFor(body) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Sketchbook</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center;
    background: #121212; color: #ededed; font: 16px/1.5 system-ui, sans-serif; }
  form, main { display: grid; gap: 12px; width: min(320px, calc(100vw - 48px)); }
  p { margin: 0; color: #b4b4b4; }
  h1 { margin: 0 0 4px; font-size: 20px; font-weight: 600; }
  label { font-size: 14px; color: #b4b4b4; }
  input { font: inherit; padding: 10px 12px; border-radius: 8px;
    border: 1px solid #3a3a3a; background: #1c1c1c; color: inherit; }
  button { font: inherit; font-weight: 500; padding: 10px 12px; border: 0;
    border-radius: 8px; background: #ededed; color: #121212; cursor: pointer; }
  input:focus-visible, button:focus-visible { outline: 2px solid #8ab4ff; outline-offset: 2px; }
  .error { margin: 0; font-size: 14px; color: #ff8a80; }
</style>
</head>
<body>
${body}
</body>
</html>
`;
}
