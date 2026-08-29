import type { ReactNode } from "react";
import { Footer } from "./Footer";
import { PageTransition } from "./PageTransition";
import { PortfolioNav } from "./PortfolioNav";

type PortfolioPageShellProps = {
  active: "projects" | "journal" | "information";
  children: ReactNode;
  contentClassName?: string;
  contentSpacing?: "standard" | "compact";
  currentProjectSlug?: string;
  showFooter?: boolean;
};

const contentSpacingClasses = {
  standard: "mt-96",
  compact: "mt-32",
} satisfies Record<NonNullable<PortfolioPageShellProps["contentSpacing"]>, string>;

export function PortfolioPageShell({
  active,
  children,
  contentClassName = "",
  contentSpacing = "standard",
  currentProjectSlug,
  showFooter = true,
}: PortfolioPageShellProps) {
  return (
    <div className="grid min-h-screen grid-rows-[auto_1fr_auto] bg-surface-base px-16 py-12 text-on-surface-primary md:px-24 md:py-16">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-16 focus:top-16 focus:z-50 focus:rounded-sm focus:bg-surface-overlay focus:px-12 focus:py-8 focus:font-mono focus:text-label-medium focus:outline-2 focus:outline-offset-2 focus:outline-[var(--focus-ring-color)]"
        href="#main-content"
      >
        Skip to content
      </a>

      <PortfolioNav active={active} currentProjectSlug={currentProjectSlug} />

      <PageTransition className={contentSpacingClasses[contentSpacing]}>
        <main
          className={["min-w-0", contentClassName].filter(Boolean).join(" ")}
          id="main-content"
        >
          {children}
        </main>
      </PageTransition>

      {showFooter ? (
        <PageTransition className="mt-96">
          <Footer />
        </PageTransition>
      ) : null}
    </div>
  );
}
