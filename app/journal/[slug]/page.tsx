import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  DetailArticle,
  DetailBlockRenderer,
} from "../../components/DetailTemplate";
import { PortfolioPageShell } from "../../components/PortfolioPageShell";
import { journalEntries } from "../../data/portfolio";
import type { PageControlConfig } from "../../components/ComponentPrimitives";

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

  const url = `/journal/${entry.slug}`;

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
      pageControl={createJournalPageControl(entry.slug)}
    >
      <DetailArticle>
        <DetailBlockRenderer blocks={entry.blocks} />
      </DetailArticle>
    </PortfolioPageShell>
  );
}

function createJournalPageControl(slug: string): PageControlConfig {
  const entryIndex = journalEntries.findIndex((entry) => entry.slug === slug);
  const entry = journalEntries[entryIndex];
  const previousEntry =
    journalEntries[
      (entryIndex - 1 + journalEntries.length) % journalEntries.length
    ];
  const nextEntry = journalEntries[(entryIndex + 1) % journalEntries.length];

  return {
    ariaLabel: "Journal navigation",
    levels: [
      {
        href: "/journal",
        label: "Journal",
      },
      {
        href: `/journal/${entry.slug}`,
        label: entry.title,
        options: journalEntries.map((option) => ({
          active: option.slug === entry.slug,
          href: `/journal/${option.slug}`,
          label: option.title,
        })),
      },
    ],
    nextHref: `/journal/${nextEntry.slug}`,
    previousHref: `/journal/${previousEntry.slug}`,
  };
}
