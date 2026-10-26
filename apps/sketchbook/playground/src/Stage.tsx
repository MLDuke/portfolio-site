import { Component, Suspense, lazy, type ComponentType, type ReactNode } from "react";
import { typeNeedsSource, type Problem } from "../../scripts/lib/entry.mjs";
import type { Sketch } from "./sketch";
import { ShareButton } from "./ShareButton";

// Share links are signed by the password gate (gate/gate.js), which only runs
// on a Vercel deploy. `npm run dev` and `vite preview` have nothing to ask.
const SHARE_LINKS = __SHARE_LINKS_ENABLED__;

// One React.lazy per sketch, memoised so navigating away and back does not throw
// away the already-loaded chunk.
const lazyCache = new Map<string, ComponentType>();
function lazyFor(sketch: Sketch): ComponentType | null {
  if (!sketch.load) return null;
  let C = lazyCache.get(sketch.dir);
  if (!C) {
    C = lazy(sketch.load);
    lazyCache.set(sketch.dir, C);
  }
  return C;
}

// An invalid entry can be missing its title, date or type. Label it with what
// is there rather than a blank link; its problems are shown alongside.
export const titleOf = (s: Sketch) => s.title || s.dir;
const metaOf = (s: Sketch, extra: string[] = []) =>
  [s.date, s.type, ...extra].filter(Boolean).join(" · ");

export function problemSummary(problems: Problem[]): string {
  return problems
    .map((p) => `${p.level}: ${p.file === "index.md" ? "" : `${p.file}: `}${p.message}`)
    .join("\n");
}

class SketchBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <pre className="panel panel--error">
          {String(this.state.error.stack ?? this.state.error)}
        </pre>
      );
    }
    return this.props.children;
  }
}

// `shared` is the entry as a share link shows it (share.tsx): no way back to the
// index, which a share link can't reach, and no problems, which are notes to
// the author.
export function Stage({ sketch, shared = false }: { sketch: Sketch; shared?: boolean }) {
  const Sketch = lazyFor(sketch);
  const hasMedia = sketch.media.some((m) => m.url);

  return (
    <article className="stage">
      {!shared && (
        <nav className="stage__bar">
          <a className="stage__back" href="#/">
            ← sketchbook
          </a>
          {SHARE_LINKS && <ShareButton dir={sketch.dir} />}
        </nav>
      )}
      <header className="stage__head">
        <h1>{titleOf(sketch)}</h1>
        <p className="stage__meta">
          {metaOf(sketch, sketch.publish && !shared ? ["published"] : [])}
        </p>
        {sketch.description && <p className="stage__desc">{sketch.description}</p>}
      </header>

      {!shared && sketch.problems.length > 0 && (
        <pre className="panel panel--warn">
          This entry has problems:
          {"\n"}
          {problemSummary(sketch.problems)}
        </pre>
      )}

      {Sketch ? (
        <div className="canvas">
          {/* key remounts the sketch (and resets the boundary) on navigation */}
          <SketchBoundary key={sketch.dir}>
            <Suspense fallback={<div className="canvas__loading">loading sketch…</div>}>
              <Sketch />
            </Suspense>
          </SketchBoundary>
        </div>
      ) : hasMedia ? (
        <div className="media">
          {sketch.media.map(
            (m, i) =>
              m.url && (
                <figure key={i}>
                  <img src={m.url} alt={m.alt ?? ""} loading="lazy" />
                  {m.caption && <figcaption>{m.caption}</figcaption>}
                </figure>
              ),
          )}
        </div>
      ) : (
        <p className="panel">
          {typeNeedsSource(sketch.type) ? (
            <>
              No <code>src/index.tsx</code> yet — add one that{" "}
              <code>export default</code>s a React component.
            </>
          ) : (
            <>
              No media yet — drop a PNG/GIF next to <code>index.md</code> and list
              it under <code>media:</code>.
            </>
          )}
        </p>
      )}

      {sketch.note && <div className="note">{sketch.note}</div>}
    </article>
  );
}
