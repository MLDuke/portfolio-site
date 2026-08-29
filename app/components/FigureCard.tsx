import type { InteractionState } from "./interactionState";
import { SiteLink } from "./SiteLink";

type FigureCardProps = {
  href?: string;
  index: string;
  state?: InteractionState;
  title: string;
  variant?: "project" | "journal";
};

const stateNodeIds: Record<InteractionState, string> = {
  rest: "21:2067",
  hover: "21:2173",
  pressed: "21:2132",
  focused: "21:2138",
  disabled: "21:2144",
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
  // The card is large enough that the shared state layer alone reads as flat, so
  // it keeps one extra affordance: the image corner opens up on press and focus.
  const hasExpandedImageRadius = state === "pressed" || state === "focused";
  const rootClassName = [
    "state-layer pressable group flex h-full w-full flex-col gap-12 rounded-b-[12px] rounded-t-[8px] bg-surface-base p-6 text-left",
    isDisabled ? "" : "cursor-pointer",
  ]
    .filter(Boolean)
    .join(" ");
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
          "w-full shrink-0 bg-[#808080] motion-safe:transition-[border-radius] motion-safe:duration-[var(--interaction-duration)] motion-safe:ease-[var(--interaction-easing)]",
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
