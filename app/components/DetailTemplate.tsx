import Image from "next/image";
import type { ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { getPriorityMediaBlockIndex } from "../data/detailContent";
import type {
  DetailBlock,
  DetailFigureConfig,
  Media,
} from "../data/detailContent";

type DetailArticleProps = {
  children: ReactNode;
};

/**
 * Detail pages own the page heading, so the description block defaults to h1.
 * Embedding contexts that already have a heading (the sandbox) pass a lower
 * level to keep the document outline intact.
 */
export type DetailHeadingLevel = "h1" | "h2" | "h3";

const toneClasses = {
  neutral: "bg-[#dadada]",
  dark: "bg-[#424853]",
  blue: "bg-[var(--color-blue-3)]",
  green: "bg-[var(--color-green-2)]",
} satisfies Record<NonNullable<Media["tone"]>, string>;

const markdownComponents: Components = {
  a({ children, href }) {
    return (
      <a
        className="underline decoration-current/40 underline-offset-4 hover:decoration-current focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-border-focus)]"
        href={href}
        rel={href?.startsWith("http") ? "noreferrer" : undefined}
        target={href?.startsWith("http") ? "_blank" : undefined}
      >
        {children}
      </a>
    );
  },
  code({ children }) {
    return (
      <code className="rounded-[4px] bg-surface-raised px-4 py-1 font-mono text-label-medium">
        {children}
      </code>
    );
  },
  h2({ children }) {
    return <h2 className="text-body-medium">{children}</h2>;
  },
  h3({ children }) {
    return <h3 className="text-body-medium">{children}</h3>;
  },
  li({ children }) {
    return <li className="pl-2">{children}</li>;
  },
  ol({ children }) {
    return <ol className="grid list-decimal gap-3 pl-20">{children}</ol>;
  },
  p({ children }) {
    return <p>{children}</p>;
  },
  pre({ children }) {
    return (
      <pre className="overflow-x-auto rounded-[6px] bg-surface-raised p-12 font-mono text-label-medium [&>code]:rounded-none [&>code]:bg-transparent [&>code]:p-0">
        {children}
      </pre>
    );
  },
  ul({ children }) {
    return <ul className="grid list-disc gap-3 pl-20">{children}</ul>;
  },
};

export function DetailArticle({ children }: DetailArticleProps) {
  return (
    <article
      className="mx-auto grid w-full max-w-[704px] gap-32"
      data-figma-component="Detail Article"
      data-node-id="1978:1052"
    >
      {children}
    </article>
  );
}

export function DetailDescription({
  description,
  headingLevel = "h1",
  index,
  title,
}: {
  description: string;
  headingLevel?: DetailHeadingLevel;
  index: string;
  title: string;
}) {
  const Heading = headingLevel;

  return (
    <div
      className="grid gap-8"
      data-figma-component="Description"
      data-node-id="2016:1320"
    >
      <header className="flex items-center justify-center gap-10 text-on-surface-secondary">
        <Heading className="min-w-0 flex-1 text-body-medium">{title}</Heading>
        <p className="shrink-0 whitespace-nowrap font-mono text-label-medium">
          {index}
        </p>
      </header>
      <MarkdownContent body={description} />
    </div>
  );
}

export function DetailFigure({
  media,
  priority = false,
  showCaption = true,
  variant = "wide",
}: {
  media: Media;
  priority?: boolean;
  showCaption?: boolean;
  variant?: "wide" | "gallery";
}) {
  return (
    <figure
      className="grid gap-10"
      data-figma-component="Figure"
      data-node-id="2016:1274"
    >
      <DetailMediaFrame media={media} priority={priority} variant={variant} />
      {showCaption && media.caption ? (
        <figcaption className="w-full text-center font-mono text-label-medium text-on-surface-secondary">
          {media.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

export function DetailGallery({
  items,
  priority = false,
}: {
  items: [DetailFigureConfig, DetailFigureConfig];
  priority?: boolean;
}) {
  return (
    <div
      className="grid gap-24 sm:grid-cols-2"
      data-figma-component="Gallery"
      data-node-id="2016:1283"
    >
      {items.map((item, index) => (
        <DetailFigure
          key={index}
          media={item.media}
          priority={priority && index === 0}
          showCaption={item.showCaption}
          variant="gallery"
        />
      ))}
    </div>
  );
}

export function DetailTextBlock({ body }: { body: string }) {
  return (
    <div
      className="text-body-small text-on-surface-secondary"
      data-node-id="1981:1217"
    >
      <MarkdownContent body={body} />
    </div>
  );
}

export function DetailSourceLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <p className="font-mono text-label-medium text-on-surface-secondary">
      <a
        className="underline decoration-current/40 underline-offset-4 hover:decoration-current focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-border-focus)]"
        href={href}
        rel="noreferrer"
        target="_blank"
      >
        {label}
      </a>
    </p>
  );
}

export function DetailBlockRenderer({
  blocks,
  headingLevel = "h1",
}: {
  blocks: DetailBlock[];
  headingLevel?: DetailHeadingLevel;
}) {
  const priorityMediaIndex = getPriorityMediaBlockIndex(blocks);

  return (
    <>
      {blocks.map((block, index) => {
        switch (block.type) {
          case "description":
            return (
              <DetailDescription
                description={block.body}
                headingLevel={headingLevel}
                index={block.index}
                key={`${block.type}-${index}`}
                title={block.title}
              />
            );
          case "figure":
            return (
              <DetailFigure
                key={`${block.type}-${index}`}
                media={block.media}
                priority={index === priorityMediaIndex}
                showCaption={block.showCaption}
              />
            );
          case "gallery":
            return (
              <DetailGallery
                items={block.items}
                key={`${block.type}-${index}`}
                priority={index === priorityMediaIndex}
              />
            );
          case "sourceLink":
            return (
              <DetailSourceLink
                href={block.href}
                key={`${block.type}-${index}`}
                label={block.label}
              />
            );
          case "text":
            return (
              <DetailTextBlock
                body={block.body}
                key={`${block.type}-${index}`}
              />
            );
        }
      })}
    </>
  );
}

function DetailMediaFrame({
  media,
  priority,
  variant,
}: {
  media: Media;
  priority: boolean;
  variant: "wide" | "gallery";
}) {
  const tone = media.tone ?? "neutral";
  const className = [
    "relative w-full overflow-hidden rounded-[6px]",
    variant === "gallery"
      ? "aspect-[704/401] sm:aspect-[340/401]"
      : "aspect-[704/401]",
    toneClasses[tone],
  ].join(" ");

  if (!media.src) {
    return <div aria-hidden="true" className={className} />;
  }

  const alt = media.alt?.trim();

  if (!alt) {
    throw new Error(`Detail media with src "${media.src}" requires alt text.`);
  }

  return (
    <div className={className}>
      <Image
        alt={alt}
        className="object-cover"
        fill
        priority={priority}
        sizes={
          variant === "gallery"
            ? "(min-width: 768px) 340px, (min-width: 640px) 50vw, calc(100vw - 32px)"
            : "(min-width: 768px) 704px, calc(100vw - 32px)"
        }
        src={media.src}
        unoptimized={isUnoptimizedImage(media.src)}
      />
    </div>
  );
}

function MarkdownContent({ body }: { body: string }) {
  return (
    <div className="grid gap-4 text-body-small text-on-surface-secondary">
      <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
        {body}
      </ReactMarkdown>
    </div>
  );
}

function isUnoptimizedImage(src: string) {
  return src.toLowerCase().endsWith(".gif");
}
