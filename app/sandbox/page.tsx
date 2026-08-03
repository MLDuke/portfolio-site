"use client";

import { useState } from "react";
import { AboutModal } from "../components/AboutModal";
import {
  BreadcrumbControl,
  IconButton,
  NavButton,
} from "../components/ComponentPrimitives";
import { FigureCard } from "../components/FigureCard";

const semanticColors = [
  ["surface-base", "bg-surface-base", "text-on-surface-primary"],
  ["surface-raised", "bg-surface-raised", "text-on-surface-primary"],
  ["surface-overlay", "bg-surface-overlay", "text-on-surface-primary"],
  ["on-surface-primary", "bg-on-surface-primary", "text-surface-base"],
  ["on-surface-secondary", "bg-on-surface-secondary", "text-surface-base"],
  ["border-default", "bg-border-default", "text-surface-base"],
  ["accent-a-base", "bg-accent-a-base", "text-accent-a-on-accent"],
  ["accent-b-base", "bg-accent-b-base", "text-accent-b-on-accent"],
] as const;

const primitiveColors = [
  ["neutral-0", "bg-[var(--primitive-neutral-0)]"],
  ["neutral-0-5", "bg-[var(--primitive-neutral-0-5)]"],
  ["neutral-1", "bg-[var(--primitive-neutral-1)]"],
  ["neutral-2", "bg-[var(--primitive-neutral-2)]"],
  ["neutral-3", "bg-[var(--primitive-neutral-3)]"],
  ["neutral-4", "bg-[var(--primitive-neutral-4)]"],
  ["neutral-5", "bg-[var(--primitive-neutral-5)]"],
  ["neutral-6", "bg-[var(--primitive-neutral-6)]"],
  ["neutral-7", "bg-[var(--primitive-neutral-7)]"],
  ["neutral-8", "bg-[var(--primitive-neutral-8)]"],
  ["neutral-9", "bg-[var(--primitive-neutral-9)]"],
  ["neutral-10", "bg-[var(--primitive-neutral-10)]"],
  ["green-0", "bg-[var(--primitive-green-0)]"],
  ["green-1", "bg-[var(--primitive-green-1)]"],
  ["green-2", "bg-[var(--primitive-green-2)]"],
  ["green-3", "bg-[var(--primitive-green-3)]"],
  ["green-4", "bg-[var(--primitive-green-4)]"],
  ["green-5", "bg-[var(--primitive-green-5)]"],
  ["blue-0", "bg-[var(--primitive-blue-0)]"],
  ["blue-1", "bg-[var(--primitive-blue-1)]"],
  ["blue-2", "bg-[var(--primitive-blue-2)]"],
  ["blue-3", "bg-[var(--primitive-blue-3)]"],
  ["blue-4", "bg-[var(--primitive-blue-4)]"],
  ["blue-5", "bg-[var(--primitive-blue-5)]"],
] as const;

const typeSamples = [
  ["Display Large", "text-display-large", "font-sans"],
  ["Display Medium", "text-display-medium", "font-sans"],
  ["Display Small", "text-display-small", "font-sans"],
  ["Heading Large", "text-heading-large", "font-sans"],
  ["Heading Medium", "text-heading-medium", "font-sans"],
  ["Heading Small", "text-heading-small", "font-sans"],
  ["Body Large", "text-body-large", "font-sans"],
  ["Body Medium", "text-body-medium", "font-sans"],
  ["Body Small", "text-body-small", "font-sans"],
  ["Label Large", "text-label-large", "font-mono"],
  ["Label Medium", "text-label-medium", "font-mono"],
  ["Label Small", "text-label-small", "font-mono"],
] as const;

const spacingSamples = [
  ["4", "w-4"],
  ["8", "w-8"],
  ["12", "w-12"],
  ["16", "w-16"],
  ["24", "w-24"],
  ["32", "w-32"],
  ["48", "w-48"],
  ["64", "w-64"],
  ["96", "w-96"],
  ["128", "w-128"],
] as const;

const radiusSamples = [
  ["none", "rounded-none"],
  ["sm", "rounded-sm"],
  ["md", "rounded-md"],
  ["lg", "rounded-lg"],
  ["xl", "rounded-xl"],
] as const;

export default function SandboxPage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <main className="min-h-screen bg-surface-base px-24 py-24 text-on-surface-primary">
      <div className="mx-auto grid max-w-[1180px] gap-48">
        <header className="grid gap-8 border-b border-border-default pb-24">
          <p className="font-mono text-label-medium text-on-surface-secondary">
            /sandbox
          </p>
          <h1 className="text-heading-large">Component, Token, and Style Sandbox</h1>
        </header>

        <SandboxSection kicker="Components" title="Figma-linked components">
          <div className="grid gap-24">
            <Preview label="Nav">
              <nav
                aria-label="Sandbox navigation sample"
                className="inline-flex rounded-[6px] bg-surface-raised p-2 font-mono"
                data-figma-component="Nav"
                data-node-id="33:57"
              >
                <NavButton active href="/sandbox">
                  Projects
                </NavButton>
                <NavButton href="/sandbox">Journal</NavButton>
                <NavButton>Information</NavButton>
              </nav>
            </Preview>

            <Preview label="Breadcrumb Control">
              <BreadcrumbControl
                label="Work / Project Name"
                nextHref="/projects/project-two"
                previousHref="/projects/project-three"
              />
            </Preview>

            <Preview label="Icon Button">
              <div className="flex gap-8">
                <IconButton aria-label="Previous" href="/sandbox" icon="←" />
                <IconButton aria-label="Next" href="/sandbox" icon="→" />
              </div>
            </Preview>

            <Preview label="Figure">
              <div className="grid gap-16 md:grid-cols-[repeat(2,346px)] xl:grid-cols-[repeat(5,346px)]">
                {(["rest", "hover", "pressed", "focused", "disabled"] as const).map(
                  (state) => (
                    <div className="grid gap-8" key={state}>
                      <div className="h-[449px]">
                        <FigureCard
                          index="002"
                          state={state}
                          title="Project Name"
                        />
                      </div>
                      <p className="font-mono text-label-small text-on-surface-secondary">
                        {state}
                      </p>
                    </div>
                  ),
                )}
              </div>
              <div className="mt-16 grid gap-8 md:w-[346px]">
                <div className="h-[449px]">
                  <FigureCard index="002" title="Entry Name" variant="journal" />
                </div>
                <p className="font-mono text-label-small text-on-surface-secondary">
                  journal sizing
                </p>
              </div>
            </Preview>

            <Preview label="Information Modal">
              <button
                className="rounded-sm bg-surface-raised px-8 py-4 font-mono text-label-medium"
                onClick={() => setShowModal(true)}
                type="button"
              >
                Open Information
              </button>
            </Preview>
          </div>
        </SandboxSection>

        <SandboxSection kicker="Tokens" title="Semantic colors">
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
            {semanticColors.map(([name, background, foreground]) => (
              <div
                className={`${background} ${foreground} grid min-h-96 content-between rounded-md border border-border-default p-16`}
                key={name}
              >
                <span className="font-mono text-label-small">{name}</span>
                <span className="text-body-small">Aa</span>
              </div>
            ))}
          </div>
        </SandboxSection>

        <SandboxSection kicker="Tokens" title="Primitive color ramp">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:grid-cols-8">
            {primitiveColors.map(([name, background]) => (
              <div className="grid gap-6" key={name}>
                <div className={`${background} h-48 rounded-sm border border-border-default`} />
                <p className="font-mono text-label-small text-on-surface-secondary">
                  {name}
                </p>
              </div>
            ))}
          </div>
        </SandboxSection>

        <SandboxSection kicker="Styles" title="Typography">
          <div className="grid gap-8">
            {typeSamples.map(([name, sizeClass, fontClass]) => (
              <div
                className="grid gap-8 border-t border-border-default py-12 md:grid-cols-[160px_1fr]"
                key={name}
              >
                <span className="font-mono text-label-small text-on-surface-secondary">
                  {name}
                </span>
                <span className={`${sizeClass} ${fontClass}`}>The quick brown fox</span>
              </div>
            ))}
          </div>
        </SandboxSection>

        <SandboxSection kicker="Styles" title="Spacing, radius, elevation, state">
          <div className="grid gap-32 lg:grid-cols-2">
            <Preview label="Spacing">
              <div className="grid gap-10">
                {spacingSamples.map(([label, width]) => (
                  <div className="flex items-center gap-12" key={label}>
                    <span className="w-48 font-mono text-label-small">{label}</span>
                    <div className={`${width} h-12 bg-on-surface-primary`} />
                  </div>
                ))}
              </div>
            </Preview>

            <Preview label="Radius">
              <div className="grid grid-cols-5 gap-12">
                {radiusSamples.map(([label, radius]) => (
                  <div className="grid gap-8" key={label}>
                    <div className={`${radius} h-64 bg-surface-raised`} />
                    <p className="font-mono text-label-small">{label}</p>
                  </div>
                ))}
              </div>
            </Preview>

            <Preview label="Elevation">
              <div className="grid grid-cols-2 gap-16">
                <div className="grid h-96 place-items-center rounded-md bg-surface-raised shadow-raised">
                  <span className="font-mono text-label-small">raised</span>
                </div>
                <div className="grid h-96 place-items-center rounded-md bg-surface-overlay shadow-overlay">
                  <span className="font-mono text-label-small">overlay</span>
                </div>
              </div>
            </Preview>

            <Preview label="State layer">
              <div className="flex flex-wrap gap-12">
                <button className="state-layer rounded-md bg-surface-raised px-16 py-12 font-mono text-label-medium">
                  Hover
                </button>
                <button
                  className="state-layer rounded-md bg-surface-raised px-16 py-12 font-mono text-label-medium"
                  data-selected="true"
                >
                  Selected
                </button>
              </div>
            </Preview>
          </div>
        </SandboxSection>
      </div>

      {showModal ? <AboutModal onClose={() => setShowModal(false)} /> : null}
    </main>
  );
}

function SandboxSection({
  children,
  kicker,
  title,
}: {
  children: React.ReactNode;
  kicker: string;
  title: string;
}) {
  return (
    <section className="grid gap-16">
      <div className="grid gap-4">
        <p className="font-mono text-label-small text-on-surface-secondary">
          {kicker}
        </p>
        <h2 className="text-heading-medium">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Preview({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="grid gap-12 border-t border-border-default pt-12">
      <p className="font-mono text-label-small text-on-surface-secondary">{label}</p>
      <div className="min-w-0 overflow-x-auto">{children}</div>
    </div>
  );
}
