import { createDetailContent } from "./detailContent.ts";
import type { DetailBlock, Media } from "./detailContent";

export type { DetailBlock, DetailFigureConfig, Media } from "./detailContent";

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

export { journalEntries } from "./journal.generated.ts";

/** Seed copy for the unwritten case studies. Also drives the sandbox specimens. */
export const placeholderBody =
  "This UI component provides a reusable building block for common interface patterns. It is designed to support clear content, consistent styling, and predictable behavior across screens. Flexible properties make it easy to adapt the component to different contexts and states. Use it to speed up design work while keeping the overall experience cohesive.";

export const projects: Project[] = [
  {
    slug: "project-name",
    title: "Project Name",
    index: "002",
    description: placeholderBody,
    blocks: createDetailContent({
      title: "Project Name",
      index: "002",
      description: placeholderBody,
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
          body: placeholderBody,
        },
      ],
    }),
  },
  {
    slug: "project-two",
    title: "Project Name",
    index: "002",
    description: placeholderBody,
    blocks: createDetailContent({
      title: "Project Name",
      index: "002",
      description: placeholderBody,
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
    description: placeholderBody,
    blocks: createDetailContent({
      title: "Project Name",
      index: "002",
      description: placeholderBody,
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

export type AboutLink = {
  group: "connect" | "contact";
  href: string;
  label: string;
};

/**
 * `group` is carried on each link rather than implied by position, so
 * reordering this array cannot silently move a link to the other heading.
 */
export const aboutLinks: AboutLink[] = [
  { group: "connect", label: "Are.na", href: "https://www.are.na/" },
  { group: "connect", label: "Linkedin", href: "https://www.linkedin.com/" },
  { group: "contact", label: "Email", href: "mailto:hello@example.com" },
  { group: "contact", label: "Resume", href: "/resume.pdf" },
];

export function aboutLinksIn(group: AboutLink["group"]) {
  return aboutLinks.filter((link) => link.group === group);
}
