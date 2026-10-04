import Image from "next/image";
import type { ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { getPriorityMediaBlockIndex } from "../data/detailContent";
import { isUnoptimizedImage, mediaToneColor } from "./media";
import type {
  DetailBlock,
  DetailFigureConfig,
  Media,
  SourceFile,
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

/**
 * A code sketch's source, shown on the page instead of linked to GitHub: the
 * README as Markdown, then each file as a native disclosure. `<details>` gives
 * keyboard toggling (Enter and Space) and the open state for free; the summary
 * takes the shared state layer and focus ring. No syntax highlighting.
 */
export function DetailSource({
  files,
  headingLevel,
  readme,
}: {
  files: SourceFile[];
  headingLevel: DetailHeadingLevel;
  readme: string;
}) {
  const sourceLevel = headingLevelNumber(headingLevel) + 1;

  return (
    <section
      aria-labelledby="source-heading"
      className="grid min-w-0 grid-cols-1 gap-16"
      data-testid="journal-source"
    >
      <LevelHeading
        className="text-body-medium text-on-surface-secondary"
        id="source-heading"
        level={sourceLevel}
      >
        Source
      </LevelHeading>
      <MarkdownContent
        body={readme}
        components={readmeComponents(sourceLevel)}
      />
      {files.length > 0 ? (
        <div className="grid grid-cols-1 gap-8">
          {files.map((file) => (
            <details
              className="rounded-[6px] bg-surface-raised"
              key={file.path}
            >
              <summary className="state-layer list-inside rounded-[6px] px-12 py-8 font-mono text-label-medium text-on-surface-primary">
                {file.path}
              </summary>
              <pre className="overflow-x-auto px-12 pb-12 pt-4 font-mono text-label-medium text-on-surface-primary">
                <code>{file.contents}</code>
              </pre>
            </details>
          ))}
        </div>
      ) : null}
    </section>
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
          case "source":
            return (
              <DetailSource
                files={block.files}
                headingLevel={headingLevel}
                key={`${block.type}-${index}`}
                readme={block.readme}
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
  const className = [
    "relative w-full overflow-hidden rounded-[6px]",
    variant === "gallery"
      ? "aspect-[704/401] sm:aspect-[340/401]"
      : "aspect-[704/401]",
  ].join(" ");
  const style = { backgroundColor: mediaToneColor(media.tone) };

  if (!media.src) {
    return <div aria-hidden="true" className={className} style={style} />;
  }

  const alt = media.alt?.trim();

  if (!alt) {
    throw new Error(`Detail media with src "${media.src}" requires alt text.`);
  }

  return (
    <div className={className} style={style}>
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

const headingTags = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;

/** A heading for a 1-based level, capped at h6. */
function LevelHeading({
  children,
  className,
  id,
  level,
}: {
  children?: ReactNode;
  className?: string;
  id?: string;
  level: number;
}) {
  const Tag = headingTags[Math.min(level, headingTags.length) - 1];

  return (
    <Tag className={className} id={id}>
      {children}
    </Tag>
  );
}

function headingLevelNumber(level: DetailHeadingLevel) {
  return Number(level.slice(1));
}

/**
 * A README is written as its own document, so its `# Title` would become a
 * second h1 on the page. Nest its headings under the "Source" heading instead,
 * one level per README level, capped at h6.
 */
function readmeComponents(sourceLevel: number): Components {
  const nested = (readmeLevel: number) =>
    function ReadmeHeading({ children }: { children?: ReactNode }) {
      return (
        <LevelHeading
          className="text-body-medium"
          level={sourceLevel + readmeLevel}
        >
          {children}
        </LevelHeading>
      );
    };

  return {
    ...markdownComponents,
    h1: nested(1),
    h2: nested(2),
    h3: nested(3),
    h4: nested(4),
    h5: nested(5),
    h6: nested(6),
  };
}

function MarkdownContent({
  body,
  components = markdownComponents,
}: {
  body: string;
  components?: Components;
}) {
  return (
    <div className="grid gap-4 text-body-small text-on-surface-secondary">
      <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
        {body}
      </ReactMarkdown>
    </div>
  );
}
