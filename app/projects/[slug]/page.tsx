import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PortfolioPageShell } from "../../components/PortfolioPageShell";
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

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = projects.find((item) => item.slug === slug);

  if (!project) {
    return {
      title: "Project Not Found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const url = `/projects/${project.slug}`;

  return {
    title: project.title,
    description: project.description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: project.title,
      description: project.description,
      url,
      type: "article",
    },
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = projects.find((item) => item.slug === slug);

  if (!project) {
    notFound();
  }

  return (
    <PortfolioPageShell
      active="projects"
      contentSpacing="compact"
      currentProjectSlug={project.slug}
    >
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
    </PortfolioPageShell>
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
