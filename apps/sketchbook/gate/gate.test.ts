import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createGate,
  safeNext,
  signSession,
  verifySession,
  SESSION_COOKIE,
} from "./gate.js";

const PASSWORD = "correct horse battery staple";
const SECRET = "test-secret";
const ORIGIN = "https://sketchbook.example";

function setup(config = { password: PASSWORD, secret: SECRET }) {
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
