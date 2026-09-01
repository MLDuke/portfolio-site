export type BreadcrumbOption = {
  active?: boolean;
  href: string;
  label: string;
};

export type BreadcrumbLevel = {
  href: string;
  label: string;
  options?: BreadcrumbOption[];
};

export type PageControlConfig = {
  ariaLabel: string;
  levels: BreadcrumbLevel[];
  nextHref: string;
  previousHref: string;
};

type PageControlItem = {
  slug: string;
  title: string;
};

type CollectionPageControlInput<TItem extends PageControlItem> = {
  ariaLabel: string;
  currentSlug: string | undefined;
  itemHref: (item: TItem) => string;
  items: readonly TItem[];
  root: {
    href: string;
    label: string;
  };
};

export function createCollectionPageControl<TItem extends PageControlItem>({
  ariaLabel,
  currentSlug,
  itemHref,
  items,
  root,
}: CollectionPageControlInput<TItem>): PageControlConfig | null {
  const currentIndex = items.findIndex((item) => item.slug === currentSlug);

  if (currentIndex < 0) {
    return null;
  }

  const current = items[currentIndex];
  const previous = items[wrapIndex(currentIndex - 1, items.length)];
  const next = items[wrapIndex(currentIndex + 1, items.length)];

  return {
    ariaLabel,
    levels: [
      root,
      {
        href: itemHref(current),
        label: current.title,
        options: items.map((item) => ({
          active: item.slug === current.slug,
          href: itemHref(item),
          label: item.title,
        })),
      },
    ],
    nextHref: itemHref(next),
    previousHref: itemHref(previous),
  };
}

function wrapIndex(index: number, length: number) {
  return (index + length) % length;
}
