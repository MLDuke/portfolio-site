import assert from "node:assert/strict";
import { test } from "node:test";
import { routes } from "../app/data/routes.ts";

test("collection roots", () => {
  assert.equal(routes.work, "/");
  assert.equal(routes.journal, "/journal");
});

test("detail routes are built from a slug", () => {
  assert.equal(routes.project("project-name"), "/projects/project-name");
  assert.equal(routes.journalEntry("field-notes"), "/journal/field-notes");
});
