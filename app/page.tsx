const typeSamples = [
  { name: "Display Large", className: "text-display-large font-sans" },
  { name: "Display Medium", className: "text-display-medium font-sans" },
  { name: "Display Small", className: "text-display-small font-sans" },
  { name: "Heading Large", className: "text-heading-large font-sans" },
  { name: "Heading Medium", className: "text-heading-medium font-sans" },
  { name: "Heading Small", className: "text-heading-small font-sans" },
  { name: "Body Large", className: "text-body-large font-sans" },
  { name: "Body Medium", className: "text-body-medium font-sans" },
  { name: "Body Small", className: "text-body-small font-sans" },
  { name: "Label Large", className: "text-label-large font-mono" },
  { name: "Label Medium", className: "text-label-medium font-mono" },
  { name: "Label Small", className: "text-label-small font-mono" },
];

const colorSamples = [
  { name: "surface-base", className: "bg-surface-base text-on-surface-primary" },
  {
    name: "surface-raised",
    className: "bg-surface-raised text-on-surface-primary shadow-raised",
  },
  {
    name: "surface-overlay",
    className: "bg-surface-overlay text-on-surface-primary shadow-overlay",
  },
  {
    name: "accent-a-base",
    className: "bg-accent-a-base text-accent-a-on-accent",
  },
  {
    name: "accent-b-base",
    className: "bg-accent-b-base text-accent-b-on-accent",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-surface-base p-24 text-on-surface-primary sm:p-48">
      <div className="mx-auto grid max-w-[72rem] gap-48">
        <header className="grid gap-12">
          <p className="font-mono text-label-medium text-on-surface-secondary">
            Token scaffold
          </p>
          <h1 className="text-display-large">Portfolio Site</h1>
          <p className="max-w-[42rem] text-body-medium text-on-surface-secondary">
            Semantic color, spacing, radius, type, state, and elevation tokens
            are wired through Tailwind v4 CSS theme variables.
          </p>
        </header>

        <section className="grid gap-16">
          <h2 className="text-heading-medium">Color semantics</h2>
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-5">
            {colorSamples.map((sample) => (
              <div
                key={sample.name}
                className={`${sample.className} grid min-h-128 content-between rounded-md border border-border-default p-16`}
              >
                <span className="font-mono text-label-small">{sample.name}</span>
                <span className="text-body-small">Aa</span>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-16">
          <h2 className="text-heading-medium">Type scale</h2>
          <div className="grid gap-8">
            {typeSamples.map((sample) => (
              <div
                key={sample.name}
                className="grid gap-8 border-t border-border-default py-12 sm:grid-cols-[12rem_1fr]"
              >
                <span className="font-mono text-label-small text-on-surface-secondary">
                  {sample.name}
                </span>
                <span className={sample.className}>The quick brown fox</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
