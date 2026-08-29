import type { Metadata } from "next";
import { FigureCard } from "../components/FigureCard";
import { Footer } from "../components/Footer";
import { PageTransition } from "../components/PageTransition";
import { PortfolioNav } from "../components/PortfolioNav";
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
    <main className="grid min-h-screen grid-rows-[auto_1fr_auto] gap-y-96 bg-surface-base px-16 py-12 text-on-surface-primary md:px-24 md:py-16">
      <PortfolioNav active="journal" />

      <PageTransition>
        <section
          aria-label="Journal entries"
          className="grid auto-rows-[449px] grid-cols-1 gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-4"
        >
          {journalEntries.map((entry, index) => (
            <FigureCard
              index={entry.index}
              key={`${entry.title}-${index}`}
              title={entry.title}
              variant="journal"
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
