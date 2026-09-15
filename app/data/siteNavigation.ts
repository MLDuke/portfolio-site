// Relative imports inside app/data carry their .ts extension so `npm run
// test:unit` can load these modules directly — Node's resolver requires it,
// and the bundler accepts it either way.
import { coverMedia, type Media } from "./detailContent.ts";
import { journalEntries, projects } from "./portfolio.ts";
import { routes } from "./routes.ts";

export type NavItem = {
  description?: string;
  href: string;
  index?: string;
  media?: Media;
  title: string;
};

export type NavSection = {
  description?: string;
  href: string;
  id: string;
  items: NavItem[];
  label: string;
};

/**
 * The site's navigable content, as one model.
 *
 * Every surface that has to answer "where am I, what is next to me, and what
 * else could I go to" reads this: the breadcrumb, its drill-down, and the
 * adjacent-item arrows. Sections are ordered as they appear in the primary nav.
 */
export const siteSections: NavSection[] = [
  {
    id: "work",
    label: "Work",
    href: routes.work,
    description: "Selected product, systems, and brand work.",
    items: projects.map((project) => ({
      href: routes.project(project.slug),
      title: project.title,
      index: project.index,
      description: project.description,
      media: coverMedia(project),
    })),
  },
  {
    id: "journal",
    label: "Journal",
    href: routes.journal,
    description: "Notes, observations, and lightweight research fragments.",
    items: journalEntries.map((entry) => ({
      href: routes.journalEntry(entry.slug),
      title: entry.title,
      index: entry.index,
      description: entry.description,
      media: coverMedia(entry),
    })),
  },
];

/**
 * The items either side of `currentHref` within its own section, wrapping at
 * both ends. Null when the href names no item, which is how a collection root
 * ends up with no adjacent-item arrows.
 */
export function adjacentItems(
  sections: NavSection[],
  currentHref: string | undefined,
): { nextHref: string; previousHref: string } | null {
  for (const section of sections) {
    const index = section.items.findIndex((item) => item.href === currentHref);

    if (index < 0) {
      continue;
    }

    const { items } = section;

    return {
      nextHref: items[(index + 1) % items.length].href,
      previousHref: items[(index - 1 + items.length) % items.length].href,
    };
  }

  return null;
}
