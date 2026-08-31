import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  DetailArticle,
  DetailBlockRenderer,
} from "../../components/DetailTemplate";
import { PortfolioPageShell } from "../../components/PortfolioPageShell";
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
      <DetailArticle>
        <DetailBlockRenderer blocks={project.blocks} />
      </DetailArticle>
    </PortfolioPageShell>
  );
}
