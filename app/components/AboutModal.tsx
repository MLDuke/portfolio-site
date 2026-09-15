"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { aboutLinksIn } from "../data/portfolio";
import { useDismissable } from "./useDismissable";

type AboutModalProps = {
  onClose: () => void;
};

export function AboutModal({ onClose }: AboutModalProps) {
  const [isClosing, setIsClosing] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  // Guarded by a ref rather than the isClosing state so the timer is scheduled
  // exactly once: a state updater can run twice under StrictMode.
  const close = useCallback(() => {
    if (closeTimeoutRef.current) {
      return;
    }

    setIsClosing(true);

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    closeTimeoutRef.current = setTimeout(onClose, reduceMotion ? 0 : 150);
  }, [onClose]);

  useEffect(() => {
    previousActiveElementRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    closeButtonRef.current?.focus({ preventScroll: true });

    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }

      previousActiveElementRef.current?.focus();
    };
  }, []);

  // The dialog is `fixed inset-0`, so "outside" is never reachable — this is
  // the Escape half of the contract, shared with the breadcrumb panels.
  useDismissable({ containerRef: dialogRef, isOpen: true, onDismiss: close });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])',
        ),
      );

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <div
      aria-labelledby={titleId}
      aria-modal="true"
      className={[
        "fixed inset-0 z-50 flex items-start justify-center px-16 pt-72",
      ].join(" ")}
      role="dialog"
      ref={dialogRef}
      tabIndex={-1}
    >
      <button
        aria-label="Close information modal"
        className={[
          "modal-backdrop absolute inset-0 cursor-default",
          isClosing ? "modal-backdrop-closing" : "modal-backdrop-entering",
        ].join(" ")}
        onClick={close}
        tabIndex={-1}
        type="button"
      />
      <div
        className={[
          "modal-surface relative grid w-full max-w-[600px] grid-cols-[minmax(0,0.5fr)_minmax(0,1fr)] gap-x-16 overflow-hidden rounded-[2px] bg-[#232e39] px-20 py-24 text-body-medium text-[#f9fcff] shadow-overlay",
          isClosing ? "modal-shell-closing" : "modal-shell-entering",
        ].join(" ")}
      >
        <button
          className="state-layer pressable absolute right-8 top-8 rounded-sm px-8 py-4 font-mono text-label-small text-[#f9fcff]"
          onClick={close}
          ref={closeButtonRef}
          type="button"
        >
          Close
        </button>
        <h2 className="row-span-2 pr-56 text-body-medium" id={titleId}>
          About
        </h2>
        <p className="row-span-2 text-[#d9dfe7]">
          About me description in lorem ipsum dolor sitAbout me description in
          lorem ipsum dolor sitAbout me description in lorem ipsum dolor
          sitAbout me description in lorem ipsum dolor sitAbout me description
          in lorem ipsum dolor sitAbout me description in lorem ipsum dolor sit
        </p>

        <div className="col-span-2 h-64" />

        <p>Connect</p>
        <div className="grid gap-16 text-[#d9dfe7]">
          {aboutLinksIn("connect").map((link) => (
            <a
              className="focus-ring rounded-sm underline underline-offset-2"
              href={link.href}
              key={link.label}
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="col-span-2 h-64" />

        <p>Contact</p>
        <div className="grid gap-16 text-[#d9dfe7]">
          {aboutLinksIn("contact").map((link) => (
            <a
              className="focus-ring rounded-sm underline underline-offset-2"
              href={link.href}
              key={link.label}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
