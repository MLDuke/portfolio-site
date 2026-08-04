import { notFound } from "next/navigation";
import { PortfolioNav } from "../../components/PortfolioNav";
import { ProjectBlockRenderer } from "../../components/ProjectArchive";
import { projects } from "../../data/portfolio";

type ProjectPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = projects.find((item) => item.slug === slug);

  if (!project) {
    notFound();
  }

  return (
    <main className="grid min-h-screen grid-rows-[auto_1fr] gap-y-32 bg-surface-base px-16 py-12 text-on-surface-primary">
      <PortfolioNav
        active="projects"
        currentProjectSlug={project.slug}
      />

      <article className="mx-auto grid w-full max-w-[688px] gap-32">
        <header className="grid gap-8">
          <div className="flex items-center gap-10">
            <h1 className="min-w-0 flex-1 text-body-medium">{project.title}</h1>
            <p className="shrink-0 font-mono text-label-medium font-normal text-on-surface-secondary">
              {project.index}
            </p>
          </div>
          <div className="grid gap-12 text-body-small sm:grid-cols-4 sm:gap-8">
            <p className="text-on-surface-secondary sm:col-span-1">
              {project.description}
            </p>
            <MetaItem label="Year" value={project.year} />
            <MetaItem label="Role" value={project.role} />
            <MetaItem label="Client" value={project.client} />
          </div>
        </header>

        <ProjectBlockRenderer blocks={project.blocks} />
      </article>
    </main>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-4">
      <p className="font-mono text-label-small text-on-surface-secondary">{label}</p>
      <p>{value}</p>
    </div>
  );
}
