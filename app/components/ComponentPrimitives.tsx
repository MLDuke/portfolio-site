import Link from "next/link";
import type { ReactNode } from "react";

type NavButtonProps = {
  active?: boolean;
  children: ReactNode;
  href?: string;
  onClick?: () => void;
};

export function NavButton({
  active = false,
  children,
  href,
  onClick,
}: NavButtonProps) {
  const state = active ? "active" : "rest";
  const className = [
    "flex shrink-0 rounded-sm px-8 py-4 font-mono text-label-medium text-on-surface-primary",
    active
      ? "items-start justify-end bg-[rgb(0_6_17_/_0.12)] text-right whitespace-nowrap"
      : "flex-col items-center justify-center gap-8 bg-surface-raised",
  ].join(" ");
  const commonProps = {
    "data-figma-component": "Nav Button",
    "data-node-id": active ? "33:58" : "32:761",
    "data-state": state,
  };

  if (href) {
    return (
      <Link
        aria-current={active ? "page" : undefined}
        className={className}
        href={href}
        {...commonProps}
      >
        {children}
      </Link>
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
};

export function IconButton({
  "aria-label": ariaLabel,
  href,
  icon,
}: IconButtonProps) {
  return (
    <Link
      aria-label={ariaLabel}
      className="flex h-24 min-w-24 shrink-0 items-center justify-center rounded-sm bg-surface-base px-5 text-body-medium text-on-surface-primary"
      data-figma-component="Icon Button"
      data-node-id="35:135"
      data-state="rest"
      href={href}
    >
      {icon}
    </Link>
  );
}

type BreadcrumbControlProps = {
  label: string;
  nextHref: string;
  previousHref: string;
};

export function BreadcrumbControl({
  label,
  nextHref,
  previousHref,
}: BreadcrumbControlProps) {
  return (
    <nav
      aria-label="Project navigation"
      className="hidden w-[448px] items-center justify-center gap-10 font-mono text-label-medium md:col-span-6 md:flex"
      data-figma-component="Breadcrumb control"
      data-node-id="36:281"
    >
      <IconButton aria-label="Previous project" href={previousHref} icon="←" />
      <span className="whitespace-nowrap">{label}</span>
      <IconButton aria-label="Next project" href={nextHref} icon="→" />
    </nav>
  );
}
