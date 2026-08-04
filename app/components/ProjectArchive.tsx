import Image from "next/image";
import type { ProjectBlock, ProjectMedia } from "../data/portfolio";

type ProjectBlockRendererProps = {
  blocks: ProjectBlock[];
};

const aspectClasses = {
  "16/9": "aspect-[16/9]",
  "4/3": "aspect-[4/3]",
  "1/1": "aspect-square",
  "3/4": "aspect-[3/4]",
} satisfies Record<NonNullable<ProjectMedia["aspect"]>, string>;

const toneClasses = {
  neutral: "bg-[#808891]",
  dark: "bg-[#424853]",
  blue: "bg-[var(--color-blue-3)]",
  green: "bg-[var(--color-green-2)]",
} satisfies Record<NonNullable<ProjectMedia["tone"]>, string>;

const gridColumnClasses = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
} satisfies Record<2 | 3 | 4, string>;

export function ProjectBlockRenderer({ blocks }: ProjectBlockRendererProps) {
  return (
    <div className="grid gap-32">
      {blocks.map((block, index) => (
        <ProjectBlockView block={block} key={`${block.type}-${index}`} />
      ))}
    </div>
  );
}

export function ProjectMediaFigure({
  media,
  priority = false,
}: {
  media: ProjectMedia;
  priority?: boolean;
}) {
  return (
    <figure className="grid gap-8">
      <ProjectMediaFrame media={media} priority={priority} />
      {media.caption ? (
        <figcaption className="font-mono text-label-small text-on-surface-secondary">
          {media.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

export function ProjectFeatureMedia({
  label,
  media,
}: {
  label?: string;
  media: ProjectMedia;
}) {
  return (
    <figure className="grid gap-8">
      {label ? (
        <p className="font-mono text-label-small text-on-surface-secondary">
          {label}
        </p>
      ) : null}
      <ProjectMediaFrame media={media} priority />
      {media.caption ? (
        <figcaption className="font-mono text-label-small text-on-surface-secondary">
          {media.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

export function ProjectMediaPair({
  items,
}: {
  items: [ProjectMedia, ProjectMedia];
}) {
  return (
    <div className="grid gap-16 sm:grid-cols-2">
      {items.map((item, index) => (
        <ProjectMediaFigure key={index} media={item} />
      ))}
    </div>
  );
}

export function ProjectMediaGrid({
  columns,
  items,
}: {
  columns: 2 | 3 | 4;
  items: ProjectMedia[];
}) {
  return (
    <div className={`grid gap-16 ${gridColumnClasses[columns]}`}>
      {items.map((item, index) => (
        <ProjectMediaFigure key={index} media={item} />
      ))}
    </div>
  );
}

export function ProjectCompareRow({
  after,
  before,
}: {
  after: ProjectMedia;
  before: ProjectMedia;
}) {
  return (
    <div className="grid gap-16 sm:grid-cols-2">
      <ProjectMediaFigure media={before} />
      <ProjectMediaFigure media={after} />
    </div>
  );
}

export function ProjectMosaic({ items }: { items: ProjectMedia[] }) {
  return (
    <div className="grid gap-16 sm:grid-cols-6">
      {items.map((item, index) => (
        <div
          className={index % 3 === 0 ? "sm:col-span-4" : "sm:col-span-2"}
          key={index}
        >
          <ProjectMediaFigure media={item} />
        </div>
      ))}
    </div>
  );
}

export function ProjectTextBlock({ body }: { body: string }) {
  return (
    <p className="max-w-[520px] text-body-medium text-on-surface-secondary">
      {body}
    </p>
  );
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

function ProjectMediaFrame({
  media,
  priority,
}: {
  media: ProjectMedia;
  priority: boolean;
}) {
  const aspect = media.aspect ?? "16/9";
  const tone = media.tone ?? "neutral";
  const frameClassName = [
    "relative w-full overflow-hidden rounded-[6px]",
    aspectClasses[aspect],
    toneClasses[tone],
  ].join(" ");

  if (media.src) {
    const alt = media.alt?.trim();

    if (!alt) {
      throw new Error(`Project media with src "${media.src}" requires alt text.`);
    }

    return (
      <div className={frameClassName}>
        <Image
          alt={alt}
          className="object-cover"
          fill
          priority={priority}
          sizes="(min-width: 768px) 688px, calc(100vw - 32px)"
          src={media.src}
        />
      </div>
    );
  }

  return (
    <div className={frameClassName}>
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgb(255_255_255_/_0.12),rgb(0_0_0_/_0.1))]" />
    </div>
  );
}
