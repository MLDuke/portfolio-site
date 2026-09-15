/**
 * The site's route shapes. Every href, canonical URL, and openGraph url is
 * built here, so a route can be renamed in one place instead of being hunted
 * through template literals in page metadata and the navigation model.
 */
export const routes = {
  work: "/",
  journal: "/journal",
  project: (slug: string) => `/projects/${slug}`,
  journalEntry: (slug: string) => `/journal/${slug}`,
} as const;
