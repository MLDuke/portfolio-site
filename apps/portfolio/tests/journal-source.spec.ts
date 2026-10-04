import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * The e2e suite builds its journal from tests/fixtures/sketchbook (see
 * JOURNAL_SOURCE_ROOT in playwright.config.ts), so /journal/source-fixture is a
 * published `code` entry with a README and three source files.
 */
const route = "/journal/source-fixture";

async function outlineOf(locator: Locator) {
  return locator.evaluate((element) => {
    const style = window.getComputedStyle(element);

    return {
      offset: style.outlineOffset,
      style: style.outlineStyle,
      width: style.outlineWidth,
    };
  });
}

async function tabTo(page: Page, locator: Locator, limit = 25) {
  for (let step = 0; step < limit; step += 1) {
    if (await locator.evaluate((element) => element === document.activeElement)) {
      return;
    }

    await page.keyboard.press("Tab");
  }

  throw new Error("Never reached the target control by tabbing.");
}

test.describe("journal entry source", () => {
  test("renders the README as markdown under a single page heading", async ({
    page,
  }) => {
    await page.goto(route);

    const source = page.getByTestId("journal-source");

    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(
      page.getByRole("heading", { level: 1, name: "Source fixture" }),
    ).toBeVisible();

    // The README's own `# Counter sketch` is nested under "Source", not a
    // second h1, and its Markdown is rendered rather than shown raw.
    await expect(
      source.getByRole("heading", { level: 2, name: "Source" }),
    ).toBeVisible();
    await expect(
      source.getByRole("heading", { level: 3, name: "Counter sketch" }),
    ).toBeVisible();
    await expect(
      source.getByRole("heading", { level: 4, name: "Usage" }),
    ).toBeVisible();
    await expect(source.locator("strong")).toHaveText("frames");
    await expect(source.getByRole("listitem")).toHaveCount(2);
  });

  test("keeps visitors on the site: no link out to GitHub", async ({ page }) => {
    await page.goto(route);

    await expect(page.getByRole("link", { name: /source readme/i })).toHaveCount(
      0,
    );
    await expect(page.locator('a[href*="github.com"]')).toHaveCount(0);
  });

  test("lists source files by path, without tests or binaries", async ({
    page,
  }) => {
    await page.goto(route);

    const summaries = page.getByTestId("journal-source").locator("summary");

    await expect(summaries).toHaveText([
      "lib/helpers.ts",
      "sketch.ts",
      "styles.css",
    ]);
    await expect(page.getByText("sketch.test.ts")).toHaveCount(0);
    await expect(page.getByText("logo.png")).toHaveCount(0);
  });

  test("a file expands to its contents in a monospaced pre/code", async ({
    page,
  }) => {
    await page.goto(route);

    const details = page.locator("details", {
      has: page.locator("summary", { hasText: "sketch.ts" }),
    });
    const code = details.locator("pre > code");

    await expect(details).not.toHaveAttribute("open", "");
    await expect(code).toBeHidden();

    await details.locator("summary").click();

    await expect(details).toHaveAttribute("open", "");
    await expect(code).toBeVisible();
    await expect(code).toContainText("export function tick(frame: number)");
    expect(
      await code.evaluate((element) => getComputedStyle(element).fontFamily),
    ).toMatch(/mono/i);
  });

  test("summaries toggle from the keyboard and show the shared focus ring", async ({
    page,
  }) => {
    await page.goto(route);

    const summary = page.locator("summary", { hasText: "lib/helpers.ts" });
    const details = page.locator("details", { has: summary });
    const code = details.locator("pre > code");

    // No ring until the keyboard puts focus there.
    expect((await outlineOf(summary)).style).toBe("none");

    await tabTo(page, summary);

    const outline = await outlineOf(summary);
    expect(outline.style).toBe("solid");
    expect(outline.width).toBe("2px");
    expect(outline.offset).toBe("2px");

    await page.keyboard.press("Enter");
    await expect(details).toHaveAttribute("open", "");
    await expect(code).toBeVisible();
    await expect(code).toContainText("FRAME_RATE");

    await page.keyboard.press("Space");
    await expect(details).not.toHaveAttribute("open", "");
    await expect(code).toBeHidden();

    await page.keyboard.press("Space");
    await expect(details).toHaveAttribute("open", "");
    await expect(summary).toBeFocused();
  });

  test("a long line scrolls inside its own box instead of widening the page", async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width: 320 });
    await page.goto(route);

    for (const summary of await page.locator("summary").all()) {
      await summary.click();
    }

    const pre = page.locator("pre", { hasText: "deliberately long line" });
    await expect(pre).toBeVisible();

    const { clientWidth, scrollWidth } = await pre.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(scrollWidth).toBeGreaterThan(clientWidth);

    const pageScroll = await page.evaluate(() => {
      window.scrollTo(1_000_000, window.scrollY);
      return window.scrollX;
    });
    expect(pageScroll).toBe(0);
  });

  test("a summary takes the shared hover state layer", async ({ page }) => {
    await page.goto(route);

    const summary = page.locator("summary", { hasText: "sketch.ts" });
    const hoverLayer = () =>
      summary.evaluate(
        (element) => getComputedStyle(element, "::after").backgroundColor,
      );

    expect(await hoverLayer()).toBe("rgba(0, 0, 0, 0)");

    await summary.hover();

    await expect.poll(hoverLayer).not.toBe("rgba(0, 0, 0, 0)");
  });
});
