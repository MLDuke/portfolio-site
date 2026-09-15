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
  | { type: "sourceLink"; href: string; label: string }
  | { type: "text"; body: string };

type DetailContentInput = {
  blocks?: DetailBlock[];
  body?: string;
  description: string;
  index: string;
  title: string;
};

type DetailMediaBlock = Extract<DetailBlock, { type: "figure" | "gallery" }>;

export function createDetailContent({
  blocks = [],
  body,
  description,
  index,
  title,
}: DetailContentInput): DetailBlock[] {
  return [
    {
      type: "description",
      title,
      index,
      body: body ?? description,
    },
    ...blocks,
  ];
}

export function getPriorityMediaBlockIndex(blocks: DetailBlock[]) {
  return blocks.findIndex(isDetailMediaBlock);
}

/**
 * The Media that represents an entry wherever it is shown without being opened:
 * a card on a collection page, a preview in the breadcrumb.
 *
 * `cardMedia` wins when an entry names one explicitly. Otherwise the first
 * media-bearing block does, in document order, which is the same block
 * `getPriorityMediaBlockIndex` marks for priority loading — the cover and the
 * eagerly-loaded image are the same image by construction.
 */
export function coverMedia(entry: {
  blocks: DetailBlock[];
  cardMedia?: Media;
}): Media {
  if (entry.cardMedia) {
    return entry.cardMedia;
  }

  const block = entry.blocks.find(isDetailMediaBlock);

  if (!block) {
    return {};
  }

  return block.type === "figure" ? block.media : block.items[0].media;
}

function isDetailMediaBlock(block: DetailBlock): block is DetailMediaBlock {
  return block.type === "figure" || block.type === "gallery";
}
