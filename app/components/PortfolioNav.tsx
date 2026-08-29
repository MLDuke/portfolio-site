"use client";

import { useState } from "react";
import { projects } from "../data/portfolio";
import { AboutModal } from "./AboutModal";
import {
  FullNav,
  NavButton,
  type PageControlConfig,
} from "./ComponentPrimitives";

type PortfolioNavProps = {
  active: "projects" | "journal" | "information";
  currentProjectSlug?: string;
  pageControl?: PageControlConfig;
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
  const projectIndex = projects.findIndex(
    (project) => project.slug === currentProjectSlug,
  );
  const projectNav =
    projectIndex >= 0
      ? {
          nextHref: `/projects/${
            projects[(projectIndex + 1) % projects.length].slug
          }`,
          previousHref: `/projects/${
            projects[(projectIndex - 1 + projects.length) % projects.length].slug
          }`,
        }
      : null;
  const currentProject = projectIndex >= 0 ? projects[projectIndex] : null;
  const projectPageControl =
    currentProject && projectNav
      ? {
          ariaLabel: "Project navigation",
          levels: [
            {
              href: "/",
              label: "Work",
            },
            {
              href: `/projects/${currentProject.slug}`,
              label: currentProject.title,
              options: projects.map((project) => ({
                active: project.slug === currentProject.slug,
                href: `/projects/${project.slug}`,
                label: project.title,
              })),
            },
          ],
          nextHref: projectNav.nextHref,
          previousHref: projectNav.previousHref,
        }
      : null;
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
