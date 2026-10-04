"use client";

import { useEffect, type RefObject } from "react";

type DismissableOptions = {
  /** The element that counts as "inside". Presses outside it dismiss. */
  containerRef: RefObject<HTMLElement | null>;
  isOpen: boolean;
  onDismiss: () => void;
  /** Focus lands here on Escape, but only if it was already inside. */
  triggerRef?: RefObject<HTMLElement | null>;
};

/**
 * Escape and outside-press dismissal for anything that opens over the page.
 *
 * The focus rule is the subtle part: Escape only pulls focus back to the
 * trigger when focus is already inside the container, so escaping a panel that
 * merely happens to be hovered cannot steal focus from elsewhere on the page.
 *
 * Listeners are only attached while open, so a closed panel costs nothing.
 */
export function useDismissable({
  containerRef,
  isOpen,
  onDismiss,
  triggerRef,
}: DismissableOptions) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const dismissOnOutsidePointer = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        onDismiss();
      }
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      const holdsFocus = containerRef.current?.contains(document.activeElement);

      onDismiss();

      if (holdsFocus) {
        triggerRef?.current?.focus();
      }
    };

    document.addEventListener("pointerdown", dismissOnOutsidePointer);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOnOutsidePointer);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [containerRef, isOpen, onDismiss, triggerRef]);
}
