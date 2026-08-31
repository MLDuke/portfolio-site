import type { Metadata } from "next";
import { FigureCard } from "../components/FigureCard";
import { PortfolioPageShell } from "../components/PortfolioPageShell";
import { journalEntries } from "../data/portfolio";

const title = "Journal";
const description = "Journal entries from Matthew Duke Design.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/journal",
  },
  openGraph: {
    title,
    description,
    url: "/journal",
    type: "website",
  },
};

export default function JournalPage() {
  return (
    <PortfolioPageShell active="journal">
      <section
        aria-label="Journal entries"
        className="grid auto-rows-[449px] grid-cols-1 gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-4"
      >
        {journalEntries.map((entry) => (
          <FigureCard
            href={`/journal/${entry.slug}`}
            index={entry.index}
            key={entry.slug}
            title={entry.title}
            variant="journal"
          />
        ))}
      </section>
    </PortfolioPageShell>
  );
}
