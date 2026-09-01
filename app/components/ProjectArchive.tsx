import type { Media, ProjectBlock } from "../data/portfolio";
import {
  DetailFigure,
  DetailGallery,
  DetailTextBlock,
} from "./DetailTemplate";

type ProjectBlockRendererProps = {
  blocks: ProjectBlock[];
};

const gridColumnClasses = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
} satisfies Record<2 | 3 | 4, string>;

/**
 * @deprecated Use DetailArticle, DetailDescription, DetailFigure, and DetailGallery from
 * DetailTemplate for project and journal detail pages.
 */
export function ProjectBlockRenderer({ blocks }: ProjectBlockRendererProps) {
  return (
    <div className="grid gap-32">
      {blocks.map((block, index) => (
        <ProjectBlockView block={block} key={`${block.type}-${index}`} />
      ))}
    </div>
  );
}

/**
 * @deprecated Use DetailFigure from DetailTemplate.
 */
export function ProjectMediaFigure({
  media,
  priority = false,
}: {
  media: Media;
  priority?: boolean;
}) {
  return <DetailFigure media={media} priority={priority} />;
}

/**
 * @deprecated Use DetailFigure from DetailTemplate.
 */
export function ProjectFeatureMedia({
  label,
  media,
}: {
  label?: string;
  media: Media;
}) {
  return (
    <div className="grid gap-8">
      {label ? (
        <p className="font-mono text-label-small text-on-surface-secondary">
          {label}
        </p>
      ) : null}
      <DetailFigure media={media} priority />
    </div>
  );
}

/**
 * @deprecated Use DetailGallery from DetailTemplate.
 */
export function ProjectMediaPair({ items }: { items: [Media, Media] }) {
  return (
    <DetailGallery
      items={[
        { media: items[0] },
        { media: items[1] },
      ]}
    />
  );
}

/**
 * @deprecated Use DetailGallery from DetailTemplate.
 */
export function ProjectMediaGrid({
  columns,
  items,
}: {
  columns: 2 | 3 | 4;
  items: Media[];
}) {
  return (
    <div className={`grid gap-16 ${gridColumnClasses[columns]}`}>
      {items.map((item, index) => (
        <DetailFigure key={index} media={item} variant="gallery" />
      ))}
    </div>
  );
}

/**
 * @deprecated Use DetailGallery from DetailTemplate.
 */
export function ProjectCompareRow({
  after,
  before,
}: {
  after: Media;
  before: Media;
}) {
  return <ProjectMediaPair items={[before, after]} />;
}

/**
 * @deprecated Use DetailGallery from DetailTemplate.
 */
export function ProjectMosaic({ items }: { items: Media[] }) {
  return (
    <div className="grid gap-16 sm:grid-cols-6">
      {items.map((item, index) => (
        <div
          className={index % 3 === 0 ? "sm:col-span-4" : "sm:col-span-2"}
          key={index}
        >
          <DetailFigure media={item} variant="gallery" />
        </div>
      ))}
    </div>
  );
}

/**
 * @deprecated Use DetailTextBlock from DetailTemplate or extend the new detail
 * component set.
 */
export function ProjectTextBlock({ body }: { body: string }) {
  return <DetailTextBlock body={body} />;
}

function ProjectBlockView({ block }: { block: ProjectBlock }) {
  switch (block.type) {
    case "feature":
      return <ProjectFeatureMedia label={block.label} media={block.media} />;
    case "single":
      return <ProjectMediaFigure media={block.media} />;
    case "pair":
      return <ProjectMediaPair items={block.items} />;
    case "grid":
      return <ProjectMediaGrid columns={block.columns} items={block.items} />;
    case "compare":
      return <ProjectCompareRow after={block.after} before={block.before} />;
    case "mosaic":
      return <ProjectMosaic items={block.items} />;
    case "text":
      return <ProjectTextBlock body={block.body} />;
  }
}
