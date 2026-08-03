"use client";

import Link from "next/link";
import { useState } from "react";
import { AboutModal } from "./AboutModal";
import { BreadcrumbControl, NavButton } from "./ComponentPrimitives";

type PortfolioNavProps = {
  active: "projects" | "journal" | "information";
  breadcrumb?: string;
};

const navItems = [
  { label: "Projects", href: "/", key: "projects" },
  { label: "Journal", href: "/journal", key: "journal" },
] as const;

export function PortfolioNav({ active, breadcrumb }: PortfolioNavProps) {
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  return (
    <>
      <header className="grid h-32 grid-cols-12 items-start gap-x-32 text-label-medium">
        <Link
          className="col-span-3 self-center whitespace-nowrap font-mono text-[#1f1f1f]"
          href="/"
        >
          M.D.
        </Link>

        {breadcrumb ? (
          <BreadcrumbControl
            label={breadcrumb}
            nextHref="/projects/project-two"
            previousHref="/projects/project-three"
          />
        ) : (
          <div className="hidden md:col-span-6 md:block" />
        )}

        <nav
          aria-label="Primary navigation"
          data-figma-component="Nav"
          data-node-id="33:57"
          className="col-span-9 justify-self-end rounded-[6px] bg-surface-raised p-2 font-mono md:col-span-3"
        >
          <div className="flex items-center gap-2">
            {navItems.map((item) => (
              <NavButton
                active={active === item.key}
                href={item.href}
                key={item.key}
              >
                {item.label}
              </NavButton>
            ))}
            <NavButton
              active={active === "information" || isAboutOpen}
              onClick={() => setIsAboutOpen(true)}
            >
              Information
            </NavButton>
          </div>
        </nav>
      </header>

      {isAboutOpen ? <AboutModal onClose={() => setIsAboutOpen(false)} /> : null}
    </>
  );
}
