export type Media = {
  src?: string;
  alt?: string;
  caption?: string;
  tone?: "neutral" | "dark" | "blue" | "green";
};

export type DetailFigureConfig = {
  media: Media;
  showCaption?: boolean;
};

export type DetailBlock =
  | { type: "description"; body: string; index: string; title: string }
  | ({ type: "figure" } & DetailFigureConfig)
  | { type: "gallery"; items: [DetailFigureConfig, DetailFigureConfig] }
  | { type: "text"; body: string };

/**
 * @deprecated Project and journal detail templates now use composable
 * DetailBlock entries. Keep this only for deprecated sandbox archive examples.
 */
export type ProjectBlock =
  | { type: "feature"; media: Media; label?: string }
  | { type: "single"; media: Media }
  | { type: "pair"; items: [Media, Media] }
  | { type: "grid"; columns: 2 | 3 | 4; items: Media[] }
  | { type: "compare"; before: Media; after: Media }
  | { type: "mosaic"; items: Media[] }
  | { type: "text"; body: string };

export type Project = {
  slug: string;
  title: string;
  index: string;
  description: string;
  blocks: DetailBlock[];
};

export type JournalEntry = {
  slug: string;
  title: string;
  index: string;
  description: string;
  blocks: DetailBlock[];
};

const bodyPlaceholder =
  "This UI component provides a reusable building block for common interface patterns. It is designed to support clear content, consistent styling, and predictable behavior across screens. Flexible properties make it easy to adapt the component to different contexts and states. Use it to speed up design work while keeping the overall experience cohesive.";

export const projects: Project[] = [
  {
    slug: "project-name",
    title: "Project Name",
    index: "002",
    description: bodyPlaceholder,
    blocks: [
      {
        type: "description",
        title: "Project Name",
        index: "002",
        body: bodyPlaceholder,
      },
      {
        type: "figure",
        media: {
          caption: "Caption",
          tone: "neutral",
        },
      },
      {
        type: "gallery",
        items: [
          {
            media: {
              caption: "Caption",
              tone: "neutral",
            },
          },
          {
            media: {
              caption: "Caption",
              tone: "neutral",
            },
          },
        ],
      },
      {
        type: "figure",
        media: {
          caption: "Caption",
          tone: "neutral",
        },
      },
      {
        type: "text",
        body: bodyPlaceholder,
      },
    ],
  },
  {
    slug: "project-two",
    title: "Project Name",
    index: "002",
    description: bodyPlaceholder,
    blocks: [
      {
        type: "description",
        title: "Project Name",
        index: "002",
        body: bodyPlaceholder,
      },
      {
        type: "figure",
        media: {
          tone: "blue",
        },
        showCaption: false,
      },
      {
        type: "gallery",
        items: [
          {
            media: {
              caption: "Caption",
              tone: "neutral",
            },
          },
          {
            media: {
              caption: "Hidden caption",
              tone: "dark",
            },
            showCaption: false,
          },
        ],
      },
      {
        type: "figure",
        media: {
          caption: "Caption",
          tone: "dark",
        },
      },
    ],
  },
  {
    slug: "project-three",
    title: "Project Name",
    index: "002",
    description: bodyPlaceholder,
    blocks: [
      {
        type: "description",
        title: "Project Name",
        index: "002",
        body: bodyPlaceholder,
      },
      {
        type: "figure",
        media: {
          caption: "Caption",
          tone: "green",
        },
      },
      {
        type: "gallery",
        items: [
          {
            media: {
              tone: "dark",
            },
          },
          {
            media: {
              caption: "Caption",
              tone: "neutral",
            },
          },
        ],
      },
    ],
  },
];

export const journalEntries: JournalEntry[] = Array.from(
  { length: 8 },
  (_, index) => ({
    slug: `entry-${index + 1}`,
    title: "Entry Name",
    index: "002",
    description: bodyPlaceholder,
    blocks: [
      {
        type: "figure",
        media: {
          tone: "neutral",
        },
        showCaption: false,
      },
      {
        type: "description",
        title: "Entry Name",
        index: "002",
        body: bodyPlaceholder,
      },
    ],
  }),
);

export const aboutLinks = [
  { label: "Are.na", href: "https://www.are.na/" },
  { label: "Linkedin", href: "https://www.linkedin.com/" },
  { label: "Email", href: "mailto:hello@example.com" },
  { label: "Resume", href: "/resume.pdf" },
];
