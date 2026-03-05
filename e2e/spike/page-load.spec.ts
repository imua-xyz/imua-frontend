import { test, expect } from "@playwright/test";
import { setupGraphQLMocks } from "../setup/graphql-mocks";
import { setupRPCProxy } from "../setup/rpc-proxy";

test.describe("Spike: Staking page loads correctly", () => {
  test.beforeEach(async ({ page }) => {
    await setupGraphQLMocks(page);
    await setupRPCProxy(page);
  });

  test("staking page renders and shows connect prompt", async ({ page }) => {
    await page.goto("/staking");

    // Verify the staking card header renders
    await expect(
      page.getByRole("heading", { name: "Stake Assets" }),
    ).toBeVisible({ timeout: 15000 });

    // Verify imETH is the default selected token (in the selector button)
    await expect(
      page.getByRole("button", { name: /imETH/ }),
    ).toBeVisible();

    // Verify the connect wallet prompt
    await expect(page.getByText("Connect to Start Staking")).toBeVisible();
  });

  test("token selector opens and shows all tokens", async ({ page }) => {
    await page.goto("/staking");
    await expect(
      page.getByRole("heading", { name: "Stake Assets" }),
    ).toBeVisible({ timeout: 15000 });

    // Click the token selector button (the one with imETH + chevron)
    await page.getByRole("button", { name: /imETH/ }).click();

    // Token selector modal should open
    await expect(page.getByText("Select a token")).toBeVisible();

    // All tokens should be listed
    await expect(page.getByText("Imua Ethereum")).toBeVisible();
    await expect(page.getByText("Wrapped Staked Ether")).toBeVisible();
    await expect(page.getByText("XRP").first()).toBeVisible();
  });

  test("landing page loads with navigation cards", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Welcome to IMUA")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("Get started")).toBeVisible();
    await expect(page.getByText("View dashboard")).toBeVisible();
  });

  test("navigates from landing to staking", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Welcome to IMUA")).toBeVisible({
      timeout: 15000,
    });

    // Click the staking card
    await page.getByText("Get started").click();

    // Should navigate to staking page
    await expect(page).toHaveURL(/\/staking/);
    await expect(
      page.getByRole("heading", { name: "Stake Assets" }),
    ).toBeVisible({ timeout: 15000 });
  });
});
