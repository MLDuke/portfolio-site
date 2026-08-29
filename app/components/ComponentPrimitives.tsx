import type { ReactNode } from "react";
import { BreadcrumbLevelItem } from "./BreadcrumbLevelItem";
import { SiteLink } from "./SiteLink";

type NavButtonProps = {
  active?: boolean;
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  transitionTypes?: string[];
};

export function NavButton({
  active = false,
  children,
  href,
  onClick,
  transitionTypes,
}: NavButtonProps) {
  const state = active ? "active" : "rest";
  const className = [
    "state-layer pressable inline-flex min-h-28 shrink-0 items-center justify-center rounded-sm bg-surface-raised px-8 py-4 font-mono text-label-medium text-on-surface-primary whitespace-nowrap",
  ].join(" ");
  const commonProps = {
    "data-figma-component": "Nav Button",
    "data-node-id": active ? "33:58" : "32:761",
    "data-selected": active ? "true" : undefined,
    "data-state": state,
  };

  if (href) {
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
    <button className={className} onClick={onClick} type="button" {...commonProps}>
      {children}
    </button>
  );
}

type IconButtonProps = {
  "aria-label": string;
  href: string;
  icon: "←" | "→";
  transitionTypes?: string[];
};

export function IconButton({
  "aria-label": ariaLabel,
  href,
  icon,
  transitionTypes,
}: IconButtonProps) {
  return (
    <SiteLink
      aria-label={ariaLabel}
      className="state-layer pressable flex h-28 min-w-28 shrink-0 items-center justify-center rounded-sm px-5 text-body-medium text-on-surface-primary"
      data-figma-component="Icon Button"
      data-node-id="35:135"
      data-state="rest"
      href={href}
      transitionTypes={transitionTypes}
    >
      {icon}
    </SiteLink>
  );
}

type BreadcrumbControlProps = {
  ariaLabel: string;
  levels: BreadcrumbLevel[];
  nextHref: string;
  previousHref: string;
};

export type BreadcrumbOption = {
  active?: boolean;
  href: string;
  label: string;
};

export type BreadcrumbLevel = {
  href: string;
  label: string;
  options?: BreadcrumbOption[];
};

export type PageControlConfig = BreadcrumbControlProps;

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
      className="grid h-32 grid-cols-12 items-center gap-x-32 text-label-medium"
      data-figma-component="Full Nav"
      data-node-id="80:379"
      style={{ viewTransitionName: "site-header" }}
    >
      <SiteLink
        className="pressable col-[1/span_3] row-start-1 self-center whitespace-nowrap font-mono text-on-surface-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring-color)]"
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
        <div className="hidden md:col-[5/span_4] md:row-start-1 md:block" />
      )}

      <nav
        aria-label={primaryNavAriaLabel}
        className="col-[4/span_9] row-start-1 justify-self-end rounded-[6px] bg-surface-raised p-2 font-mono md:col-[10/span_3]"
        data-figma-component="Nav"
        data-node-id="33:57"
      >
        <div className="flex items-center gap-2">{children}</div>
      </nav>
    </header>
  );
}

export function BreadcrumbControl({
  ariaLabel,
  levels,
  nextHref,
  previousHref,
}: BreadcrumbControlProps) {
  return (
    <nav
      aria-label={ariaLabel}
      className="hidden w-full max-w-[448px] min-w-0 items-center justify-center gap-12 justify-self-stretch font-mono text-label-medium md:col-[5/span_4] md:row-start-1 md:flex"
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
