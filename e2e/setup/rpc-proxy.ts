import { Page } from "@playwright/test";

const ANVIL_URL = "http://localhost:8545";

/**
 * Intercepts EVM RPC requests to Alchemy/public endpoints
 * and proxies them to the local Anvil fork.
 * This ensures the app reads contract state from Anvil.
 */
export async function setupRPCProxy(page: Page): Promise<void> {
  await page.route(
    (url) => {
      const hostname = url.hostname;
      return (
        hostname.includes("alchemy.com") ||
        hostname.includes("exocore-restaking.com")
      );
    },
    async (route) => {
      const request = route.request();
      const postData = request.postData();

      // Only proxy JSON-RPC POST requests
      if (request.method() !== "POST" || !postData) {
        return route.abort();
      }

      try {
        const response = await fetch(ANVIL_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: postData,
        });
        const body = await response.text();
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body,
        });
      } catch {
        return route.abort();
      }
    },
  );
}
