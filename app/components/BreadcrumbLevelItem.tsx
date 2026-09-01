"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { BreadcrumbLevel } from "../data/pageControl";
import { SiteLink } from "./SiteLink";

const panelClassName = [
  "breadcrumb-panel invisible absolute left-1/2 top-full z-30 min-w-max -translate-x-1/2 -translate-y-4 pt-6 opacity-0 blur-[4px]",
  "transition-[opacity,translate,filter,visibility] duration-150 ease-out",
  "group-data-[open=true]:visible group-data-[open=true]:translate-y-0",
  "group-data-[open=true]:opacity-100 group-data-[open=true]:blur-[0px]",
  "group-data-[open=true]:duration-200",
].join(" ");

export function BreadcrumbLevelItem({
  isCurrent,
  level,
}: {
  isCurrent: boolean;
  level: BreadcrumbLevel;
}) {
  const options = level.options ?? [];
  const hasOptions = options.length > 0;
  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const isOpen = hasOptions && (isPinned || isHovered);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const close = () => {
      setIsPinned(false);
      setIsHovered(false);
    };
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        close();
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      // Only pull focus back when it is already inside this level, so escaping
      // a panel that merely happens to be hovered cannot steal focus.
      const holdsFocus = containerRef.current?.contains(document.activeElement);

      close();

      if (holdsFocus) {
        toggleRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <>
      <div
        className="group relative flex min-w-0 items-center justify-center"
        data-open={isOpen ? "true" : undefined}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setIsPinned(false);
          }
        }}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") {
            setIsHovered(true);
          }
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") {
            setIsHovered(false);
          }
        }}
        ref={containerRef}
      >
        <SiteLink
          aria-current={isCurrent ? "page" : undefined}
          className="state-layer pressable flex min-w-0 items-center justify-center rounded-sm px-4 py-2 text-on-surface-primary"
          href={level.href}
          transitionTypes={["site-page"]}
        >
          <span className="truncate whitespace-nowrap">{level.label}</span>
        </SiteLink>

        {hasOptions ? (
          <>
            <button
              aria-controls={panelId}
              aria-expanded={isOpen}
              aria-label={`Show ${level.label} options`}
              className="state-layer pressable flex h-28 w-28 shrink-0 items-center justify-center rounded-sm text-on-surface-primary"
              onClick={() => setIsPinned((pinned) => !pinned)}
              ref={toggleRef}
              type="button"
            >
              <svg
                aria-hidden="true"
                className="breadcrumb-chevron h-16 w-16 motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out group-data-[open=true]:rotate-180"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                viewBox="0 0 16 16"
              >
                <path d="m4 6 4 4 4-4" />
              </svg>
            </button>

            <div className={panelClassName} id={panelId}>
              <div className="rounded-[6px] bg-surface-raised p-2 shadow-overlay">
                <div className="grid max-h-[min(360px,calc(100vh-96px))] min-w-160 overflow-y-auto">
                  {options.map((option) => (
                    <SiteLink
                      aria-current={option.active ? "page" : undefined}
                      className="state-layer pressable rounded-sm px-8 py-4 text-on-surface-primary whitespace-nowrap"
                      data-selected={option.active ? "true" : undefined}
                      href={option.href}
                      key={option.href}
                      onClick={() => {
                        setIsPinned(false);
                        setIsHovered(false);
                      }}
                      transitionTypes={["site-page"]}
                    >
                      {option.label}
                    </SiteLink>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {!isCurrent ? (
        <span
          aria-hidden="true"
          className="flex shrink-0 items-center justify-center px-4 py-2"
        >
          /
        </span>
      ) : null}
    </>
  );
}
