"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";

type SiteLinkProps = ComponentProps<typeof Link> & {
  transitionTypes?: string[];
};

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void | Promise<void>) => {
    finished: Promise<void>;
  };
};

const transitionAttribute = "sitePageTransition";

function setTransitionMode(mode: "fallback" | "native") {
  document.documentElement.dataset[transitionAttribute] = mode;
}

function clearTransitionMode(mode: "fallback" | "native") {
  if (document.documentElement.dataset[transitionAttribute] === mode) {
    delete document.documentElement.dataset[transitionAttribute];
  }
}

function isModifiedEvent(event: MouseEvent<HTMLAnchorElement>) {
  return (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  );
}

function isLocalHref(href: SiteLinkProps["href"]) {
  if (typeof href !== "string") {
    return false;
  }

  return href.startsWith("/") && !href.startsWith("//");
}

function waitForNavigation(targetHref: string) {
  const targetUrl = new URL(targetHref, window.location.href);

  return new Promise<void>((resolve) => {
    const observer = new MutationObserver(() => {
      if (window.location.href === targetUrl.href) {
        observer.disconnect();
        clearTimeout(timeoutId);
        resolve();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    const timeoutId = setTimeout(() => {
      observer.disconnect();
      resolve();
    }, 10_000);
  });
}

export function SiteLink({
  href,
  onClick,
  target,
  transitionTypes,
  ...props
}: SiteLinkProps) {
  const router = useRouter();

  return (
    <Link
      href={href}
      onClick={(event) => {
        onClick?.(event);

        if (
          event.defaultPrevented ||
          isModifiedEvent(event) ||
          (target && target !== "_self") ||
          !transitionTypes?.includes("site-page") ||
          !isLocalHref(href) ||
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
          return;
        }

        const viewTransitionDocument = document as ViewTransitionDocument;
        const targetUrl = new URL(href as string, window.location.href);

        if (targetUrl.href === window.location.href) {
          return;
        }

        event.preventDefault();

        if (!viewTransitionDocument.startViewTransition) {
          setTransitionMode("fallback");
          router.push(href as string);
          window.setTimeout(() => clearTransitionMode("fallback"), 260);
          return;
        }

        setTransitionMode("native");
        const transition = viewTransitionDocument.startViewTransition(async () => {
          const navigation = waitForNavigation(targetUrl.href);
          router.push(href as string);
          await navigation;
        });
        void transition.finished.then(
          () => clearTransitionMode("native"),
          () => clearTransitionMode("native"),
        );
      }}
      target={target}
      {...props}
    />
  );
}
