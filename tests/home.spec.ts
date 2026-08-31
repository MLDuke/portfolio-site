import { expect, test, type Locator } from "@playwright/test";

function fontSizeOf(locator: Locator) {
  return locator.evaluate((element) =>
    Number.parseFloat(window.getComputedStyle(element).fontSize),
  );
}

test("home page renders portfolio navigation and project links", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Matthew Duke Design/);
  await expect(page.getByRole("link", { name: "Projects" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Journal" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Information" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Project Name" }).first()).toBeVisible();
});

test.describe("portfolio page shell", () => {
  const routes = [
    "/",
    "/journal",
    "/journal/entry-1",
    "/projects/project-name",
  ] as const;
  const viewports = [
    { height: 568, name: "extra-small mobile", width: 280 },
    { height: 640, name: "small mobile", width: 320 },
    { height: 667, name: "narrow mobile", width: 375 },
    { height: 844, name: "mobile", width: 390 },
    { height: 1024, name: "below tablet breakpoint", width: 767 },
    { height: 1024, name: "tablet", width: 768 },
    { height: 900, name: "below desktop header breakpoint", width: 1279 },
    { height: 900, name: "desktop header breakpoint", width: 1280 },
    { height: 900, name: "desktop", width: 1440 },
  ] as const;

  test("reserves stable scrollbar gutter globally", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("html")).toHaveCSS(
      "scrollbar-gutter",
      "stable",
    );
  });

  for (const route of routes) {
    test(`${route} renders one main landmark and footer`, async ({ page }) => {
      await page.goto(route);

      await expect(page.getByRole("main")).toHaveCount(1);
      await expect(page.locator("#main-content")).toHaveCount(1);
      await expect(page.getByText("Made by Matthew Duke")).toBeVisible();
    });
  }

  for (const route of routes) {
    test(`${route} reflows with 200% text sizing`, async ({ page }) => {
      await page.setViewportSize({ height: 900, width: 320 });
      await page.goto(route);

      // The type scale has to be rem-based for this to test anything: with a px
      // scale the page never resizes and the reflow assertion below passes
      // vacuously.
      const label = page
        .getByRole("navigation", { name: "Primary navigation" })
        .getByRole("link", { name: "Projects" });
      const restingSize = await fontSizeOf(label);

      await page.addStyleTag({
        content: "html { font-size: 200% !important; }",
      });

      expect(await fontSizeOf(label)).toBeCloseTo(restingSize * 2, 1);

      const horizontalScroll = await page.evaluate(() => {
        window.scrollTo(1_000_000, window.scrollY);
        return window.scrollX;
      });

      expect(horizontalScroll).toBe(0);
      await expect(
        page.getByRole("navigation", { name: "Primary navigation" }),
      ).toBeVisible();
    });
  }

  for (const viewport of viewports) {
    for (const route of routes) {
      test(`${route} has no horizontal overflow at ${viewport.name}`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport);
        await page.goto(route);

        const horizontalScroll = await page.evaluate(() => {
          window.scrollTo(1_000_000, window.scrollY);
          const scrollPosition = window.scrollX;
          window.scrollTo(0, window.scrollY);

          return scrollPosition;
        });

        expect(horizontalScroll).toBe(0);
      });
    }
  }

  test("primary navigation exposes the active route", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Projects" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await page.goto("/journal");
    await expect(page.getByRole("link", { name: "Journal" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("project breadcrumb control follows the desktop breakpoint", async ({
    page,
  }) => {
    await page.setViewportSize({ height: 844, width: 390 });
    await page.goto("/projects/project-name");
    await expect(
      page.getByRole("navigation", { name: "Project navigation" }),
    ).toBeHidden();

    await page.setViewportSize({ height: 1024, width: 768 });
    await expect(
      page.getByRole("navigation", { name: "Project navigation" }),
    ).toBeVisible();
  });

  test("project breadcrumb control is centered in the header grid", async ({
    page,
  }) => {
    await page.setViewportSize({ height: 1080, width: 1920 });
    await page.goto("/projects/project-name");

    const centers = await page.evaluate(() => {
      const header = document.querySelector("header");
      const breadcrumb = document.querySelector(
        'header nav[aria-label="Project navigation"]',
      );

      if (!header || !breadcrumb) {
        throw new Error("Expected project header and breadcrumb navigation.");
      }

      const headerRect = header.getBoundingClientRect();
      const breadcrumbRect = breadcrumb.getBoundingClientRect();

      return {
        breadcrumbCenter: breadcrumbRect.left + breadcrumbRect.width / 2,
        headerCenter: headerRect.left + headerRect.width / 2,
      };
    });

    expect(
      Math.abs(centers.breadcrumbCenter - centers.headerCenter),
    ).toBeLessThanOrEqual(1);
  });

  test("information modal closes with escape and restores focus", async ({
    page,
  }) => {
    await page.goto("/");

    const informationButton = page.getByRole("button", { name: "Information" });
    await informationButton.click();

    await expect(page.getByRole("dialog", { name: "About" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "About" })).toBeHidden();
    await expect(informationButton).toBeFocused();
  });
});

test.describe("sandbox detail components", () => {
  test("lists each composable detail component", async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1280 });
    await page.goto("/sandbox#detail-template");

    const sandboxNav = page
      .locator("aside")
      .getByRole("navigation", { name: "Sandbox sections" });

    for (const label of [
      "Detail template",
      "Detail description",
      "Detail figure",
      "Detail gallery",
      "Detail text block",
      "Detail block renderer",
    ]) {
      await expect(sandboxNav.getByRole("link", { name: label })).toBeVisible();
    }
  });

  test("renders the detail figure caption variants", async ({ page }) => {
    await page.goto("/sandbox#detail-figure");

    await expect(
      page.getByRole("heading", { level: 1, name: "Detail figure" }),
    ).toBeVisible();
    await expect(
      page.locator('[data-figma-component="Figure"]'),
    ).toHaveCount(2);
    await expect(page.getByText("Caption", { exact: true })).toBeVisible();
    await expect(page.getByText("Hidden caption")).toHaveCount(0);
  });

  test("keeps a single h1 on pages that embed a detail description", async ({
    page,
  }) => {
    for (const pageId of [
      "detail-description",
      "detail-template",
      "detail-block-renderer",
    ]) {
      await page.goto(`/sandbox#${pageId}`);

      await expect(page.locator("h1")).toHaveCount(1);
    }
  });

  test("renders the two-up detail gallery", async ({ page }) => {
    await page.goto("/sandbox#detail-gallery");

    await expect(
      page.getByRole("heading", { level: 1, name: "Detail gallery" }),
    ).toBeVisible();
    await expect(
      page.locator(
        '[data-figma-component="Gallery"] [data-figma-component="Figure"]',
      ),
    ).toHaveCount(2);
    await expect(page.getByText("Caption", { exact: true })).toBeVisible();
    await expect(page.getByText("Hidden caption")).toHaveCount(0);
  });
});

test.describe("theme tokens", () => {
  /**
   * Tailwind inlines @theme shadow values into the generated utility, so a
   * theme-switched shadow only works while `@theme` aliases `--shadow-*` to a
   * differently named var. Naming the theme token `--shadow-*` compiles cleanly
   * and silently leaves dark mode on the light shadows, which is exactly why
   * this is asserted rather than eyeballed.
   */
  for (const name of ["raised", "overlay"] as const) {
    test(`${name} elevation follows the theme`, async ({ page }) => {
      await page.goto("/sandbox#elevation");

      const specimen = page.getByTestId(`elevation-${name}`);
      const light = await specimen.evaluate(
        (element) => window.getComputedStyle(element).boxShadow,
      );

      await page
        .getByRole("button", { name: "Switch sandbox to dark theme" })
        .filter({ visible: true })
        .first()
        .click();

      const dark = await specimen.evaluate(
        (element) => window.getComputedStyle(element).boxShadow,
      );

      expect(light).not.toBe("none");
      expect(dark).not.toBe("none");
      expect(dark).not.toBe(light);
    });
  }
});
