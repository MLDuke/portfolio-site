import type { Metadata } from "next";
import { FigureCard } from "./components/FigureCard";
import { PortfolioPageShell } from "./components/PortfolioPageShell";
import { projects } from "./data/portfolio";
import { routes } from "./data/routes";
import { siteDescription, siteName } from "./metadata";

export const metadata: Metadata = {
  title: siteName,
  description: siteDescription,
  alternates: {
    canonical: routes.work,
  },
  openGraph: {
    title: siteName,
    description: siteDescription,
    url: routes.work,
    type: "website",
  },
};

export default function ProjectsPage() {
  return (
    <PortfolioPageShell active="projects">
      <section
        aria-label="Projects"
        className="mx-auto grid w-full max-w-[680px] gap-32"
      >
        {projects.map((project) => (
          <FigureCard
            href={routes.project(project.slug)}
            index={project.index}
            key={project.slug}
            title={project.title}
          />
        ))}
      </section>
    </PortfolioPageShell>
  );
}
