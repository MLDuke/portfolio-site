import { SiteLink } from "./SiteLink";

type FigureCardProps = {
  href?: string;
  index: string;
  state?: "rest" | "hover" | "pressed" | "focused" | "disabled";
  title: string;
  variant?: "project" | "journal";
};

export function FigureCard({
  href,
  index,
  state = "rest",
  title,
  variant = "project",
}: FigureCardProps) {
  const imageHeight = variant === "project" ? "h-[401px]" : "h-[calc(100%-36px)]";
  const isDisabled = state === "disabled";
  const hasExpandedImageRadius =
    state === "pressed" || state === "focused" || state === "disabled";
  const stateNodeIds = {
    rest: "21:2067",
    hover: "21:2173",
    pressed: "21:2132",
    focused: "21:2138",
    disabled: "21:2144",
  };
  const stateClasses = {
    rest: "bg-surface-base",
    hover: "bg-[var(--state-layer-hover)]",
    pressed: "bg-[var(--state-layer-pressed)]",
    focused: "bg-surface-base ring-2 ring-inset ring-[var(--focus-ring-color)]",
    disabled: "bg-surface-base cursor-default opacity-[var(--content-disabled)]",
  };
  const rootClassName = [
    "group flex h-full w-full flex-col gap-12 overflow-hidden rounded-b-[12px] rounded-t-[8px] p-6 text-left touch-manipulation",
    "motion-safe:transition-[background-color,scale,box-shadow] motion-safe:duration-150 motion-safe:ease-out",
    "hover:bg-[var(--state-layer-hover)] active:bg-[var(--state-layer-pressed)] motion-safe:active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring-color)]",
    isDisabled ? "pointer-events-none" : "cursor-pointer",
    stateClasses[state],
  ].join(" ");
  const frame = (
    <>
      <div className="flex items-center gap-10 text-on-surface-secondary">
        <h2 className="min-w-0 flex-1 truncate text-body-medium">{title}</h2>
        <p className="shrink-0 whitespace-nowrap font-mono text-label-medium font-normal">
          {index}
        </p>
      </div>
      <div
        className={[
          imageHeight,
          "w-full shrink-0 bg-[#808080] motion-safe:transition-[border-radius] motion-safe:duration-150 motion-safe:ease-out",
          hasExpandedImageRadius ? "rounded-md" : "rounded-[6px]",
          "group-active:rounded-md group-focus-visible:rounded-md",
        ].join(" ")}
      />
    </>
  );

  if (href && !isDisabled) {
    return (
      <SiteLink
        className={rootClassName}
        data-figma-component="Figure"
        data-node-id={stateNodeIds[state]}
        data-state={state}
        href={href}
        transitionTypes={["site-page"]}
      >
        {frame}
      </SiteLink>
    );
  }

  return (
    <button
      className={rootClassName}
      data-figma-component="Figure"
      data-node-id={stateNodeIds[state]}
      data-state={state}
      disabled={isDisabled}
      type="button"
    >
      {frame}
    </button>
  );
}
