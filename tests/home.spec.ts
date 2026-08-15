import { expect, test } from "@playwright/test";

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
