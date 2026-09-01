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

function isDetailMediaBlock(block: DetailBlock): block is DetailMediaBlock {
  return block.type === "figure" || block.type === "gallery";
}
