"use client";

import { useEffect, useState } from "react";
import { AboutModal } from "../components/AboutModal";
import {
  BreadcrumbControl,
  FullNav,
  IconButton,
  NavButton,
} from "../components/ComponentPrimitives";
import { FigureCard } from "../components/FigureCard";
import { Footer } from "../components/Footer";
import {
  interactionStates,
  type InteractionState,
} from "../components/interactionState";
import {
  ProjectBlockRenderer,
  ProjectCompareRow,
  ProjectFeatureMedia,
  ProjectMediaFigure,
  ProjectMediaGrid,
  ProjectMediaPair,
  ProjectMosaic,
  ProjectTextBlock,
} from "../components/ProjectArchive";
import type { ProjectBlock, ProjectMedia } from "../data/portfolio";

type SandboxTheme = "light" | "dark";

type SandboxNavItem = {
  href: `#${string}`;
  label: string;
};

type SandboxNavGroup = {
  items: SandboxNavItem[];
  label: string;
};

const navGroups: SandboxNavGroup[] = [
  {
    label: "Foundation",
    items: [
      { href: "#semantic-colors", label: "Semantic colors" },
      { href: "#primitive-colors", label: "Primitive colors" },
      { href: "#typography", label: "Typography" },
      { href: "#spacing", label: "Spacing" },
      { href: "#radius", label: "Radius" },
      { href: "#elevation", label: "Elevation" },
      { href: "#state-layer", label: "Interaction states" },
    ],
  },
  {
    label: "Components",
    items: [
      { href: "#buttons", label: "Buttons" },
      { href: "#portfolio-nav", label: "Portfolio nav" },
      { href: "#nav-buttons", label: "Nav buttons" },
      { href: "#breadcrumb-control", label: "Breadcrumb control" },
      { href: "#icon-buttons", label: "Icon buttons" },
      { href: "#figure-cards", label: "Figure cards" },
      { href: "#project-media", label: "Project media" },
      { href: "#archive-layouts", label: "Archive layouts" },
      { href: "#block-renderer", label: "Block renderer" },
      { href: "#information-modal", label: "Information modal" },
      { href: "#footer", label: "Footer" },
    ],
  },
];

const defaultPageId = navGroups[0].items[0].href.slice(1);
const navItems = navGroups.flatMap((group) =>
  group.items.map((item) => ({
    ...item,
    group: group.label,
    id: item.href.slice(1),
  })),
);

function findSandboxPage(pageId: string) {
  return navItems.find((item) => item.id === pageId) ?? navItems[0];
}

function getPageIdFromHash() {
  if (typeof window === "undefined") {
    return defaultPageId;
  }

  const pageId = window.location.hash.replace("#", "");
  return findSandboxPage(pageId).id;
}

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
  ["neutral-0", "bg-[var(--color-neutral-0)]"],
  ["neutral-0-5", "bg-[var(--color-neutral-0-5)]"],
  ["neutral-1", "bg-[var(--color-neutral-1)]"],
  ["neutral-2", "bg-[var(--color-neutral-2)]"],
  ["neutral-3", "bg-[var(--color-neutral-3)]"],
  ["neutral-4", "bg-[var(--color-neutral-4)]"],
  ["neutral-5", "bg-[var(--color-neutral-5)]"],
  ["neutral-6", "bg-[var(--color-neutral-6)]"],
  ["neutral-7", "bg-[var(--color-neutral-7)]"],
  ["neutral-8", "bg-[var(--color-neutral-8)]"],
  ["neutral-9", "bg-[var(--color-neutral-9)]"],
  ["neutral-10", "bg-[var(--color-neutral-10)]"],
  ["green-0", "bg-[var(--color-green-0)]"],
  ["green-0-5", "bg-[var(--color-green-0-5)]"],
  ["green-1", "bg-[var(--color-green-1)]"],
  ["green-2", "bg-[var(--color-green-2)]"],
  ["green-3", "bg-[var(--color-green-3)]"],
  ["green-4", "bg-[var(--color-green-4)]"],
  ["green-5", "bg-[var(--color-green-5)]"],
  ["green-6", "bg-[var(--color-green-6)]"],
  ["green-7", "bg-[var(--color-green-7)]"],
  ["green-8", "bg-[var(--color-green-8)]"],
  ["green-9", "bg-[var(--color-green-9)]"],
  ["green-10", "bg-[var(--color-green-10)]"],
  ["blue-0", "bg-[var(--color-blue-0)]"],
  ["blue-0-5", "bg-[var(--color-blue-0-5)]"],
  ["blue-1", "bg-[var(--color-blue-1)]"],
  ["blue-2", "bg-[var(--color-blue-2)]"],
  ["blue-3", "bg-[var(--color-blue-3)]"],
  ["blue-4", "bg-[var(--color-blue-4)]"],
  ["blue-5", "bg-[var(--color-blue-5)]"],
  ["blue-6", "bg-[var(--color-blue-6)]"],
  ["blue-7", "bg-[var(--color-blue-7)]"],
  ["blue-8", "bg-[var(--color-blue-8)]"],
  ["blue-9", "bg-[var(--color-blue-9)]"],
  ["blue-10", "bg-[var(--color-blue-10)]"],
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

const archiveMedia: Record<string, ProjectMedia> = {
  neutral: {
    caption: "Neutral placeholder",
    aspect: "16/9",
    tone: "neutral",
  },
  dark: {
    caption: "Dark placeholder",
    aspect: "4/3",
    tone: "dark",
  },
  blue: {
    caption: "Blue placeholder",
    aspect: "1/1",
    tone: "blue",
  },
  green: {
    caption: "Green placeholder",
    aspect: "3/4",
    tone: "green",
  },
};

const archiveBlocks: ProjectBlock[] = [
  {
    type: "feature",
    label: "Archive 01",
    media: archiveMedia.neutral,
  },
  {
    type: "text",
    body: "Short archive text creates a quiet pause between media groups.",
  },
  {
    type: "pair",
    items: [archiveMedia.dark, archiveMedia.blue],
  },
  {
    type: "grid",
    columns: 3,
    items: [archiveMedia.neutral, archiveMedia.green, archiveMedia.dark],
  },
  {
    type: "compare",
    before: archiveMedia.dark,
    after: archiveMedia.green,
  },
  {
    type: "mosaic",
    items: [
      archiveMedia.neutral,
      archiveMedia.blue,
      archiveMedia.green,
      archiveMedia.dark,
    ],
  },
];

const projectPageControl = {
  ariaLabel: "Project navigation",
  levels: [
    {
      href: "/",
      label: "Work",
    },
    {
      href: "/projects/project-name",
      label: "Project Name",
      options: [
        {
          active: true,
          href: "/projects/project-name",
          label: "Project Name",
        },
        {
          href: "/projects/project-two",
          label: "Project Two",
        },
      ],
    },
  ],
  nextHref: "/projects/project-two",
  previousHref: "/projects/project-three",
};

export default function SandboxPage() {
  const [activePage, setActivePage] = useState(defaultPageId);
  const [showModal, setShowModal] = useState(false);
  const [theme, setTheme] = useState<SandboxTheme>("light");
  const nextTheme = theme === "light" ? "dark" : "light";
  const activePageMeta = findSandboxPage(activePage);

  useEffect(() => {
    const syncActivePage = () => setActivePage(getPageIdFromHash());

    syncActivePage();
    window.addEventListener("hashchange", syncActivePage);
    window.addEventListener("popstate", syncActivePage);

    return () => {
      window.removeEventListener("hashchange", syncActivePage);
      window.removeEventListener("popstate", syncActivePage);
    };
  }, []);

  function selectPage(pageId: string) {
    const nextPageId = findSandboxPage(pageId).id;

    setActivePage(nextPageId);

    if (typeof window !== "undefined") {
      const nextHash = `#${nextPageId}`;

      if (window.location.hash !== nextHash) {
        window.history.pushState(null, "", nextHash);
      }

      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }

  return (
    <main
      className="sandbox-theme min-h-screen bg-surface-base text-on-surface-primary"
      data-theme={theme}
    >
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-16 focus:top-16 focus:z-50 focus:rounded-sm focus:bg-surface-overlay focus:px-12 focus:py-8 focus:font-mono focus:text-label-medium focus:outline-2 focus:outline-offset-2 focus:outline-[var(--focus-ring-color)]"
        href="#sandbox-content"
      >
        Skip to content
      </a>

      <SandboxMobileNav
        activePage={activePage}
        navGroups={navGroups}
        nextTheme={nextTheme}
        onToggleTheme={() => setTheme(nextTheme)}
        onSelectPage={selectPage}
        theme={theme}
      />

      <div className="mx-auto grid w-full max-w-[1440px] gap-32 px-16 py-20 lg:grid-cols-[224px_minmax(0,1fr)] lg:gap-48 lg:px-24 lg:py-24">
        <SandboxSidePanel
          activePage={activePage}
          navGroups={navGroups}
          nextTheme={nextTheme}
          onToggleTheme={() => setTheme(nextTheme)}
          onSelectPage={selectPage}
          theme={theme}
        />

        <div className="min-w-0" id="sandbox-content">
          <ActiveSandboxPage
            meta={activePageMeta}
            onOpenModal={() => setShowModal(true)}
          />
        </div>
      </div>

      {showModal ? <AboutModal onClose={() => setShowModal(false)} /> : null}
    </main>
  );
}

function ActiveSandboxPage({
  meta,
  onOpenModal,
}: {
  meta: (typeof navItems)[number];
  onOpenModal: () => void;
}) {
  return (
    <SandboxPageTemplate group={meta.group} id={meta.id} title={meta.label}>
      {renderSandboxPageBody(meta.id, onOpenModal)}
    </SandboxPageTemplate>
  );
}

function renderSandboxPageBody(pageId: string, onOpenModal: () => void) {
  switch (pageId) {
    case "semantic-colors":
      return (
        <SandboxSubsection title="Semantic token swatches">
          <div className="grid gap-12 sm:grid-cols-2 xl:grid-cols-4">
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
        </SandboxSubsection>
      );
    case "primitive-colors":
      return (
        <SandboxSubsection title="Primitive color ramp">
          <div className="grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-4 xl:grid-cols-6">
            {primitiveColors.map(([name, background]) => (
              <div className="grid gap-6" key={name}>
                <div
                  className={`${background} h-48 rounded-sm border border-border-default`}
                />
                <p className="font-mono text-label-small text-on-surface-secondary">
                  {name}
                </p>
              </div>
            ))}
          </div>
        </SandboxSubsection>
      );
    case "typography":
      return (
        <SandboxSubsection title="Type scale">
          <div className="grid gap-8">
            {typeSamples.map(([name, sizeClass, fontClass]) => (
              <div
                className="grid gap-8 border-t border-border-default py-12 md:grid-cols-[160px_1fr]"
                key={name}
              >
                <span className="font-mono text-label-small text-on-surface-secondary">
                  {name}
                </span>
                <span className={`${sizeClass} ${fontClass} min-w-0`}>
                  The quick brown fox
                </span>
              </div>
            ))}
          </div>
        </SandboxSubsection>
      );
    case "spacing":
      return (
        <SandboxSubsection title="Spacing scale">
          <div className="grid gap-10">
            {spacingSamples.map(([label, width]) => (
              <div className="flex items-center gap-12" key={label}>
                <span className="w-48 font-mono text-label-small">{label}</span>
                <div className={`${width} h-12 bg-on-surface-primary`} />
              </div>
            ))}
          </div>
        </SandboxSubsection>
      );
    case "radius":
      return (
        <SandboxSubsection title="Radius scale">
          <div className="grid min-w-[360px] grid-cols-5 gap-12">
            {radiusSamples.map(([label, radius]) => (
              <div className="grid gap-8" key={label}>
                <div className={`${radius} h-64 bg-surface-raised`} />
                <p className="font-mono text-label-small">{label}</p>
              </div>
            ))}
          </div>
        </SandboxSubsection>
      );
    case "elevation":
      return (
        <SandboxSubsection title="Elevation tokens">
          <div className="grid grid-cols-2 gap-16">
            <div
              className="grid h-96 place-items-center rounded-md bg-surface-raised shadow-raised"
              data-testid="elevation-raised"
            >
              <span className="font-mono text-label-small">raised</span>
            </div>
            <div
              className="grid h-96 place-items-center rounded-md bg-surface-overlay shadow-overlay"
              data-testid="elevation-overlay"
            >
              <span className="font-mono text-label-small">overlay</span>
            </div>
          </div>
        </SandboxSubsection>
      );
    case "state-layer":
      return <InteractionStatesPage />;
    case "buttons":
      return <ButtonBenchPage onOpenModal={onOpenModal} />;
    case "portfolio-nav":
      return (
        <SandboxSubsection title="Full nav with project page control">
          <FullNav pageControl={projectPageControl}>
            <NavButton active href="/sandbox" transitionTypes={["site-page"]}>
              Projects
            </NavButton>
            <NavButton href="/sandbox" transitionTypes={["site-page"]}>
              Journal
            </NavButton>
            <NavButton>Information</NavButton>
          </FullNav>
        </SandboxSubsection>
      );
    case "nav-buttons":
      return (
        <SandboxSubsection title="Primary nav segment">
          <nav
            aria-label="Sandbox navigation sample"
            className="inline-flex rounded-[6px] bg-surface-raised p-2 font-mono"
            data-figma-component="Nav"
            data-node-id="33:57"
          >
            <NavButton active href="/sandbox" transitionTypes={["site-page"]}>
              Projects
            </NavButton>
            <NavButton href="/sandbox" transitionTypes={["site-page"]}>
              Journal
            </NavButton>
            <NavButton>Information</NavButton>
          </nav>
        </SandboxSubsection>
      );
    case "breadcrumb-control":
      return (
        <SandboxSubsection title="Project breadcrumb and adjacent controls">
          <BreadcrumbControl
            ariaLabel={projectPageControl.ariaLabel}
            levels={projectPageControl.levels}
            nextHref={projectPageControl.nextHref}
            previousHref={projectPageControl.previousHref}
          />
        </SandboxSubsection>
      );
    case "icon-buttons":
      return (
        <SandboxSubsection title="Previous and next">
          <div className="flex gap-8">
            <IconButton aria-label="Previous" href="/sandbox" icon="←" />
            <IconButton aria-label="Next" href="/sandbox" icon="→" />
          </div>
        </SandboxSubsection>
      );
    case "figure-cards":
      return (
        <>
          <SandboxSubsection title="Project states">
            <div className="grid gap-16 md:grid-cols-[repeat(2,346px)] 2xl:grid-cols-[repeat(5,346px)]">
              {(
                ["rest", "hover", "pressed", "focused", "disabled"] as const
              ).map((state) => (
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
              ))}
            </div>
          </SandboxSubsection>

          <SandboxSubsection title="Journal sizing">
            <div className="grid gap-8 md:w-[346px]">
              <div className="h-[449px]">
                <FigureCard index="002" title="Entry Name" variant="journal" />
              </div>
              <p className="font-mono text-label-small text-on-surface-secondary">
                journal
              </p>
            </div>
          </SandboxSubsection>
        </>
      );
    case "project-media":
      return (
        <SandboxSubsection title="Media figure and feature media">
          <div className="grid max-w-[688px] gap-24">
            <ProjectMediaFigure media={archiveMedia.neutral} />
            <ProjectFeatureMedia
              label="Feature media"
              media={{
                caption: "Feature placeholder with a 16/9 frame",
                aspect: "16/9",
                tone: "dark",
              }}
            />
          </div>
        </SandboxSubsection>
      );
    case "archive-layouts":
      return (
        <SandboxSubsection title="Pair, grid, compare, mosaic, and text">
          <div className="grid max-w-[688px] gap-32">
            <ProjectMediaPair
              items={[
                {
                  caption: "Pair left",
                  aspect: "4/3",
                  tone: "neutral",
                },
                {
                  caption: "Pair right",
                  aspect: "4/3",
                  tone: "blue",
                },
              ]}
            />
            <ProjectMediaGrid
              columns={4}
              items={[
                {
                  caption: "Grid A",
                  aspect: "1/1",
                  tone: "neutral",
                },
                {
                  caption: "Grid B",
                  aspect: "1/1",
                  tone: "dark",
                },
                {
                  caption: "Grid C",
                  aspect: "1/1",
                  tone: "blue",
                },
                {
                  caption: "Grid D",
                  aspect: "1/1",
                  tone: "green",
                },
              ]}
            />
            <ProjectCompareRow
              before={{
                caption: "Before",
                aspect: "16/9",
                tone: "dark",
              }}
              after={{
                caption: "After",
                aspect: "16/9",
                tone: "green",
              }}
            />
            <ProjectMosaic
              items={[
                {
                  caption: "Mosaic A",
                  aspect: "16/9",
                  tone: "blue",
                },
                {
                  caption: "Mosaic B",
                  aspect: "1/1",
                  tone: "neutral",
                },
                {
                  caption: "Mosaic C",
                  aspect: "3/4",
                  tone: "dark",
                },
                {
                  caption: "Mosaic D",
                  aspect: "4/3",
                  tone: "green",
                },
              ]}
            />
            <ProjectTextBlock body="Text interstitials keep short notes aligned with the archive rhythm." />
          </div>
        </SandboxSubsection>
      );
    case "block-renderer":
      return (
        <SandboxSubsection title="Composed archive block sequence">
          <div className="max-w-[688px]">
            <ProjectBlockRenderer blocks={archiveBlocks} />
          </div>
        </SandboxSubsection>
      );
    case "information-modal":
      return (
        <SandboxSubsection title="Modal trigger">
          <button
            className="state-layer pressable rounded-sm bg-surface-raised px-8 py-4 font-mono text-label-medium"
            onClick={onOpenModal}
            type="button"
          >
            Open Information
          </button>
        </SandboxSubsection>
      );
    case "footer":
      return (
        <SandboxSubsection title="Site footer">
          <Footer />
        </SandboxSubsection>
      );
    default:
      return renderSandboxPageBody(defaultPageId, onOpenModal);
  }
}

const interactionTokens = [
  [
    "--interaction-duration",
    "150ms",
    "Every hover, press, selection, and focus change.",
  ],
  [
    "--interaction-easing",
    "cubic-bezier(0.2, 0, 0, 1)",
    "One curve, so nothing in the system eases differently.",
  ],
  ["--state-layer-hover", "8% on-surface", "Transient layer while hovered."],
  [
    "--state-layer-pressed",
    "12% on-surface",
    "Transient layer while the pointer is down. Wins over hover.",
  ],
  [
    "--state-layer-selected",
    "16% on-surface",
    "Resting layer for the selected or current item.",
  ],
  ["--content-disabled", "0.38", "Opacity applied to a disabled control."],
  [
    "--focus-ring-width",
    "0.125rem",
    "Outline width for :focus-visible. 2px at the default root size.",
  ],
  [
    "--focus-ring-offset",
    "0.125rem",
    "Outline offset for :focus-visible. 2px at the default root size.",
  ],
] as const;

const stateNotes: Record<InteractionState, string> = {
  rest: "No layer. The control's own background only.",
  hover: "Hover layer over the resting state.",
  pressed: "Pressed layer plus a 0.96 scale, motion-safe only.",
  focused: "2px outline at 2px offset, keyboard focus only.",
  disabled: "Layers suppressed, 0.38 opacity, no press feedback.",
};

const specimenButtonClassName =
  "state-layer pressable inline-flex min-h-28 items-center justify-center rounded-sm bg-surface-raised px-12 py-8 font-mono text-label-small text-on-surface-primary";

// --- Button hierarchy workbench ---------------------------------------------
// This is a scratch surface, not a shipped component. Edit `buttonVariants`
// below to explore hierarchy; nothing else in the app consumes them yet. Once a
// set feels right, promote it to a real Button primitive.

// One size, matching the NavButton that already ships on every page, so
// promoting this costs no layout change at the most common call site.
const buttonBase =
  "state-layer pressable inline-flex min-h-28 shrink-0 items-center justify-center rounded-sm px-8 py-4 font-mono text-label-medium whitespace-nowrap";

type ButtonVariantKey = "primary" | "secondary" | "text";

const buttonVariants: Record<
  ButtonVariantKey,
  { classes: string; note: string }
> = {
  primary: {
    classes: "accent-surface bg-accent-a-base text-accent-a-on-accent",
    note: "Highest emphasis. One per view, for the single action you want taken.",
  },
  secondary: {
    classes: "bg-surface-raised text-on-surface-primary",
    note: "Default emphasis. What every button in the product uses today.",
  },
  text: {
    classes: "text-on-surface-primary",
    note: "Lowest emphasis. Today's icon buttons, breadcrumbs, and modal close.",
  },
};

const buttonVariantKeys = Object.keys(buttonVariants) as ButtonVariantKey[];

function BenchButton({
  children,
  previewState,
  variant,
}: {
  children: React.ReactNode;
  previewState?: InteractionState;
  variant: ButtonVariantKey;
}) {
  return (
    <button
      className={[buttonBase, buttonVariants[variant].classes].join(" ")}
      data-state={previewState}
      disabled={previewState === "disabled"}
      type="button"
    >
      {children}
    </button>
  );
}

/** All three variants side by side — the view for judging relative emphasis. */
function HierarchyRow() {
  return (
    <div className="flex flex-wrap items-center gap-8">
      {buttonVariantKeys.map((variant) => (
        <BenchButton key={variant} variant={variant}>
          {variant}
        </BenchButton>
      ))}
    </div>
  );
}

function ButtonBenchPage({ onOpenModal }: { onOpenModal: () => void }) {
  return (
    <>
      <SandboxSubsection title="Hierarchy at a glance">
        <div className="grid gap-12">
          <HierarchyRow />
          <p className="max-w-[560px] text-body-small text-on-surface-secondary">
            Squint at this row. Emphasis should fall off cleanly from left to
            right; if two variants read as equal weight, they are not separate
            tiers.
          </p>
        </div>
      </SandboxSubsection>

      <SandboxSubsection title="Variant × state">
        <div className="grid min-w-[720px] gap-2">
          <div className="grid grid-cols-[112px_repeat(5,minmax(0,1fr))] gap-8 pb-6">
            <span />
            {interactionStates.map((state) => (
              <span
                className="font-mono text-label-small text-on-surface-secondary"
                key={state}
              >
                {state}
              </span>
            ))}
          </div>
          {buttonVariantKeys.map((variant) => (
            <div
              className="grid grid-cols-[112px_repeat(5,minmax(0,1fr))] items-center justify-items-start gap-8 border-t border-border-default py-10"
              key={variant}
            >
              <span className="font-mono text-label-small text-on-surface-secondary">
                {variant}
              </span>
              {interactionStates.map((state) => (
                <BenchButton key={state} previewState={state} variant={variant}>
                  Label
                </BenchButton>
              ))}
            </div>
          ))}
        </div>
      </SandboxSubsection>

      <SandboxSubsection title="Both themes">
        <div className="grid gap-16 sm:grid-cols-2">
          {(["light", "dark"] as const).map((specimenTheme) => (
            <div
              className="sandbox-theme grid gap-12 rounded-md border border-border-default bg-surface-base p-16"
              data-testid={`button-bench-${specimenTheme}`}
              data-theme={specimenTheme}
              key={specimenTheme}
            >
              <p className="font-mono text-label-small text-on-surface-secondary">
                {specimenTheme}
              </p>
              <HierarchyRow />
            </div>
          ))}
        </div>
      </SandboxSubsection>

      <SandboxSubsection title="What each tier is for">
        <div className="grid gap-2">
          {buttonVariantKeys.map((variant) => (
            <div
              className="grid items-center gap-8 border-t border-border-default py-10 md:grid-cols-[140px_1fr]"
              key={variant}
            >
              <BenchButton variant={variant}>{variant}</BenchButton>
              <p className="text-body-small text-on-surface-secondary">
                {buttonVariants[variant].note}
              </p>
            </div>
          ))}
        </div>
      </SandboxSubsection>

      <SandboxSubsection title="Shipped today — every button currently in the product">
        <div className="grid gap-2">
          <ShippedButtonRow
            note="ComponentPrimitives · bg-surface-raised, label-medium, min-h-28"
            name="NavButton"
          >
            <NavButton active>Projects</NavButton>
            <NavButton>Journal</NavButton>
          </ShippedButtonRow>

          <ShippedButtonRow
            note="ComponentPrimitives · no fill, 28×28, breadcrumb prev/next"
            name="IconButton"
          >
            <IconButton aria-label="Previous item" href="/sandbox" icon="←" />
            <IconButton aria-label="Next item" href="/sandbox" icon="→" />
          </ShippedButtonRow>

          <ShippedButtonRow
            note="BreadcrumbLevelItem · no fill, 28×28, aria-expanded drives the selected layer"
            name="Disclosure trigger"
          >
            <button
              aria-expanded="false"
              aria-label="Show options"
              className="state-layer pressable flex h-28 w-28 shrink-0 items-center justify-center rounded-sm text-on-surface-primary"
              type="button"
            >
              <svg
                aria-hidden="true"
                className="h-16 w-16"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                viewBox="0 0 16 16"
              >
                <path d="m4 6 4 4 4-4" />
              </svg>
            </button>
          </ShippedButtonRow>

          <ShippedButtonRow
            note="Sandbox · bg-surface-raised, label-small, min-h-32 — taller than NavButton"
            name="Theme toggle"
          >
            <button
              aria-pressed="false"
              className="state-layer pressable inline-flex min-h-32 items-center justify-center rounded-sm bg-surface-raised px-10 py-6 font-mono text-label-small text-on-surface-primary"
              type="button"
            >
              light theme
            </button>
          </ShippedButtonRow>

          <ShippedButtonRow
            note="AboutModal · no fill on a fixed dark shell, label-small"
            name="Modal close"
          >
            <div className="modal-surface inline-flex rounded-sm bg-[#232e39] p-8">
              <button
                className="state-layer pressable rounded-sm px-8 py-4 font-mono text-label-small text-[#f9fcff]"
                type="button"
              >
                Close
              </button>
            </div>
          </ShippedButtonRow>

          <ShippedButtonRow
            note="Sandbox · bg-surface-raised, label-medium — opens the live modal"
            name="Modal trigger"
          >
            <button
              className="state-layer pressable rounded-sm bg-surface-raised px-8 py-4 font-mono text-label-medium"
              onClick={onOpenModal}
              type="button"
            >
              Open Information
            </button>
          </ShippedButtonRow>
        </div>
      </SandboxSubsection>
    </>
  );
}

function ShippedButtonRow({
  children,
  name,
  note,
}: {
  children: React.ReactNode;
  name: string;
  note: string;
}) {
  return (
    <div className="grid gap-8 border-t border-border-default py-12 md:grid-cols-[160px_200px_1fr] md:items-center">
      <span className="font-mono text-label-small text-on-surface-primary">
        {name}
      </span>
      <div className="flex flex-wrap items-center gap-8">{children}</div>
      <p className="text-body-small text-on-surface-secondary">{note}</p>
    </div>
  );
}

function InteractionStatesPage() {
  return (
    <>
      <SandboxSubsection title="Live controls — hover, press, and tab through these">
        <div className="flex flex-wrap items-center gap-12">
          <button className={specimenButtonClassName} type="button">
            Rest
          </button>
          <button
            aria-current="page"
            className={specimenButtonClassName}
            type="button"
          >
            Current
          </button>
          <button
            className={specimenButtonClassName}
            data-selected="true"
            type="button"
          >
            Selected
          </button>
          <button className={specimenButtonClassName} disabled type="button">
            Disabled
          </button>
        </div>
        <p className="mt-12 max-w-[560px] text-body-small text-on-surface-secondary">
          Hovering or pressing a selected control still reads as a change: the
          selected layer sits on <code className="font-mono">::before</code> and
          the transient layer on <code className="font-mono">::after</code>, so
          the two composite instead of replacing each other.
        </p>
      </SandboxSubsection>

      <SandboxSubsection title="Static states — the same rules, driven by data-state">
        <div className="grid gap-16">
          {interactionStates.map((state) => (
            <div
              className="grid items-center gap-12 border-t border-border-default py-12 md:grid-cols-[112px_repeat(3,minmax(0,auto))_1fr]"
              key={state}
            >
              <p className="font-mono text-label-small text-on-surface-secondary">
                {state}
              </p>
              <button
                className={specimenButtonClassName}
                data-state={state}
                disabled={state === "disabled"}
                type="button"
              >
                Label
              </button>
              <NavButton previewState={state}>Projects</NavButton>
              <IconButton
                aria-label={`Previous item, ${state} state`}
                href="/sandbox"
                icon="←"
                previewState={state}
              />
              <p className="text-body-small text-on-surface-secondary">
                {stateNotes[state]}
              </p>
            </div>
          ))}
        </div>
      </SandboxSubsection>

      <SandboxSubsection title="Selected and current, across both themes">
        <div className="grid gap-16 sm:grid-cols-2">
          {(["light", "dark"] as const).map((specimenTheme) => (
            <div
              className="sandbox-theme grid gap-12 rounded-md border border-border-default bg-surface-base p-16"
              data-testid={`theme-specimen-${specimenTheme}`}
              data-theme={specimenTheme}
              key={specimenTheme}
            >
              <p className="font-mono text-label-small text-on-surface-secondary">
                {specimenTheme}
              </p>
              <div className="flex flex-wrap items-center gap-8">
                <button className={specimenButtonClassName} type="button">
                  Rest
                </button>
                <button
                  className={specimenButtonClassName}
                  data-state="hover"
                  type="button"
                >
                  Hover
                </button>
                <button
                  className={specimenButtonClassName}
                  data-state="pressed"
                  type="button"
                >
                  Pressed
                </button>
                <button
                  aria-current="page"
                  className={specimenButtonClassName}
                  type="button"
                >
                  Current
                </button>
                <button
                  className={specimenButtonClassName}
                  data-state="focused"
                  type="button"
                >
                  Focused
                </button>
                <button
                  className={specimenButtonClassName}
                  disabled
                  type="button"
                >
                  Disabled
                </button>
              </div>
            </div>
          ))}
        </div>
      </SandboxSubsection>

      <SandboxSubsection title="Figure card states">
        <div className="grid gap-16 [grid-template-columns:repeat(auto-fill,minmax(180px,1fr))]">
          {interactionStates.map((state) => (
            <div className="grid gap-8" key={state}>
              <div className="h-[260px]">
                <FigureCard index="002" state={state} title="Project Name" />
              </div>
              <p className="font-mono text-label-small text-on-surface-secondary">
                {state}
              </p>
            </div>
          ))}
        </div>
      </SandboxSubsection>

      <SandboxSubsection title="Reduced motion">
        <ReducedMotionNotice />
      </SandboxSubsection>

      <SandboxSubsection title="Tokens">
        <div className="grid gap-2">
          {interactionTokens.map(([name, value, note]) => (
            <div
              className="grid gap-4 border-t border-border-default py-10 md:grid-cols-[240px_200px_1fr] md:gap-16"
              key={name}
            >
              <code className="font-mono text-label-small text-on-surface-primary">
                {name}
              </code>
              <code className="font-mono text-label-small text-on-surface-secondary">
                {value}
              </code>
              <p className="text-body-small text-on-surface-secondary">{note}</p>
            </div>
          ))}
        </div>
      </SandboxSubsection>
    </>
  );
}

function ReducedMotionNotice() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<
    boolean | null
  >(null);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPrefersReducedMotion(query.matches);

    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return (
    <div className="grid max-w-[560px] gap-12">
      <p className="font-mono text-label-small text-on-surface-secondary">
        prefers-reduced-motion:{" "}
        {prefersReducedMotion === null
          ? "reading…"
          : prefersReducedMotion
            ? "reduce"
            : "no-preference"}
      </p>
      <ul className="grid list-disc gap-8 pl-16 text-body-small text-on-surface-secondary">
        <li>Press feedback drops the 0.96 scale and becomes colour only.</li>
        <li>Route and modal transitions collapse to a single frame.</li>
        <li>
          Hover, pressed, selected, and focus colours all still apply, because
          they are what makes a control legible as interactive.
        </li>
      </ul>
      <div className="flex flex-wrap items-center gap-12">
        <button className={specimenButtonClassName} type="button">
          Press me
        </button>
        <p className="text-body-small text-on-surface-secondary">
          Scales under no-preference, holds still under reduce.
        </p>
      </div>
    </div>
  );
}

function SandboxSidePanel({
  activePage,
  navGroups,
  nextTheme,
  onToggleTheme,
  onSelectPage,
  theme,
}: {
  activePage: string;
  navGroups: SandboxNavGroup[];
  nextTheme: SandboxTheme;
  onToggleTheme: () => void;
  onSelectPage: (pageId: string) => void;
  theme: SandboxTheme;
}) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 grid max-h-[calc(100vh-48px)] gap-24 overflow-y-auto border-r border-border-default pr-24">
        <div className="grid gap-8">
          <p className="font-mono text-label-medium text-on-surface-secondary">
            /sandbox
          </p>
          <ThemeToggle
            nextTheme={nextTheme}
            onToggleTheme={onToggleTheme}
            theme={theme}
          />
        </div>
        <SandboxNav
          activePage={activePage}
          navGroups={navGroups}
          onSelectPage={onSelectPage}
          orientation="vertical"
        />
      </div>
    </aside>
  );
}

function SandboxMobileNav({
  activePage,
  navGroups,
  nextTheme,
  onToggleTheme,
  onSelectPage,
  theme,
}: {
  activePage: string;
  navGroups: SandboxNavGroup[];
  nextTheme: SandboxTheme;
  onToggleTheme: () => void;
  onSelectPage: (pageId: string) => void;
  theme: SandboxTheme;
}) {
  return (
    <div className="sticky top-0 z-30 border-b border-border-default bg-surface-base/95 px-16 py-12 backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-[1440px] gap-12">
        <div className="flex items-center justify-between gap-16">
          <p className="shrink-0 font-mono text-label-medium text-on-surface-secondary">
            /sandbox
          </p>
          <ThemeToggle
            nextTheme={nextTheme}
            onToggleTheme={onToggleTheme}
            theme={theme}
          />
        </div>
        <SandboxNav
          activePage={activePage}
          navGroups={navGroups}
          onSelectPage={onSelectPage}
          orientation="horizontal"
        />
      </div>
    </div>
  );
}

function ThemeToggle({
  nextTheme,
  onToggleTheme,
  theme,
}: {
  nextTheme: SandboxTheme;
  onToggleTheme: () => void;
  theme: SandboxTheme;
}) {
  return (
    <button
      aria-label={`Switch sandbox to ${nextTheme} theme`}
      aria-pressed={theme === "dark"}
      className="state-layer pressable inline-flex min-h-32 items-center justify-center rounded-sm bg-surface-raised px-10 py-6 font-mono text-label-small text-on-surface-primary"
      onClick={onToggleTheme}
      type="button"
    >
      {theme} theme
    </button>
  );
}

function SandboxNav({
  activePage,
  navGroups,
  onSelectPage,
  orientation,
}: {
  activePage: string;
  navGroups: SandboxNavGroup[];
  onSelectPage: (pageId: string) => void;
  orientation: "horizontal" | "vertical";
}) {
  const isHorizontal = orientation === "horizontal";

  return (
    <nav
      aria-label="Sandbox sections"
      className={
        isHorizontal
          ? "-mx-16 flex gap-24 overflow-x-auto px-16 pb-2"
          : "grid gap-24"
      }
    >
      {navGroups.map((group) => (
        <div
          className={isHorizontal ? "grid min-w-max gap-8" : "grid gap-8"}
          key={group.label}
        >
          <p className="font-mono text-label-small text-on-surface-secondary">
            {group.label}
          </p>
          <div className={isHorizontal ? "flex gap-6" : "grid gap-2"}>
            {group.items.map((item) => (
              <a
                aria-current={
                  activePage === item.href.slice(1) ? "page" : undefined
                }
                className="state-layer pressable rounded-sm px-8 py-6 font-mono text-label-small text-on-surface-primary"
                data-selected={
                  activePage === item.href.slice(1) ? "true" : undefined
                }
                href={item.href}
                key={item.href}
                onClick={(event) => {
                  event.preventDefault();
                  onSelectPage(item.href.slice(1));
                }}
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SandboxPageTemplate({
  children,
  group,
  id,
  title,
}: {
  children: React.ReactNode;
  group: string;
  id: string;
  title: string;
}) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="grid scroll-mt-96 gap-48 lg:scroll-mt-24"
      id={id}
    >
      <header className="grid min-h-[88px] content-start gap-8 pb-24">
        <p className="font-mono text-label-medium text-on-surface-secondary">
          /sandbox / {group}
        </p>
        <h1 className="max-w-[680px] text-heading-large" id={`${id}-title`}>
          {title}
        </h1>
      </header>
      <div className="grid gap-24">{children}</div>
    </section>
  );
}

function SandboxSubsection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="grid gap-12">
      <h2 className="font-mono text-label-small text-on-surface-secondary">
        {title}
      </h2>
      <div className="min-w-0 overflow-x-auto pb-2">{children}</div>
    </section>
  );
}
