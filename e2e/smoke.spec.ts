import { test, expect } from "@playwright/test";

test.describe("Smoke", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("staking page loads", async ({ page }) => {
    await page.goto("/staking");
    await expect(page).toHaveURL(/\/staking/);
    await expect(page.locator("body")).toBeVisible();
  });
});
