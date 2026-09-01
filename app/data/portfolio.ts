import { createDetailContent } from "./detailContent";
import type { DetailBlock, Media } from "./detailContent";

export type { DetailBlock, DetailFigureConfig, Media } from "./detailContent";

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
  cardMedia?: Media;
  blocks: DetailBlock[];
};

export { journalEntries } from "./journal.generated";

const bodyPlaceholder =
  "This UI component provides a reusable building block for common interface patterns. It is designed to support clear content, consistent styling, and predictable behavior across screens. Flexible properties make it easy to adapt the component to different contexts and states. Use it to speed up design work while keeping the overall experience cohesive.";

export const projects: Project[] = [
  {
    slug: "project-name",
    title: "Project Name",
    index: "002",
    description: bodyPlaceholder,
    blocks: createDetailContent({
      title: "Project Name",
      index: "002",
      description: bodyPlaceholder,
      blocks: [
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
    }),
  },
  {
    slug: "project-two",
    title: "Project Name",
    index: "002",
    description: bodyPlaceholder,
    blocks: createDetailContent({
      title: "Project Name",
      index: "002",
      description: bodyPlaceholder,
      blocks: [
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
    }),
  },
  {
    slug: "project-three",
    title: "Project Name",
    index: "002",
    description: bodyPlaceholder,
    blocks: createDetailContent({
      title: "Project Name",
      index: "002",
      description: bodyPlaceholder,
      blocks: [
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
    }),
  },
];

export const aboutLinks = [
  { label: "Are.na", href: "https://www.are.na/" },
  { label: "Linkedin", href: "https://www.linkedin.com/" },
  { label: "Email", href: "mailto:hello@example.com" },
  { label: "Resume", href: "/resume.pdf" },
];
