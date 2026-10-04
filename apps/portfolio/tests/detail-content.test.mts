import assert from "node:assert/strict";
import { test } from "node:test";
import {
  coverMedia,
  createDetailContent,
  getPriorityMediaBlockIndex,
  type DetailBlock,
} from "../app/data/detailContent.ts";

const figure: DetailBlock = {
  type: "figure",
  media: { src: "/a.png", alt: "A", tone: "blue" },
};
const gallery: DetailBlock = {
  type: "gallery",
  items: [
    { media: { src: "/g1.png", alt: "G1", tone: "green" } },
    { media: { src: "/g2.png", alt: "G2" } },
  ],
};
const text: DetailBlock = { type: "text", body: "words" };

test("createDetailContent puts the description block first", () => {
  const blocks = createDetailContent({
    description: "Summary.",
    index: "001",
    title: "Title",
    blocks: [text],
  });

  assert.deepEqual(blocks[0], {
    type: "description",
    title: "Title",
    index: "001",
    body: "Summary.",
  });
  assert.equal(blocks.length, 2);
});

test("createDetailContent prefers an explicit body over the description", () => {
  const [description] = createDetailContent({
    body: "Long body.",
    description: "Short summary.",
    index: "001",
    title: "Title",
  });

  assert.equal(description.type === "description" && description.body, "Long body.");
});

test("the priority media block is the first figure or gallery", () => {
  assert.equal(getPriorityMediaBlockIndex([text, gallery, figure]), 1);
  assert.equal(getPriorityMediaBlockIndex([text]), -1);
});

test("cover media prefers an explicit cardMedia", () => {
  const explicit = { src: "/card.png", alt: "Card" };

  assert.deepEqual(
    coverMedia({ blocks: [figure], cardMedia: explicit }),
    explicit,
  );
});

test("cover media falls back to the first media-bearing block", () => {
  assert.deepEqual(coverMedia({ blocks: [text, figure] }), figure.media);
  assert.deepEqual(
    coverMedia({ blocks: [text, gallery, figure] }),
    { src: "/g1.png", alt: "G1", tone: "green" },
  );
});

test("cover media is the same block marked for priority loading", () => {
  const blocks = [text, gallery, figure];
  const priority = blocks[getPriorityMediaBlockIndex(blocks)];

  assert.equal(priority, gallery);
  assert.equal(coverMedia({ blocks }).src, "/g1.png");
});

test("an entry with no media has an empty cover", () => {
  assert.deepEqual(coverMedia({ blocks: [text] }), {});
});
