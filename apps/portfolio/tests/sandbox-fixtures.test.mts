import assert from "node:assert/strict";
import { test } from "node:test";
import { sandboxSections } from "../app/data/fixtures.ts";
import { adjacentItems } from "../app/data/siteNavigation.ts";

test("sandbox sections mirror the shape of the shipped sections", () => {
  assert.deepEqual(
    sandboxSections.map((section) => section.id),
    ["work", "journal"],
  );
});

test("both sandbox sections are populated, so the drill-down has something to show", () => {
  for (const section of sandboxSections) {
    assert.ok(
      section.items.length > 1,
      `${section.id} needs more than one item to exercise adjacency`,
    );
  }
});

test("every sandbox item carries the fields the preview renders", () => {
  for (const section of sandboxSections) {
    for (const item of section.items) {
      assert.ok(item.title, `${item.href} has no title`);
      assert.ok(item.description, `${item.href} has no description`);
      assert.ok(item.media, `${item.href} has no cover media`);
      assert.ok(
        adjacentItems(sandboxSections, item.href),
        `${item.href} has no adjacent items`,
      );
    }
  }
});
