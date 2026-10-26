# 0017. A password gate in Routing Middleware guards the deployed playground

Status: Accepted · 2026-10-18 · amended 2026-10-26 by [0018](0018-share-links.md)

## Context
The playground is going to be served from its own subdomain. A deploy exposes
every entry, drafts included ([0005](0005-vercel-framework-null.md)). Today the
`sketchbook` project's only URL is behind Vercel Authentication, but that is set
to "all except custom domains", so the subdomain would be public the moment it
is added. Vercel's own Password Protection is a paid add-on and is
all-or-nothing, which rules out sharing one sketch by link later (MDU-74).

The playground is a static Vite build, so there is no server of its own to put
a login in front of.

## Decision
`middleware.js` at the app root is Vercel Routing Middleware. Vercel runs it
before every request, static files included. It hands each request to
`gate/gate.js`, which:

- serves a self-contained `/login` page and handles its form post itself, so
  there are no functions under `api/`;
- checks the password against `SKETCHBOOK_PASSWORD` in constant time, and on
  success sets a 30-day `HttpOnly; Secure; SameSite=Lax` cookie signed with
  `SKETCHBOOK_COOKIE_SECRET`. The signature covers a hash of the password, so
  changing either variable ends every session;
- redirects any other GET or HEAD without a valid cookie to `/login?next=…`, and
  refuses other methods with 401;
- serves `/logout` and a disallow-all `/robots.txt` publicly. `vercel.json`
  adds `X-Robots-Tag: noindex, nofollow` to every response;
- serves 503 for everything if either variable is unset, rather than failing
  open.

The gate covers every deployment, previews included, so a preview is behind
Vercel Authentication and the password.

`isPublic()` in `gate.js` is where share links will be let through.

Both files are JavaScript with JSDoc types. Vercel compiles a TypeScript
middleware with the app's own `typescript`, and TypeScript 7 has no compiler API
for it to call. This amends [0007](0007-separate-tsconfigs.md):
`tsconfig.node.json` now covers both files as well as `vite.config.ts`, with
`checkJs`, and `tsconfig.test.json` covers `gate/*.test.ts`, which `npm test`
also runs.

## Consequences
- Don't add the subdomain, or any custom domain, to the `sketchbook` project
  before both variables are set for Production. Vercel Authentication doesn't
  cover custom domains, so the gate is the only lock there.
- Don't rename `middleware.js` or move it out of the app root. Vercel finds it
  by name and place, and nothing fails if it goes missing: the playground just
  ships unprotected.
- Don't convert `middleware.js` or `gate/gate.js` to TypeScript while the app
  is on TypeScript 7. `vercel build` fails with "Cannot read properties of
  undefined (reading 'readFile')".
- `npm run dev` and `vite preview` don't run the middleware, so the local
  playground stays open. `vercel build` and a preview deploy are the way to
  see the gate.
- Rate limiting is best effort: failure counts live in one function instance's
  memory, and each wrong password waits a second. A long password is the real
  defence.
