/**
 * The single vocabulary for interaction states across the design system.
 *
 * Live controls express these through real CSS states (`:hover`, `:active`,
 * `:focus-visible`, `:disabled`). Static design-system examples in `/sandbox`
 * express the same states through `data-state`, so both paths are styled by the
 * one set of rules in `app/globals.css`.
 */
export type InteractionState =
  | "rest"
  | "hover"
  | "pressed"
  | "focused"
  | "disabled";

/** `selected` is a resting state, so it can coexist with any of the above. */
export type ControlState = InteractionState | "selected";

export const interactionStates = [
  "rest",
  "hover",
  "pressed",
  "focused",
  "disabled",
] as const satisfies readonly InteractionState[];
