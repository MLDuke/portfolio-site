import { useEffect, useState } from "react";
import { sketches } from "./sketches";
import { Stage, problemSummary, titleOf } from "./Stage";
import { DevOverlays } from "./devtools";

function useHashRoute(): string {
  const [route, setRoute] = useState(() => currentRoute());
  useEffect(() => {
    const onChange = () => setRoute(currentRoute());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

function currentRoute(): string {
  return decodeURIComponent(window.location.hash.replace(/^#\/?/, ""));
}

function Index() {
  return (
    <div className="index">
      <h1>sketchbook</h1>
      <p className="index__lead">
        {sketches.length} {sketches.length === 1 ? "entry" : "entries"}. Code and
        mixed entries render live; image entries show their media.
      </p>
      <ul className="index__grid">
        {sketches.map((s) => {
          // The generated thumbnail shows what the stage renders; listed media
          // stands in for entries without one (image entries, mostly).
          const thumb = s.thumbnailUrl ?? s.media.find((m) => m.url)?.url;
          return (
            <li key={s.dir}>
              <a href={`#/${s.dir}`}>
                <div className="index__thumb" data-type={s.type}>
                  {thumb ? <img src={thumb} alt="" loading="lazy" /> : <span>{s.type ?? "?"}</span>}
                </div>
                <span className="index__title">{titleOf(s)}</span>
                <span className="index__meta">{s.date}</span>
                {s.problems.length > 0 && (
                  <span className="index__warn" title={problemSummary(s.problems)}>
                    {s.problems.length} {s.problems.length === 1 ? "problem" : "problems"}
                  </span>
                )}
              </a>
            </li>
          );
        })}
      </ul>
      {sketches.length === 0 && (
        <p className="panel">
          No entries yet — run <code>npm run new</code> to scaffold one.
        </p>
      )}
    </div>
  );
}

export function App() {
  const route = useHashRoute();
  const current = sketches.find((s) => s.dir === route) ?? null;

  return (
    <div className="app">
      <main className="main">{current ? <Stage sketch={current} /> : <Index />}</main>

      <DevOverlays />
    </div>
  );
}
