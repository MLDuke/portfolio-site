import type { NavSection } from "./siteNavigation.ts";

/**
 * Navigation content for design-system surfaces: the sandbox specimen and the
 * breadcrumb preview page.
 *
 * Kept separate from `siteSections` on purpose. The shipped Journal section is
 * empty until the sketchbook build runs, so it exercises only the empty state —
 * these sections keep both branches populated, which is the only way to see the
 * drill-down flyout and the item preview.
 */
export const sandboxSections: NavSection[] = [
  {
    id: "work",
    label: "Work",
    href: "/",
    description: "Selected product, systems, and brand work.",
    items: [
      {
        href: "/projects/project-name",
        title: "Project Name",
        index: "01",
        description: "A modular case study with image-led detail sections.",
        media: { tone: "neutral" },
      },
      {
        href: "/projects/project-two",
        title: "Project Two",
        index: "02",
        description: "A second project for testing longer adjacent labels.",
        media: { tone: "blue" },
      },
      {
        href: "/projects/project-three",
        title: "Project Three",
        index: "03",
        description: "A darker preview state for visual contrast checks.",
        media: { tone: "dark" },
      },
    ],
  },
  {
    id: "journal",
    label: "Journal",
    href: "/journal",
    description: "Notes, observations, and lightweight research fragments.",
    items: [
      {
        href: "/journal/field-notes",
        title: "Field Notes",
        index: "01",
        description: "Small observations from recent interface work.",
        media: { tone: "green" },
      },
      {
        href: "/journal/control-surfaces",
        title: "Control Surfaces",
        index: "02",
        description: "A journal fixture for testing the drill-down branch.",
        media: { tone: "neutral" },
      },
      {
        href: "/journal/navigation-memory",
        title: "Navigation Memory",
        index: "03",
        description: "How persistent wayfinding changes portfolio reading.",
        media: { tone: "blue" },
      },
    ],
  },
];
