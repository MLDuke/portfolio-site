import { expect, test, type Locator, type Page } from "@playwright/test";

const TRANSPARENT = "rgba(0, 0, 0, 0)";

/**
 * The state layer lives on ::before (resting selected/current) and ::after
 * (transient hover/press), so every assertion here reads the pseudo-element
 * rather than the element's own background.
 */
function layerColor(locator: Locator, pseudo: "::before" | "::after") {
  return locator.evaluate(
    (element, selector) =>
      window.getComputedStyle(element, selector).backgroundColor,
    pseudo,
  );
}

function alphaOf(color: string) {
  const match = color.match(
    /rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(?:,\s*([\d.]+)\s*)?\)/,
  );

  if (!match) {
    throw new Error(`Expected an rgb(a) colour, received "${color}".`);
  }

  return match[1] === undefined ? 1 : Number(match[1]);
}

/** Waits out the 150ms state transition before reading a settled colour. */
async function settledAlpha(locator: Locator, pseudo: "::before" | "::after") {
  let previous = -1;

  await expect
    .poll(async () => {
      const current = alphaOf(await layerColor(locator, pseudo));
      const settled = current === previous;
      previous = current;

      return settled;
    })
    .toBe(true);

  return previous;
}

/** Waits out the open transition so geometry is read at its resting position. */
async function settledBox(locator: Locator) {
  let previous = Number.NaN;

  await expect
    .poll(async () => {
      const current = (await locator.boundingBox())?.y ?? Number.NaN;
      const settled = current === previous;
      previous = current;

      return settled;
    })
    .toBe(true);
}

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

/** Drops focus so a preceding mouse press cannot mask :focus-visible. */
async function blurActiveElement(page: Page) {
  await page.evaluate(() => {
    const active = document.activeElement;

    if (active instanceof HTMLElement) {
      active.blur();
    }
  });
}

/**
 * Resolves the panel a disclosure trigger owns. Every project fixture shares
 * the title "Project Name", so options cannot be addressed by their label.
 */
async function panelFor(page: Page, trigger: Locator) {
  const panelId = await trigger.getAttribute("aria-controls");
  expect(panelId).toBeTruthy();

  return page.locator(`[id="${panelId}"]`);
}

/** Tabs until the given control holds focus, so we exercise :focus-visible. */
async function tabTo(page: Page, locator: Locator, limit = 25) {
  for (let step = 0; step < limit; step += 1) {
    if (await locator.evaluate((element) => element === document.activeElement)) {
      return;
    }

    await page.keyboard.press("Tab");
  }

  throw new Error("Never reached the target control by tabbing.");
}

test.describe("global interaction pattern", () => {
  test("nav buttons express rest, hover, pressed, and current", async ({
    page,
  }) => {
    await page.goto("/");

    const current = page.getByRole("link", { name: "Work" });
    const resting = page.getByRole("link", { name: "Journal" });

    // Current page: the resting selected layer, and nothing transient.
    await expect(current).toHaveAttribute("aria-current", "page");
    const selectedAlpha = await settledAlpha(current, "::before");
    expect(selectedAlpha).toBeGreaterThan(0);
    expect(await layerColor(current, "::after")).toBe(TRANSPARENT);

    // Rest: no layer at all.
    expect(await layerColor(resting, "::before")).toBe(TRANSPARENT);
    expect(await layerColor(resting, "::after")).toBe(TRANSPARENT);

    await resting.hover();
    const hoverAlpha = await settledAlpha(resting, "::after");
    expect(hoverAlpha).toBeGreaterThan(0);

    // Pressed wins over hover for as long as the pointer is down.
    await page.mouse.down();
    const pressedAlpha = await settledAlpha(resting, "::after");
    expect(pressedAlpha).toBeGreaterThan(hoverAlpha);

    // Release away from the link so no navigation is triggered.
    await page.mouse.move(0, 0);
    await page.mouse.up();

    // Selected outranks a plain hover as the resting state.
    expect(selectedAlpha).toBeGreaterThan(hoverAlpha);
  });

  test("hovering the current nav button composites over its selected layer", async ({
    page,
  }) => {
    await page.goto("/");

    const current = page.getByRole("link", { name: "Work" });
    await current.hover();

    // ::before keeps the selected state while ::after adds hover on top.
    expect(await settledAlpha(current, "::before")).toBeGreaterThan(0);
    expect(await settledAlpha(current, "::after")).toBeGreaterThan(0);
  });

  test("nav buttons take the shared focus ring on keyboard focus only", async ({
    page,
  }) => {
    await page.goto("/");

    const journal = page.getByRole("link", { name: "Journal" });

    expect((await outlineOf(journal)).style).toBe("none");

    await tabTo(page, journal);

    const outline = await outlineOf(journal);
    expect(outline.style).toBe("solid");
    expect(outline.width).toBe("2px");
    expect(outline.offset).toBe("2px");
  });

  test("figure cards hover, press, and focus through the same layer", async ({
    page,
  }) => {
    await page.goto("/");

    const card = page.getByRole("link", { name: /Project Name/ }).first();

    expect(await layerColor(card, "::after")).toBe(TRANSPARENT);

    await card.hover();
    const hoverAlpha = await settledAlpha(card, "::after");
    expect(hoverAlpha).toBeGreaterThan(0);

    await page.mouse.down();
    expect(await settledAlpha(card, "::after")).toBeGreaterThan(hoverAlpha);
    await page.mouse.move(0, 0);
    await page.mouse.up();
    await blurActiveElement(page);

    await tabTo(page, card);
    const outline = await outlineOf(card);
    expect(outline.style).toBe("solid");
    expect(outline.width).toBe("2px");
  });

  test("disabled controls suppress both layers and press feedback", async ({
    page,
  }) => {
    await page.goto("/sandbox#state-layer");

    const disabled = page
      .getByRole("button", { name: "Disabled", exact: true })
      .first();

    await expect(disabled).toBeDisabled();
    await disabled.hover({ force: true });

    expect(await layerColor(disabled, "::before")).toBe(TRANSPARENT);
    expect(await layerColor(disabled, "::after")).toBe(TRANSPARENT);
    await expect(disabled).toHaveCSS("opacity", "0.38");
    await expect(disabled).toHaveCSS("scale", "none");
  });

  test("a disabled preview is inert, not just dimmed", async ({ page }) => {
    await page.goto("/sandbox#state-layer");

    // IconButton normally renders a link, and a link cannot be disabled — the
    // preview has to fall back to a real button or it stays clickable.
    const icon = page.getByRole("button", {
      name: "Previous item, disabled state",
    });

    await expect(icon).toBeDisabled();
    await expect(icon).toHaveJSProperty("tagName", "BUTTON");

    await icon.focus();
    await expect(icon).not.toBeFocused();
  });

  test("static data-state previews match their live counterparts", async ({
    page,
  }) => {
    await page.goto("/sandbox#state-layer");

    const live = page.getByRole("button", { name: "Rest", exact: true }).first();
    const hovered = page
      .getByRole("button", { name: "Hover", exact: true })
      .first();
    const pressed = page
      .getByRole("button", { name: "Pressed", exact: true })
      .first();

    await live.hover();
    const liveHoverAlpha = await settledAlpha(live, "::after");

    // Move the pointer off the specimens before reading the static states.
    await page.mouse.move(0, 0);

    expect(await settledAlpha(hovered, "::after")).toBe(liveHoverAlpha);
    expect(await settledAlpha(pressed, "::after")).toBeGreaterThan(
      liveHoverAlpha,
    );
  });

  test("state layers invert with the theme", async ({ page }) => {
    await page.goto("/sandbox#state-layer");

    const lightCurrent = page
      .getByTestId("theme-specimen-light")
      .getByRole("button", { name: "Current" });
    const darkCurrent = page
      .getByTestId("theme-specimen-dark")
      .getByRole("button", { name: "Current" });

    await expect(lightCurrent).toBeVisible();
    await expect(darkCurrent).toBeVisible();

    const lightLayer = await layerColor(lightCurrent, "::before");
    const darkLayer = await layerColor(darkCurrent, "::before");

    // Same alpha, opposite tint.
    expect(alphaOf(lightLayer)).toBe(alphaOf(darkLayer));
    expect(lightLayer).not.toBe(darkLayer);
    expect(lightLayer).toContain("0, 6, 17");
    expect(darkLayer).toContain("249, 252, 255");
  });
});

test.describe("breadcrumb dropdown", () => {
  const triggerName = "Project Name navigation";

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1440 });
    await page.goto("/projects/project-name");
  });

  test("opens on hover and closes when the pointer leaves", async ({ page }) => {
    const trigger = page.getByRole("button", { name: triggerName });
    const panel = await panelFor(page, trigger);

    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(panel).toBeHidden();

    await trigger.hover();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(panel).toBeVisible();

    await page.mouse.move(0, 0);
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(panel).toBeHidden();
  });

  test("opens from the keyboard and restores focus on Escape", async ({
    page,
  }) => {
    const trigger = page.getByRole("button", { name: triggerName });
    const panel = await panelFor(page, trigger);

    await tabTo(page, trigger);
    await page.keyboard.press("Enter");

    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(panel).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(panel).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("opens with Space and reaches its options by tabbing", async ({
    page,
  }) => {
    const trigger = page.getByRole("button", { name: triggerName });
    const panel = await panelFor(page, trigger);

    await tabTo(page, trigger);
    await page.keyboard.press("Space");
    await expect(panel).toBeVisible();

    await page.keyboard.press("Tab");

    const focusMovedIntoPanel = await panel.evaluate((element) =>
      element.contains(document.activeElement),
    );
    expect(focusMovedIntoPanel).toBe(true);
  });

  test("closes when focus leaves the level entirely", async ({ page }) => {
    const trigger = page.getByRole("button", { name: triggerName });
    const panel = await panelFor(page, trigger);

    await tabTo(page, trigger);
    await page.keyboard.press("Enter");
    await expect(panel).toBeVisible();

    await blurActiveElement(page);

    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(panel).toBeHidden();
  });

  test("closes on an outside pointer press", async ({ page }) => {
    const trigger = page.getByRole("button", { name: triggerName });
    const panel = await panelFor(page, trigger);

    await trigger.click();
    await expect(panel).toBeVisible();

    await page.mouse.click(5, 5);

    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(panel).toBeHidden();
  });

  test("a closed panel keeps its options out of the tab order", async ({
    page,
  }) => {
    const trigger = page.getByRole("button", { name: triggerName });
    const panel = await panelFor(page, trigger);

    await tabTo(page, trigger);
    await expect(panel).toBeHidden();

    // Dimming the panel with opacity alone would leave every option focusable
    // and duplicated in the accessibility tree, so the next tab stop has to
    // land outside it.
    await page.keyboard.press("Tab");

    const landedInAClosedPanel = await page.evaluate(() =>
      Boolean(document.activeElement?.closest(".breadcrumb-panel")),
    );
    expect(landedInAClosedPanel).toBe(false);
  });

  test("the hover bridge stays inside the gap above the panel", async ({
    page,
  }) => {
    const trigger = page.getByRole("button", { name: triggerName });
    const panel = await panelFor(page, trigger);

    await trigger.click();
    await expect(panel).toBeVisible();
    await settledBox(panel);

    // The bridge keeps hover alive across the gap between trigger and panel.
    // Reaching back over the trigger would put it above the button, because the
    // panel it lives in is z-40, and swallow presses on the button's bottom edge.
    const box = await trigger.boundingBox();

    if (!box) {
      throw new Error("Expected the breadcrumb trigger to be laid out.");
    }

    const topmost = await page.evaluate(
      (point) => document.elementFromPoint(point.x, point.y)?.tagName ?? "",
      { x: box.x + box.width / 2, y: box.y + box.height - 1 },
    );

    expect(topmost).toBe("BUTTON");
  });

  test("an open trigger reads as a resting selected state", async ({ page }) => {
    const trigger = page.getByRole("button", { name: triggerName });

    expect(await layerColor(trigger, "::before")).toBe(TRANSPARENT);

    await trigger.click();
    await page.mouse.move(0, 0);

    expect(await settledAlpha(trigger, "::before")).toBeGreaterThan(0);
  });
});

test.describe("information modal", () => {
  test("traps focus, closes on backdrop press, and restores focus", async ({
    page,
  }) => {
    await page.goto("/");

    const trigger = page.getByRole("button", { name: "Information" });
    await trigger.click();

    const dialog = page.getByRole("dialog", { name: "About" });
    await expect(dialog).toBeVisible();

    const close = page.getByRole("button", { name: "Close", exact: true });
    await expect(close).toBeFocused();

    // Cycling backwards from the first control wraps to the last.
    await page.keyboard.press("Shift+Tab");
    const wrapped = await page.evaluate(() =>
      document
        .querySelector('[role="dialog"]')
        ?.contains(document.activeElement),
    );
    expect(wrapped).toBe(true);

    await page.getByRole("button", { name: "Close information modal" }).click({
      force: true,
      position: { x: 5, y: 5 },
    });

    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("the close button uses the on-dark interaction tokens", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Information" }).click();

    const close = page.getByRole("button", { name: "Close", exact: true });
    await close.hover();

    // Light page theme, but the modal shell re-points the tokens light-on-dark.
    expect(await settledAlpha(close, "::after")).toBeGreaterThan(0);
    expect(await layerColor(close, "::after")).toContain("249, 252, 255");
  });
});

test.describe("reduced motion", () => {
  test("drops press scaling but keeps colour and focus feedback", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    const journal = page.getByRole("link", { name: "Journal" });

    await journal.hover();
    await page.mouse.down();

    await expect(journal).toHaveCSS("scale", "none");
    expect(await settledAlpha(journal, "::after")).toBeGreaterThan(0);

    await page.mouse.move(0, 0);
    await page.mouse.up();
    await blurActiveElement(page);

    await tabTo(page, journal);
    expect((await outlineOf(journal)).style).toBe("solid");
  });
});
