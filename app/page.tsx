import { FigureCard } from "./components/FigureCard";
import { Footer } from "./components/Footer";
import { PortfolioNav } from "./components/PortfolioNav";
import { projects } from "./data/portfolio";

export default function ProjectsPage() {
  return (
    <main className="grid min-h-screen grid-rows-[auto_1fr_auto] gap-y-96 bg-surface-base px-24 py-16 text-on-surface-primary">
      <PortfolioNav active="projects" breadcrumb="Work / Project Name" />

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

      <Footer />
    </main>
  );
}
