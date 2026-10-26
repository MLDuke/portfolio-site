import { useState } from "react";

type State =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "copied"; expires: string }
  // The clipboard can refuse (permissions, an unfocused tab), so the link is
  // shown to copy by hand instead.
  | { kind: "shown"; url: string; expires: string }
  | { kind: "failed"; message: string };

const expiryDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

// Asks the password gate for a signed share link to this entry (POST /share,
// gate/gate.js) and copies it. Anyone with the link sees this one entry, and
// nothing else, until it expires. See docs/adr/0018-share-links.md.
export function ShareButton({ dir }: { dir: string }) {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function share() {
    setState({ kind: "working" });
    const link = requestLink(dir);
    try {
      // Hand the clipboard a pending value while the click still counts as a
      // user gesture. Safari refuses a write that waits on the fetch first.
      const text = link.then(({ url }) => new Blob([url], { type: "text/plain" }));
      text.catch(() => {}); // a failed request is reported from `link` below
      await navigator.clipboard.write([new ClipboardItem({ "text/plain": text })]);
      setState({ kind: "copied", expires: (await link).expires });
    } catch {
      try {
        setState({ kind: "shown", ...(await link) });
      } catch (error) {
        setState({ kind: "failed", message: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  return (
    <div className="share">
      <button
        type="button"
        className="share__button"
        onClick={share}
        disabled={state.kind === "working"}
      >
        {state.kind === "working" ? "Making link…" : "Copy share link"}
      </button>
      <span className="share__status" role="status">
        {state.kind === "copied" && `Copied. Expires ${expiryDate(state.expires)}.`}
        {state.kind === "shown" && `Expires ${expiryDate(state.expires)}.`}
        {state.kind === "failed" && `Couldn't make a link: ${state.message}`}
      </span>
      {state.kind === "shown" && (
        <input
          className="share__url"
          readOnly
          value={state.url}
          aria-label="Share link"
          onFocus={(event) => event.currentTarget.select()}
          autoFocus
        />
      )}
    </div>
  );
}

async function requestLink(dir: string): Promise<{ url: string; expires: string }> {
  const response = await fetch("/share", { method: "POST", body: new URLSearchParams({ dir }) });
  if (!response.ok) throw new Error((await response.text()) || `HTTP ${response.status}`);
  return (await response.json()) as { url: string; expires: string };
}
