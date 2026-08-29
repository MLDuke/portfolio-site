import type { Metadata } from "next";
import { FigureCard } from "./components/FigureCard";
import { PortfolioPageShell } from "./components/PortfolioPageShell";
import { projects } from "./data/portfolio";
import { siteDescription, siteName } from "./metadata";

export const metadata: Metadata = {
  title: siteName,
  description: siteDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: siteName,
    description: siteDescription,
    url: "/",
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
            href={`/projects/${project.slug}`}
            index={project.index}
            key={project.slug}
            title={project.title}
          />
        ))}
      </section>
    </PortfolioPageShell>
  );
}
