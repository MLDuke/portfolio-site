"use client";

import { useState } from "react";
import { adjacentItems, siteSections } from "../data/siteNavigation";
import { routes } from "../data/routes";
import { AboutModal } from "./AboutModal";
import { BreadcrumbControlV2 } from "./BreadcrumbControlV2";
import { FullNav, NavButton } from "./ComponentPrimitives";

type PortfolioNavProps = {
  active: "projects" | "journal" | "information";
  currentItemHref?: string;
};

const navItems = [
  { label: "Work", href: routes.work, key: "projects" },
  { label: "Journal", href: routes.journal, key: "journal" },
] as const;

export function PortfolioNav({ active, currentItemHref }: PortfolioNavProps) {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const adjacent = adjacentItems(siteSections, currentItemHref);

  return (
    <>
      <FullNav
        breadcrumb={
          <BreadcrumbControlV2
            ariaLabel="Portfolio breadcrumb navigation"
            className="order-last w-full justify-center md:col-span-12 md:col-start-1 md:row-start-2 xl:order-none xl:col-span-4 xl:col-start-5 xl:row-start-1"
            currentItemHref={currentItemHref}
            currentSectionId={active === "journal" ? "journal" : "work"}
            nextHref={adjacent?.nextHref}
            previousHref={adjacent?.previousHref}
            sections={siteSections}
          />
        }
      >
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
