export type Project = {
  slug: string;
  title: string;
  index: string;
  description: string;
  year: string;
  role: string;
  client: string;
};

export type JournalEntry = {
  title: string;
  index: string;
};

export const projects: Project[] = [
  {
    slug: "project-name",
    title: "Project Name",
    index: "002",
    description: "Project Description",
    year: "2026",
    role: "2026",
    client: "2026",
  },
  {
    slug: "project-two",
    title: "Project Name",
    index: "002",
    description: "Project Description",
    year: "2026",
    role: "2026",
    client: "2026",
  },
  {
    slug: "project-three",
    title: "Project Name",
    index: "002",
    description: "Project Description",
    year: "2026",
    role: "2026",
    client: "2026",
  },
];

export const journalEntries: JournalEntry[] = Array.from({ length: 8 }, () => ({
  title: "Entry Name",
  index: "002",
}));

export const aboutLinks = [
  { label: "Are.na", href: "https://www.are.na/" },
  { label: "Linkedin", href: "https://www.linkedin.com/" },
  { label: "Email", href: "mailto:hello@example.com" },
  { label: "Resume", href: "/resume.pdf" },
];
