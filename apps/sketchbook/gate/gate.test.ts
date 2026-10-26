import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createGate,
  safeNext,
  signSession,
  signShare,
  verifySession,
  verifyShare,
  SESSION_COOKIE,
} from "./gate.js";

const PASSWORD = "correct horse battery staple";
const SECRET = "test-secret";
const SHARE_SECRET = "test-share-secret";
const DIR = "2026-10-06-word-sphere";
const ORIGIN = "https://sketchbook.example";

function setup(
  config: { password?: string; secret?: string; shareSecret?: string } = {
    password: PASSWORD,
    secret: SECRET,
    shareSecret: SHARE_SECRET,
  },
) {
  let clock = Date.UTC(2026, 9, 18);
  const delays: number[] = [];
  const gate = createGate(config, {
    now: () => clock,
    delay: async (ms) => {
      delays.push(ms);
    },
  });
  return {
    gate,
    delays,
    advance(ms: number) {
      clock += ms;
    },
  };
}

function get(path: string, cookie?: string) {
  return new Request(ORIGIN + path, {
    headers: cookie ? { cookie: `${SESSION_COOKIE}=${cookie}` } : {},
  });
}

function login(password: string, next = "/", ip = "203.0.113.1") {
  return new Request(`${ORIGIN}/login`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-forwarded-for": ip,
    },
    body: new URLSearchParams({ password, next }).toString(),
  });
}

function sessionFrom(response: Response) {
  const header = response.headers.get("set-cookie") ?? "";
  return header.split(";")[0].split("=").slice(1).join("=");
}

test("serves nothing when either secret is missing", async () => {
  for (const config of [{ password: PASSWORD }, { secret: SECRET }, {}]) {
    const response = await createGate(config)(get("/"));
    assert.equal(response?.status, 503);
  }
});

test("sends a visitor without a session to /login, keeping the path", async () => {
  const { gate } = setup();
  const response = await gate(get("/assets/index.js?v=2"));
  assert.equal(response?.status, 302);
  assert.equal(
    response?.headers.get("location"),
    "/login?next=%2Fassets%2Findex.js%3Fv%3D2",
  );
});

test("refuses other methods without a session", async () => {
  const { gate } = setup();
  const response = await gate(new Request(`${ORIGIN}/api/x`, { method: "POST" }));
  assert.equal(response?.status, 401);
});

test("serves the login page and a disallow-all robots.txt publicly", async () => {
  const { gate } = setup();
  const loginPage = await gate(get("/login?next=%2F%23%2Fdot-raster"));
  assert.equal(loginPage?.status, 200);
  assert.match(await loginPage!.text(), /name="next" value="\/#\/dot-raster"/);

  const robots = await gate(get("/robots.txt"));
  assert.equal(robots?.status, 200);
  assert.equal(await robots!.text(), "User-agent: *\nDisallow: /\n");
});

test("the right password sets a session cookie and returns to next", async () => {
  const { gate } = setup();
  const response = await gate(login(PASSWORD, "/#/word-sphere"));
  assert.equal(response?.status, 303);
  assert.equal(response?.headers.get("location"), "/#/word-sphere");

  const cookie = response?.headers.get("set-cookie") ?? "";
  for (const attribute of ["HttpOnly", "Secure", "SameSite=Lax", "Path=/", "Max-Age="]) {
    assert.ok(cookie.includes(attribute), `cookie has ${attribute}`);
  }

  const through = await gate(get("/assets/index.js", sessionFrom(response!)));
  assert.equal(through, undefined);
});

test("a wrong password is refused after a delay", async () => {
  const { gate, delays } = setup();
  const response = await gate(login("nope"));
  assert.equal(response?.status, 401);
  assert.equal(response?.headers.get("set-cookie"), null);
  assert.match(await response!.text(), /role="alert"/);
  assert.deepEqual(delays, [1000]);
});

test("ten wrong passwords lock that address out for the window", async () => {
  const { gate, advance } = setup();
  for (let i = 0; i < 10; i++) await gate(login("nope"));

  assert.equal((await gate(login(PASSWORD)))?.status, 429);
  assert.equal((await gate(login(PASSWORD, "/", "198.51.100.7")))?.status, 303);

  advance(15 * 60 * 1000);
  assert.equal((await gate(login(PASSWORD)))?.status, 303);
});

test("sessions expire after 30 days", async () => {
  const { gate, advance } = setup();
  const session = sessionFrom((await gate(login(PASSWORD)))!);
  advance(29 * 24 * 60 * 60 * 1000);
  assert.equal(await gate(get("/", session)), undefined);
  advance(2 * 24 * 60 * 60 * 1000);
  assert.equal((await gate(get("/", session)))?.status, 302);
});

test("a tampered or malformed session is refused", () => {
  const at = Date.now();
  const session = signSession(at, PASSWORD, SECRET);
  const [expires, signature] = session.split(".");
  const later = `${Number(expires) + 1000}.${signature}`;
  for (const value of [later, `${expires}.`, "garbage", "", `${expires}.${signature}x`]) {
    assert.equal(verifySession(value, PASSWORD, SECRET, at), false, value);
  }
  assert.equal(verifySession(session, PASSWORD, SECRET, at), true);
});

test("changing the password or the secret ends every session", () => {
  const at = Date.now();
  const session = signSession(at, PASSWORD, SECRET);
  assert.equal(verifySession(session, "new password", SECRET, at), false);
  assert.equal(verifySession(session, PASSWORD, "new secret", at), false);
});

test("logout clears the cookie", async () => {
  const { gate } = setup();
  const response = await gate(get("/logout"));
  assert.equal(response?.status, 303);
  assert.equal(response?.headers.get("location"), "/login");
  assert.match(response?.headers.get("set-cookie") ?? "", /Max-Age=0/);
});

test("next only accepts same-site paths", () => {
  assert.equal(safeNext("/#/dot-raster"), "/#/dot-raster");
  assert.equal(safeNext("/assets/a.js?v=1"), "/assets/a.js?v=1");
  for (const value of [null, "", "https://evil.example", "//evil.example", "/\\evil.example", "login"]) {
    assert.equal(safeNext(value), "/", String(value));
  }
});

// Share links (ADR 0018) ------------------------------------------------------

function askToShare(dir: string, cookie?: string) {
  return new Request(`${ORIGIN}/share`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      ...(cookie ? { cookie: `${SESSION_COOKIE}=${cookie}` } : {}),
    },
    body: new URLSearchParams({ dir }).toString(),
  });
}

async function signedIn(gate: ReturnType<typeof setup>["gate"]) {
  return sessionFrom((await gate(login(PASSWORD)))!);
}

test("someone signed in gets a 180-day share link to one entry", async () => {
  const { gate } = setup();
  const response = await gate(askToShare(DIR, await signedIn(gate)));
  assert.equal(response?.status, 200);
  const { url, expires } = (await response!.json()) as { url: string; expires: string };

  const link = new URL(url);
  assert.equal(link.origin, ORIGIN);
  assert.equal(link.pathname, `/s/${DIR}/`);
  assert.equal(Date.parse(expires), Date.UTC(2026, 9, 18) + 180 * 24 * 60 * 60 * 1000);
  assert.equal(await gate(get(link.pathname + link.search)), undefined);
});

test("only someone signed in can make a share link, and only to an entry", async () => {
  const { gate } = setup();
  assert.equal((await gate(askToShare(DIR)))?.status, 401);

  const session = await signedIn(gate);
  for (const dir of ["", "../index.html", "assets", "2026-10-06-Word-Sphere"]) {
    assert.equal((await gate(askToShare(dir, session)))?.status, 400, dir);
  }
});

test("share links are off without a share secret, and the rest still works", async () => {
  const { gate } = setup({ password: PASSWORD, secret: SECRET });
  const session = await signedIn(gate);
  assert.equal((await gate(askToShare(DIR, session)))?.status, 503);
  assert.equal(await gate(get("/", session)), undefined);

  const token = signShare(DIR, Date.UTC(2026, 9, 18), SHARE_SECRET);
  assert.equal((await gate(get(`/s/${DIR}/?t=${token}`)))?.status, 403);
});

test("a share link opens its own entry's page and nothing else", async () => {
  const { gate } = setup();
  const token = signShare(DIR, Date.UTC(2026, 9, 18), SHARE_SECRET);

  assert.equal(await gate(get(`/s/${DIR}/?t=${token}`)), undefined);
  assert.equal(await gate(get(`/s/${DIR}/index.html?t=${token}`)), undefined);

  assert.equal((await gate(get(`/s/2026-10-03-dot-raster/?t=${token}`)))?.status, 403);
  for (const path of [`/?t=${token}`, `/assets/index.js?t=${token}`, `/s/${DIR}/other.html?t=${token}`]) {
    assert.equal((await gate(get(path)))?.status, 302, path);
  }
});

test("a share page without a token asks for the password", async () => {
  const { gate } = setup();
  assert.equal((await gate(get(`/s/${DIR}/`)))?.status, 302);
  assert.equal(await gate(get(`/s/${DIR}/`, await signedIn(gate))), undefined);
});

test("share assets and unfurl images are public", async () => {
  const { gate } = setup();
  assert.equal(await gate(get("/s/assets/2026-10-06-word-sphere-CqXPEiZe.js")), undefined);
  assert.equal(await gate(get(`/s/${DIR}/og.png`)), undefined);
  assert.equal((await gate(get(`/s/${DIR}/thumbnail.png`)))?.status, 302);
});

test("share links expire after 180 days, and say so", async () => {
  const { gate, advance } = setup();
  const token = signShare(DIR, Date.UTC(2026, 9, 18), SHARE_SECRET);
  advance(179 * 24 * 60 * 60 * 1000);
  assert.equal(await gate(get(`/s/${DIR}/?t=${token}`)), undefined);

  advance(2 * 24 * 60 * 60 * 1000);
  const expired = await gate(get(`/s/${DIR}/?t=${token}`));
  assert.equal(expired?.status, 403);
  assert.match(await expired!.text(), /expired or is no longer valid/);
});

test("a tampered share token, or a rotated share secret, is refused", () => {
  const at = Date.now();
  const token = signShare(DIR, at, SHARE_SECRET);
  const [expires, signature] = token.split(".");
  for (const value of [`${Number(expires) + 1000}.${signature}`, `${expires}.`, "garbage", ""]) {
    assert.equal(verifyShare(DIR, value, SHARE_SECRET, at), false, value);
  }
  assert.equal(verifyShare("2026-10-03-dot-raster", token, SHARE_SECRET, at), false);
  assert.equal(verifyShare(DIR, token, "rotated", at), false);
  assert.equal(verifyShare(DIR, token, SHARE_SECRET, at), true);
});

test("a share token isn't a session, nor a session a share token", () => {
  const at = Date.now();
  assert.equal(verifySession(signShare(DIR, at, SECRET), PASSWORD, SECRET, at), false);
  assert.equal(verifyShare(DIR, signSession(at, PASSWORD, SECRET), SECRET, at), false);
});
