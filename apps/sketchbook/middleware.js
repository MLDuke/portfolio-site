// Vercel Routing Middleware: runs before every request to the deployed
// playground, static files included. The gate itself is in gate/gate.js; see
// docs/adr/0017-password-gate-in-routing-middleware.md. `npm run dev` doesn't
// run this, so the local playground stays open. JavaScript rather than
// TypeScript for the reason at the top of gate/gate.js.
import { createGate } from "./gate/gate.js";

export const config = { runtime: "nodejs" };

const gate = createGate({
  password: process.env.SKETCHBOOK_PASSWORD,
  secret: process.env.SKETCHBOOK_COOKIE_SECRET,
});

/** @param {Request} request */
export default async function middleware(request) {
  // `x-middleware-next` is what @vercel/functions' next() sends: carry on to
  // the static file. Written out to avoid the dependency.
  return (
    (await gate(request)) ??
    new Response(null, { headers: { "x-middleware-next": "1" } })
  );
}
