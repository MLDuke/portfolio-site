import type { Metadata } from "next";
import { FigureCard } from "./components/FigureCard";
import { Footer } from "./components/Footer";
import { PageTransition } from "./components/PageTransition";
import { PortfolioNav } from "./components/PortfolioNav";
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
    <main className="grid min-h-screen grid-rows-[auto_1fr_auto] gap-y-96 bg-surface-base px-16 py-12 text-on-surface-primary md:px-24 md:py-16">
      <PortfolioNav active="projects" />

      <PageTransition>
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
      </PageTransition>

      <PageTransition>
        <Footer />
      </PageTransition>
    </main>
  );
}
