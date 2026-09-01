import type { ReactNode } from "react";
import type { PageControlConfig } from "../data/pageControl";
import { BreadcrumbLevelItem } from "./BreadcrumbLevelItem";
import type { InteractionState } from "./interactionState";
import { SiteLink } from "./SiteLink";

type NavButtonProps = {
  active?: boolean;
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  /** Forces a static state for design-system previews. Live controls omit it. */
  previewState?: InteractionState;
  transitionTypes?: string[];
};

export function NavButton({
  active = false,
  children,
  href,
  onClick,
  previewState,
  transitionTypes,
}: NavButtonProps) {
  const className =
    "state-layer pressable inline-flex min-h-28 shrink-0 items-center justify-center rounded-sm bg-surface-raised px-8 py-4 font-mono text-label-medium text-on-surface-primary whitespace-nowrap";
  const commonProps = {
    "data-figma-component": "Nav Button",
    "data-node-id": active ? "33:58" : "32:761",
    "data-selected": active ? "true" : undefined,
    "data-state": previewState ?? (active ? "selected" : "rest"),
  };

  // Same reason as IconButton: a disabled preview falls back to a real button,
  // because an anchor cannot be disabled.
  if (href && previewState !== "disabled") {
    return (
      <SiteLink
        aria-current={active ? "page" : undefined}
        className={className}
        href={href}
        transitionTypes={transitionTypes}
        {...commonProps}
      >
        {children}
      </SiteLink>
    );
  }

  return (
    <button
      className={className}
      disabled={previewState === "disabled"}
      onClick={onClick}
      type="button"
      {...commonProps}
    >
      {children}
    </button>
  );
}

type IconButtonProps = {
  "aria-label": string;
  href: string;
  icon: "←" | "→";
  /** Forces a static state for design-system previews. Live controls omit it. */
  previewState?: InteractionState;
  transitionTypes?: string[];
};

export function IconButton({
  "aria-label": ariaLabel,
  href,
  icon,
  previewState,
  transitionTypes,
}: IconButtonProps) {
  const className =
    "state-layer pressable flex h-28 min-w-28 shrink-0 items-center justify-center rounded-sm px-5 text-body-medium text-on-surface-primary";
  const commonProps = {
    "aria-label": ariaLabel,
    "data-figma-component": "Icon Button",
    "data-node-id": "35:135",
    "data-state": previewState ?? "rest",
  };

  // A link cannot be disabled, so the preview renders a real disabled control
  // rather than an anchor that merely looks inert but still navigates.
  if (previewState === "disabled") {
    return (
      <button className={className} disabled type="button" {...commonProps}>
        {icon}
      </button>
    );
  }

  return (
    <SiteLink
      className={className}
      href={href}
      transitionTypes={transitionTypes}
      {...commonProps}
    >
      {icon}
    </SiteLink>
  );
}

export type {
  BreadcrumbLevel,
  BreadcrumbOption,
  PageControlConfig,
} from "../data/pageControl";

type FullNavProps = {
  brandHref?: string;
  brandLabel?: string;
  children: ReactNode;
  pageControl?: PageControlConfig | null;
  primaryNavAriaLabel?: string;
};

export function FullNav({
  brandHref = "/",
  brandLabel = "M.D.",
  children,
  pageControl,
  primaryNavAriaLabel = "Primary navigation",
}: FullNavProps) {
  return (
    <header
      className="flex min-w-0 flex-wrap items-center justify-between gap-x-16 gap-y-8 text-label-medium md:grid md:grid-cols-12 md:gap-x-[32px]"
      data-figma-component="Full Nav"
      data-node-id="80:379"
      style={{ viewTransitionName: "site-header" }}
    >
      <SiteLink
        className="state-layer pressable -mx-4 self-center rounded-sm px-4 py-2 whitespace-nowrap font-mono text-on-surface-primary md:col-[1/span_3] md:row-start-1"
        href={brandHref}
        transitionTypes={["site-page"]}
      >
        {brandLabel}
      </SiteLink>

      {pageControl ? (
        <BreadcrumbControl
          ariaLabel={pageControl.ariaLabel}
          levels={pageControl.levels}
          nextHref={pageControl.nextHref}
          previousHref={pageControl.previousHref}
        />
      ) : (
        <div className="hidden xl:col-span-4 xl:col-start-5 xl:row-start-1 xl:block" />
      )}

      <nav
        aria-label={primaryNavAriaLabel}
        className="min-w-0 max-w-full rounded-[6px] bg-surface-raised p-1 font-mono md:col-span-9 md:col-start-4 md:row-start-1 md:justify-self-end md:p-2 xl:col-span-3 xl:col-start-10"
        data-figma-component="Nav"
        data-node-id="33:57"
      >
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      </nav>
    </header>
  );
}

export function BreadcrumbControl({
  ariaLabel,
  levels,
  nextHref,
  previousHref,
}: PageControlConfig) {
  return (
    <nav
      aria-label={ariaLabel}
      className="hidden w-full max-w-[448px] min-w-0 items-center justify-center gap-12 justify-self-center font-mono text-label-medium md:col-span-12 md:col-start-1 md:row-start-2 md:flex xl:col-span-4 xl:col-start-5 xl:row-start-1"
      data-figma-component="Breadcrumb control"
      data-node-id="36:281"
    >
      <IconButton
        aria-label="Previous item"
        href={previousHref}
        icon="←"
        transitionTypes={["site-page"]}
      />
      <div className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-sm">
        {levels.map((level, index) => (
          <BreadcrumbLevelItem
            isCurrent={index === levels.length - 1}
            key={`${level.href}-${index}`}
            level={level}
          />
        ))}
      </div>
      <IconButton
        aria-label="Next item"
        href={nextHref}
        icon="→"
        transitionTypes={["site-page"]}
      />
    </nav>
  );
}
