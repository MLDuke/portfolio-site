import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  DetailArticle,
  DetailBlockRenderer,
} from "../../components/DetailTemplate";
import { PortfolioPageShell } from "../../components/PortfolioPageShell";
import { journalEntries } from "../../data/portfolio";
import { routes } from "../../data/routes";

type JournalEntryPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return journalEntries.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({
  params,
}: JournalEntryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const entry = journalEntries.find((item) => item.slug === slug);

  if (!entry) {
    return {
      title: "Journal Entry Not Found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const url = routes.journalEntry(entry.slug);

  return {
    title: entry.title,
    description: entry.description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: entry.title,
      description: entry.description,
      url,
      type: "article",
    },
  };
}

export default async function JournalEntryPage({
  params,
}: JournalEntryPageProps) {
  const { slug } = await params;
  const entry = journalEntries.find((item) => item.slug === slug);

  if (!entry) {
    notFound();
  }

  return (
    <PortfolioPageShell
      active="journal"
      contentSpacing="compact"
      currentItemHref={routes.journalEntry(entry.slug)}
    >
      <DetailArticle>
        <DetailBlockRenderer blocks={entry.blocks} />
      </DetailArticle>
    </PortfolioPageShell>
  );
}
