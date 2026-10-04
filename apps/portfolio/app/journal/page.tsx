import type { Metadata } from "next";
import { FigureCard } from "../components/FigureCard";
import { PortfolioPageShell } from "../components/PortfolioPageShell";
import { journalEntries } from "../data/portfolio";
import { routes } from "../data/routes";

const title = "Journal";
const description = "Journal entries from Matthew Duke Design.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: routes.journal,
  },
  openGraph: {
    title,
    description,
    url: routes.journal,
    type: "website",
  },
};

export default function JournalPage() {
  if (journalEntries.length === 0) {
    return (
      <PortfolioPageShell active="journal">
        <div className="grid min-h-[449px] place-items-center text-center text-body-small text-on-surface-secondary">
          <p>Coming soon.</p>
        </div>
      </PortfolioPageShell>
    );
  }

  return (
    <PortfolioPageShell active="journal">
      <section
        aria-label="Journal entries"
        className="grid auto-rows-[449px] grid-cols-1 gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-4"
      >
        {journalEntries.map((entry) => (
          <FigureCard
            href={routes.journalEntry(entry.slug)}
            index={entry.index}
            key={entry.slug}
            media={entry.cardMedia}
            title={entry.title}
            variant="journal"
          />
        ))}
      </section>
    </PortfolioPageShell>
  );
}
