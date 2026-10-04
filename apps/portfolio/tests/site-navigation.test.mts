import assert from "node:assert/strict";
import { test } from "node:test";
import {
  adjacentItems,
  siteSections,
  type NavSection,
} from "../app/data/siteNavigation.ts";

const sections: NavSection[] = [
  {
    id: "work",
    label: "Work",
    href: "/",
    items: [
      { href: "/projects/one", title: "One" },
      { href: "/projects/two", title: "Two" },
      { href: "/projects/three", title: "Three" },
    ],
  },
  {
    id: "journal",
    label: "Journal",
    href: "/journal",
    items: [{ href: "/journal/only", title: "Only" }],
  },
];

test("adjacent items wrap at both ends of a section", () => {
  assert.deepEqual(adjacentItems(sections, "/projects/one"), {
    previousHref: "/projects/three",
    nextHref: "/projects/two",
  });
  assert.deepEqual(adjacentItems(sections, "/projects/three"), {
    previousHref: "/projects/two",
    nextHref: "/projects/one",
  });
});

test("adjacency never crosses a section", () => {
  assert.deepEqual(adjacentItems(sections, "/journal/only"), {
    previousHref: "/journal/only",
    nextHref: "/journal/only",
  });
});

test("a collection root has no adjacent items", () => {
  assert.equal(adjacentItems(sections, "/"), null);
  assert.equal(adjacentItems(sections, undefined), null);
  assert.equal(adjacentItems(sections, "/projects/missing"), null);
});

test("an empty section is skipped rather than divided by zero", () => {
  assert.equal(adjacentItems([{ ...sections[0], items: [] }], "/x"), null);
});

test("the shipped sections are Work then Journal, each item carrying a cover", () => {
  assert.deepEqual(
    siteSections.map((section) => section.id),
    ["work", "journal"],
  );

  for (const section of siteSections) {
    for (const item of section.items) {
      assert.ok(item.media, `${item.href} has no cover media`);
      assert.ok(item.href.startsWith("/"), `${item.href} is not a local href`);
    }
  }
});
