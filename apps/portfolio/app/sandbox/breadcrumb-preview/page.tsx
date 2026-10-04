"use client";

import { useState } from "react";
import { BreadcrumbControlV2 } from "../../components/BreadcrumbControlV2";
import { sandboxSections } from "../../data/fixtures";
import { NavButton } from "../../components/ComponentPrimitives";
import { SiteLink } from "../../components/SiteLink";

type BreadcrumbScenario = {
  contentLabel: string;
  currentItemHref?: string;
  currentSectionId: string;
  description: string;
  label: string;
  nextHref?: string;
  previousHref?: string;
  title: string;
};

const triggerOptions: {
  label: string;
  linkedLabels: boolean;
}[] = [
  {
    label: "Label opens",
    linkedLabels: false,
  },
  {
    label: "Linked labels",
    linkedLabels: true,
  },
];

const scenarios: BreadcrumbScenario[] = [
  {
    label: "Work root",
    currentSectionId: "work",
    title: "Work",
    contentLabel: "Selected Projects",
    description: "A root-level page where the breadcrumb remains present.",
  },
  {
    label: "Work detail",
    currentSectionId: "work",
    currentItemHref: "/projects/project-name",
    previousHref: "/projects/project-three",
    nextHref: "/projects/project-two",
    title: "Project Name",
    contentLabel: "Project 01",
    description: "A detail page with item-level previous and next controls.",
  },
  {
    label: "Journal root",
    currentSectionId: "journal",
    title: "Journal",
    contentLabel: "Recent Notes",
    description: "A root-level Journal page using temporary sandbox entries.",
  },
  {
    label: "Journal detail",
    currentSectionId: "journal",
    currentItemHref: "/journal/field-notes",
    previousHref: "/journal/navigation-memory",
    nextHref: "/journal/control-surfaces",
    title: "Field Notes",
    contentLabel: "Journal 01",
    description: "A Journal detail page with the same breadcrumb behavior.",
  },
];

export default function BreadcrumbPreviewPage() {
  const [linkedLabels, setLinkedLabels] = useState(false);
  const [scenarioIndex, setScenarioIndex] = useState(1);
  const scenario = scenarios[scenarioIndex];

  return (
    <main className="min-h-screen bg-surface-base px-16 py-12 pb-128 text-on-surface-primary md:px-24 md:py-16 md:pb-128">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-16 focus:top-16 focus:z-50 focus:rounded-sm focus:bg-surface-overlay focus:px-12 focus:py-8 focus:font-mono focus:text-label-medium focus:outline-2 focus:outline-offset-2 focus:outline-[var(--focus-ring-color)]"
        href="#preview-content"
      >
        Skip to content
      </a>

      <header
        className="grid min-w-0 items-center gap-x-16 gap-y-12 text-label-medium md:grid-cols-12 md:gap-x-[32px]"
        style={{ viewTransitionName: "site-header" }}
      >
        <SiteLink
          className="state-layer pressable -mx-4 rounded-sm px-4 py-2 font-mono text-on-surface-primary md:col-[1/span_3]"
          href="/sandbox#breadcrumb-control"
          transitionTypes={["site-page"]}
        >
          /sandbox
        </SiteLink>

        <div className="min-w-0 justify-self-center md:col-span-6 md:col-start-4">
          <BreadcrumbControlV2
            ariaLabel="Breadcrumb preview navigation"
            currentItemHref={scenario.currentItemHref}
            currentSectionId={scenario.currentSectionId}
            linkedLabels={linkedLabels}
            nextHref={scenario.nextHref}
            previousHref={scenario.previousHref}
            sections={sandboxSections}
          />
        </div>

        <nav
          aria-label="Preview primary navigation"
          className="min-w-0 rounded-[6px] bg-surface-raised p-2 font-mono md:col-span-3 md:col-start-10 md:justify-self-end"
        >
          <div className="flex flex-wrap items-center gap-2">
            <NavButton
              active={scenario.currentSectionId === "work"}
              href="/"
              transitionTypes={["site-page"]}
            >
              Work
            </NavButton>
            <NavButton
              active={scenario.currentSectionId === "journal"}
              href="/journal"
              transitionTypes={["site-page"]}
            >
              Journal
            </NavButton>
            <NavButton>Information</NavButton>
          </div>
        </nav>
      </header>

      <section className="fixed inset-x-16 bottom-16 z-30 grid gap-8 rounded-md bg-surface-overlay p-2 shadow-overlay md:left-24 md:right-24 md:grid-cols-[1fr_auto] md:items-center">
        <div
          aria-label="Breadcrumb trigger options"
          className="inline-flex w-fit rounded-[6px] bg-surface-raised p-2 font-mono text-label-medium"
          role="tablist"
        >
          {triggerOptions.map((option) => (
            <button
              aria-selected={linkedLabels === option.linkedLabels}
              className="state-layer pressable inline-flex min-h-28 items-center justify-center rounded-sm px-8 py-4 text-on-surface-primary"
              data-selected={
                linkedLabels === option.linkedLabels ? "true" : undefined
              }
              key={option.label}
              onClick={() => setLinkedLabels(option.linkedLabels)}
              role="tab"
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-4 font-mono text-label-medium md:justify-end">
          {scenarios.map((item, index) => (
            <button
              aria-pressed={scenarioIndex === index}
              className="state-layer pressable min-h-28 rounded-sm px-8 py-4 text-on-surface-primary"
              data-selected={scenarioIndex === index ? "true" : undefined}
              key={item.label}
              onClick={() => setScenarioIndex(index)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section
        className="mx-auto mt-128 grid w-full max-w-[704px] gap-32"
        id="preview-content"
      >
        <div className="grid gap-12">
          <p className="font-mono text-label-small text-on-surface-secondary">
            {scenario.contentLabel}
          </p>
          <h1 className="text-heading-large">{scenario.title}</h1>
          <p className="max-w-[560px] text-body-medium text-on-surface-secondary">
            {scenario.description}
          </p>
        </div>

        <div className="grid gap-16">
          <div className="aspect-[704/449] rounded-md bg-surface-overlay shadow-[inset_0_0_0_1px_oklch(0_0_0_/_0.1)]" />
          <div className="grid gap-8 sm:grid-cols-2">
            <div className="aspect-[1.4] rounded-md bg-[var(--color-blue-4)] shadow-[inset_0_0_0_1px_oklch(0_0_0_/_0.1)]" />
            <div className="aspect-[1.4] rounded-md bg-[var(--color-green-4)] shadow-[inset_0_0_0_1px_oklch(0_0_0_/_0.1)]" />
          </div>
        </div>
      </section>
    </main>
  );
}
