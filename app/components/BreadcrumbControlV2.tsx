"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { Media } from "../data/detailContent";
import { isUnoptimizedImage, mediaToneColor } from "./media";
import { SiteLink } from "./SiteLink";
import { useDismissable } from "./useDismissable";

export type BreadcrumbV2Item = {
  description?: string;
  href: string;
  index?: string;
  media?: Media;
  title: string;
};

export type BreadcrumbV2Section = {
  description?: string;
  href: string;
  id: string;
  items: BreadcrumbV2Item[];
  label: string;
};

export type BreadcrumbControlV2Props = {
  ariaLabel: string;
  className?: string;
  currentItemHref?: string;
  currentSectionId: string;
  linkedLabels?: boolean;
  nextHref?: string;
  previousHref?: string;
  sections: BreadcrumbV2Section[];
};

const popoverBaseClassName = [
  "breadcrumb-panel absolute left-1/2 top-[calc(100%+6px)] z-40 w-[min(calc(100vw-32px),244px)] -translate-x-1/2 rounded-md bg-surface-overlay p-2 font-mono text-label-medium shadow-overlay",
  "max-sm:fixed max-sm:left-16 max-sm:right-16 max-sm:top-96 max-sm:mt-0 max-sm:w-auto max-sm:translate-x-0",
  "motion-safe:transition-[opacity,translate,filter,visibility] motion-safe:duration-150 motion-safe:ease-out",
].join(" ");

const flyoutClassName = [
  "breadcrumb-flyout absolute left-[calc(100%+6px)] top-0 z-50 w-244 rounded-md bg-surface-overlay p-2 shadow-overlay",
  "max-sm:static max-sm:mt-4 max-sm:w-full",
].join(" ");

// `invisible` is what keeps the closed panel out of the tab order and the
// accessibility tree — dimming it with opacity alone leaves every link inside
// focusable and duplicated in the a11y tree. `visibility` is in the transition
// list above so the panel stays visible for the length of the closing fade.
const hiddenPopoverClassName =
  "invisible pointer-events-none opacity-0 translate-y-[-8px] blur-[3px]";

const visiblePopoverClassName =
  "visible pointer-events-auto opacity-100 translate-y-0 blur-[0px]";

export function BreadcrumbControlV2({
  ariaLabel,
  className,
  currentItemHref,
  currentSectionId,
  linkedLabels = false,
  nextHref,
  previousHref,
  sections,
}: BreadcrumbControlV2Props) {
  const currentSection =
    sections.find((section) => section.id === currentSectionId) ?? sections[0];
  const currentItem = currentSection?.items.find(
    (item) => item.href === currentItemHref,
  );
  const pageLinks =
    previousHref && nextHref
      ? {
          nextHref,
          previousHref,
        }
      : null;

  return (
    <nav
      aria-label={ariaLabel}
      className={[
        "flex min-w-0 max-w-full items-center justify-center gap-8 font-mono text-label-medium",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-figma-component="Breadcrumb control"
      data-node-id="2137:48730"
    >
      {pageLinks ? (
        <BreadcrumbArrow
          ariaLabel="Previous item"
          href={pageLinks.previousHref}
          icon="←"
        />
      ) : null}

      <div className="flex min-w-0 items-center justify-center gap-2">
        {currentSection ? (
          <BreadcrumbLevelShell
            current
            href={currentSection.href}
            label={currentSection.label}
            linkedLabel={linkedLabels}
            panelLabel={`${currentSection.label} navigation`}
          >
            {({ directHoverKey }) => (
              <SectionPopover
                currentItemHref={currentItemHref}
                currentSectionId={currentSection.id}
                directHoverKey={directHoverKey}
                sections={sections}
              />
            )}
          </BreadcrumbLevelShell>
        ) : null}

        {currentItem ? (
          <>
            <span aria-hidden="true" className="shrink-0 px-2 py-2">
              /
            </span>
            <BreadcrumbLevelShell
              current
              href={currentItem.href}
              label={currentItem.title}
              linkedLabel={linkedLabels}
              panelLabel={`${currentItem.title} navigation`}
            >
              {({ directHoverKey }) => (
                <ItemsPopover
                  currentItemHref={currentItem.href}
                  directHoverKey={directHoverKey}
                  section={currentSection}
                />
              )}
            </BreadcrumbLevelShell>
          </>
        ) : null}
      </div>

      {pageLinks ? (
        <BreadcrumbArrow
          ariaLabel="Next item"
          href={pageLinks.nextHref}
          icon="→"
        />
      ) : null}
    </nav>
  );
}

function BreadcrumbLevelShell({
  children,
  current,
  href,
  label,
  linkedLabel,
  panelLabel,
}: {
  children:
    | React.ReactNode
    | ((state: { directHoverKey: number }) => React.ReactNode);
  current: boolean;
  href: string;
  label: string;
  linkedLabel: boolean;
  panelLabel: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const [directHoverKey, setDirectHoverKey] = useState(0);
  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const isOpen = isPinned || isHovered;

  const closePanel = useCallback(() => {
    setIsPinned(false);
    setIsHovered(false);
  }, []);

  useDismissable({ containerRef, isOpen, onDismiss: closePanel, triggerRef });

  function resetToDirectLevel() {
    setDirectHoverKey((key) => key + 1);
  }

  const panelContent =
    typeof children === "function" ? children({ directHoverKey }) : children;

  return (
    <div
      // A flex container, so the trigger below is blockified into a flex item
      // and its `min-w-0 truncate` can actually shrink it. Left as a block, the
      // inline-block button keeps its content width and overflows the header at
      // narrow widths or large text sizes.
      className="relative flex min-w-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          closePanel();
        }
      }}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") {
          setIsHovered(true);
        }
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") {
          setIsHovered(false);
        }
      }}
      ref={containerRef}
    >
      {linkedLabel ? (
        <div
          className="flex min-w-0 items-center justify-center gap-2"
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse") {
              resetToDirectLevel();
            }
          }}
        >
          <SiteLink
            aria-current={current ? "page" : undefined}
            className="state-layer pressable min-h-28 min-w-0 truncate whitespace-nowrap rounded-sm px-4 py-2 text-on-surface-primary before:!bg-transparent"
            href={href}
            onClick={closePanel}
            transitionTypes={["site-page"]}
          >
            {label}
          </SiteLink>
          <button
            aria-controls={panelId}
            aria-expanded={isOpen}
            aria-label={panelLabel}
            className="state-layer pressable flex h-28 w-28 shrink-0 items-center justify-center rounded-sm text-on-surface-primary"
            onClick={() => setIsPinned((pinned) => !pinned)}
            ref={triggerRef}
            type="button"
          >
            <ChevronIcon isOpen={isOpen} />
          </button>
        </div>
      ) : (
        <button
          aria-controls={panelId}
          aria-expanded={isOpen}
          aria-label={panelLabel}
          className="state-layer pressable min-h-28 min-w-0 truncate whitespace-nowrap rounded-sm px-4 py-2 text-on-surface-primary"
          onClick={() => setIsPinned((pinned) => !pinned)}
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse") {
              resetToDirectLevel();
            }
          }}
          ref={triggerRef}
          type="button"
        >
          {label}
        </button>
      )}

      <div
        className={[
          popoverBaseClassName,
          isOpen ? visiblePopoverClassName : hiddenPopoverClassName,
        ].join(" ")}
        id={panelId}
      >
        {isOpen ? (
          <span
            aria-hidden="true"
            className="absolute bottom-full left-1/2 h-6 w-[min(calc(100vw-32px),244px)] -translate-x-1/2 max-sm:hidden"
          />
        ) : null}
        {panelContent}
      </div>
    </div>
  );
}

function SectionPopover({
  currentItemHref,
  currentSectionId,
  directHoverKey,
  sections,
}: {
  currentItemHref: string | undefined;
  currentSectionId: string;
  directHoverKey: number;
  sections: BreadcrumbV2Section[];
}) {
  const [drillState, setDrillState] = useState<{
    directHoverKey: number;
    sectionId: string | null;
  }>({
    directHoverKey,
    sectionId: null,
  });
  const drillSectionId =
    drillState.directHoverKey === directHoverKey ? drillState.sectionId : null;
  const drillSection = sections.find((section) => section.id === drillSectionId);

  return (
    <div className="relative grid gap-4">
      {sections.map((section) => (
        <div
          className="relative"
          key={section.id}
          onFocus={() =>
            setDrillState({
              directHoverKey,
              sectionId: section.id,
            })
          }
          onPointerMove={() =>
            setDrillState({
              directHoverKey,
              sectionId: section.id,
            })
          }
        >
          <SiteLink
            aria-current={
              section.id === currentSectionId && !currentItemHref
                ? "page"
                : undefined
            }
            className="state-layer pressable grid min-h-36 min-w-0 grid-cols-[1fr_auto] items-center gap-16 rounded-sm px-12 py-8 text-on-surface-primary"
            data-selected={section.id === drillSectionId ? "true" : undefined}
            href={section.href}
            transitionTypes={["site-page"]}
          >
            <span className="truncate">{section.label}</span>
            <ForwardIcon />
          </SiteLink>
        </div>
      ))}

      {drillSection ? (
        <>
          <span
            aria-hidden="true"
            className="absolute left-full top-0 z-40 h-full w-12 max-sm:hidden"
          />
          <div className={flyoutClassName}>
            <ItemList
              currentItemHref={currentItemHref}
              items={drillSection.items}
              sectionId={drillSection.id}
              sectionLabel={drillSection.label}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

function ItemsPopover({
  currentItemHref,
  directHoverKey,
  section,
}: {
  currentItemHref: string;
  directHoverKey: number;
  section: BreadcrumbV2Section;
}) {
  return (
    <div className="relative">
      <ItemList
        currentItemHref={currentItemHref}
        directHoverKey={directHoverKey}
        items={section.items}
        sectionId={section.id}
        sectionLabel={section.label}
        showPreview
      />
    </div>
  );
}

function ItemList({
  currentItemHref,
  directHoverKey,
  items,
  sectionId,
  sectionLabel,
  showPreview = false,
}: {
  currentItemHref: string | undefined;
  directHoverKey?: number;
  items: BreadcrumbV2Item[];
  sectionId: string;
  sectionLabel: string;
  showPreview?: boolean;
}) {
  const previewDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPreviewRef = useRef<{
    directHoverKey?: number;
    href?: string;
  }>({});
  const previewMode = sectionId === "journal" ? "long-hover" : "immediate";
  const [previewState, setPreviewState] = useState<{
    directHoverKey?: number;
    href?: string;
  }>({
    directHoverKey,
  });
  const previewHref =
    previewState.directHoverKey === directHoverKey
      ? previewState.href
      : undefined;
  const previewItem = items.find((item) => item.href === previewHref);

  useEffect(() => {
    return () => {
      if (previewDelayRef.current) {
        clearTimeout(previewDelayRef.current);
      }
    };
  }, []);

  function previewImmediately(item: BreadcrumbV2Item) {
    if (previewDelayRef.current) {
      clearTimeout(previewDelayRef.current);
    }

    pendingPreviewRef.current = {
      directHoverKey,
      href: item.href,
    };
    setPreviewState({
      directHoverKey,
      href: item.href,
    });
  }

  function previewAfterDwell(item: BreadcrumbV2Item) {
    if (
      pendingPreviewRef.current.directHoverKey === directHoverKey &&
      pendingPreviewRef.current.href === item.href
    ) {
      return;
    }

    if (previewDelayRef.current) {
      clearTimeout(previewDelayRef.current);
    }

    pendingPreviewRef.current = {
      directHoverKey,
      href: item.href,
    };
    setPreviewState({
      directHoverKey,
    });
    previewDelayRef.current = setTimeout(() => {
      setPreviewState({
        directHoverKey,
        href: item.href,
      });
    }, 650);
  }

  if (items.length === 0) {
    return (
      <p className="px-12 py-8 text-on-surface-secondary">
        {sectionLabel} is coming soon.
      </p>
    );
  }

  return (
    <div className="relative grid gap-4">
      {items.map((item) => (
        <SiteLink
          aria-current={item.href === currentItemHref ? "page" : undefined}
          className="state-layer pressable grid min-h-36 min-w-0 grid-cols-[1fr_auto] items-center gap-16 rounded-sm px-12 py-8 text-on-surface-primary"
          href={item.href}
          key={item.href}
          onFocus={() => previewImmediately(item)}
          onPointerMove={() => {
            if (!showPreview) {
              return;
            }

            if (previewMode === "long-hover") {
              previewAfterDwell(item);
              return;
            }

            previewImmediately(item);
          }}
          onPointerLeave={() => {
            if (previewDelayRef.current) {
              clearTimeout(previewDelayRef.current);
            }

            pendingPreviewRef.current = {};
          }}
          transitionTypes={["site-page"]}
        >
          <span className="truncate">{item.title}</span>
          {item.index ? (
            <span className="text-on-surface-secondary">{item.index}</span>
          ) : null}
        </SiteLink>
      ))}

      {showPreview && previewItem ? (
        <>
          <span
            aria-hidden="true"
            className="absolute left-full top-0 z-40 h-full w-12 max-sm:hidden"
          />
          <div className={flyoutClassName}>
            <PreviewCard item={previewItem} />
          </div>
        </>
      ) : null}
    </div>
  );
}

function PreviewCard({ item }: { item: BreadcrumbV2Item }) {
  return (
    <div className="grid gap-8">
      <div
        aria-hidden="true"
        className="relative h-100 overflow-hidden rounded-sm shadow-[inset_0_0_0_1px_oklch(0_0_0_/_0.1)]"
        style={{ backgroundColor: mediaToneColor(item.media?.tone) }}
      >
        {item.media?.src ? (
          <Image
            alt=""
            className="object-cover"
            fill
            sizes="244px"
            src={item.media.src}
            unoptimized={isUnoptimizedImage(item.media.src)}
          />
        ) : null}
      </div>
      <div className="grid gap-2 px-12 pb-8">
        <p className="truncate text-on-surface-primary">{item.title}</p>
        <p className="line-clamp-2 text-on-surface-secondary">
          {item.description ?? "Browse this item."}
        </p>
      </div>
    </div>
  );
}

function BreadcrumbArrow({
  ariaLabel,
  href,
  icon,
}: {
  ariaLabel: string;
  href: string;
  icon: "←" | "→";
}) {
  return (
    <SiteLink
      aria-label={ariaLabel}
      className="state-layer pressable flex h-28 min-w-28 shrink-0 items-center justify-center rounded-sm px-5 text-body-medium text-on-surface-primary"
      href={href}
      transitionTypes={["site-page"]}
    >
      {icon}
    </SiteLink>
  );
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={[
        "h-16 w-16 motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out",
        isOpen ? "rotate-180" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 16 16"
    >
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

function ForwardIcon() {
  return (
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
      <path d="m6 4 4 4-4 4" />
    </svg>
  );
}
