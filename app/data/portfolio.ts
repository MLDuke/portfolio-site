export type ProjectMedia = {
  src?: string;
  alt?: string;
  caption?: string;
  aspect?: "16/9" | "4/3" | "1/1" | "3/4";
  tone?: "neutral" | "dark" | "blue" | "green";
};

export type ProjectBlock =
  | { type: "feature"; media: ProjectMedia; label?: string }
  | { type: "single"; media: ProjectMedia }
  | { type: "pair"; items: [ProjectMedia, ProjectMedia] }
  | { type: "grid"; columns: 2 | 3 | 4; items: ProjectMedia[] }
  | { type: "compare"; before: ProjectMedia; after: ProjectMedia }
  | { type: "mosaic"; items: ProjectMedia[] }
  | { type: "text"; body: string };

export type Project = {
  slug: string;
  title: string;
  index: string;
  description: string;
  year: string;
  role: string;
  client: string;
  blocks: ProjectBlock[];
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
    blocks: [
      {
        type: "feature",
        label: "Archive 01",
        media: {
          caption: "Feature placeholder for the lead project image.",
          aspect: "16/9",
          tone: "dark",
        },
      },
      {
        type: "text",
        body: "A short interstitial note can hold project context while final copy is still in progress.",
      },
      {
        type: "pair",
        items: [
          {
            caption: "Process placeholder",
            aspect: "4/3",
            tone: "neutral",
          },
          {
            caption: "Detail placeholder",
            aspect: "4/3",
            tone: "blue",
          },
        ],
      },
      {
        type: "grid",
        columns: 3,
        items: [
          { caption: "Grid item A", aspect: "1/1", tone: "green" },
          { caption: "Grid item B", aspect: "1/1", tone: "neutral" },
          { caption: "Grid item C", aspect: "1/1", tone: "dark" },
        ],
      },
      {
        type: "compare",
        before: {
          caption: "Before",
          aspect: "4/3",
          tone: "neutral",
        },
        after: {
          caption: "After",
          aspect: "4/3",
          tone: "green",
        },
      },
      {
        type: "mosaic",
        items: [
          { caption: "Mosaic A", aspect: "16/9", tone: "blue" },
          { caption: "Mosaic B", aspect: "1/1", tone: "neutral" },
          { caption: "Mosaic C", aspect: "3/4", tone: "dark" },
          { caption: "Mosaic D", aspect: "4/3", tone: "green" },
        ],
      },
    ],
  },
  {
    slug: "project-two",
    title: "Project Name",
    index: "002",
    description: "Project Description",
    year: "2026",
    role: "2026",
    client: "2026",
    blocks: [
      {
        type: "single",
        media: {
          caption: "Single media placeholder.",
          aspect: "4/3",
          tone: "blue",
        },
      },
      {
        type: "grid",
        columns: 2,
        items: [
          { caption: "Two-column item A", aspect: "3/4", tone: "neutral" },
          { caption: "Two-column item B", aspect: "3/4", tone: "dark" },
        ],
      },
      {
        type: "text",
        body: "Archive blocks remain data-driven so real project assets can replace placeholders later.",
      },
      {
        type: "mosaic",
        items: [
          { caption: "Mosaic A", aspect: "1/1", tone: "green" },
          { caption: "Mosaic B", aspect: "16/9", tone: "neutral" },
          { caption: "Mosaic C", aspect: "4/3", tone: "blue" },
        ],
      },
    ],
  },
  {
    slug: "project-three",
    title: "Project Name",
    index: "002",
    description: "Project Description",
    year: "2026",
    role: "2026",
    client: "2026",
    blocks: [
      {
        type: "feature",
        label: "Archive 03",
        media: {
          caption: "Alternate feature placeholder.",
          aspect: "16/9",
          tone: "green",
        },
      },
      {
        type: "compare",
        before: {
          caption: "Before",
          aspect: "16/9",
          tone: "dark",
        },
        after: {
          caption: "After",
          aspect: "16/9",
          tone: "blue",
        },
      },
      {
        type: "pair",
        items: [
          { caption: "Paired item A", aspect: "1/1", tone: "neutral" },
          { caption: "Paired item B", aspect: "1/1", tone: "green" },
        ],
      },
    ],
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
