"use client";

import { useState } from "react";
import { createCollectionPageControl } from "../data/pageControl";
import { projects } from "../data/portfolio";
import { AboutModal } from "./AboutModal";
import {
  FullNav,
  NavButton,
} from "./ComponentPrimitives";
import type { PageControlConfig } from "../data/pageControl";

type PortfolioNavProps = {
  active: "projects" | "journal" | "information";
  currentProjectSlug?: string;
  pageControl?: PageControlConfig | null;
};

const navItems = [
  { label: "Projects", href: "/", key: "projects" },
  { label: "Journal", href: "/journal", key: "journal" },
] as const;

export function PortfolioNav({
  active,
  currentProjectSlug,
  pageControl,
}: PortfolioNavProps) {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const projectPageControl = createCollectionPageControl({
    ariaLabel: "Project navigation",
    currentSlug: currentProjectSlug,
    itemHref: (project) => `/projects/${project.slug}`,
    items: projects,
    root: {
      href: "/",
      label: "Work",
    },
  });
  const visiblePageControl = pageControl ?? projectPageControl;

  return (
    <>
      <FullNav pageControl={visiblePageControl}>
        {navItems.map((item) => (
          <NavButton
            active={active === item.key}
            href={item.href}
            key={item.key}
            transitionTypes={["site-page"]}
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
      </FullNav>

      {isAboutOpen ? <AboutModal onClose={() => setIsAboutOpen(false)} /> : null}
    </>
  );
}
