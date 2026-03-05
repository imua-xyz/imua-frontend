import { Page } from "@playwright/test";
import bootstrapValidators from "../fixtures/bootstrap-validators.json";
import bootstrapOperatorAssets from "../fixtures/bootstrap-operator-assets.json";

const ANVIL_URL = "http://localhost:8545";

interface GraphQLFixtureMap {
  [operationName: string]: object;
}

const defaultGraphQLFixtures: GraphQLFixtureMap = {
  GetBootstrapValidators: bootstrapValidators,
  GetBootstrapOperatorAssets: bootstrapOperatorAssets,
  GetBootstrapDelegations: { data: { bootstrap_delegation_states: [] } },
  GetBootstrapDelegationsByAsset: {
    data: { bootstrap_delegation_states: [] },
  },
  GetBootstrapStakerAssets: { data: { bootstrap_staker_assets: [] } },
  GetBootstrapTokens: { data: { bootstrap_tokens: [] } },
  GetBootstrapTokenPrices: { data: { bootstrap_token_prices: [] } },
  GetBootstrapAddressBinding: { data: { bootstrap_address_bindings: [] } },
  GetBootstrapAddressBindingsByTarget: {
    data: { bootstrap_address_bindings: [] },
  },
  GetNetworkStatistics: {
    data: {
      get_total_tvl: { total: 1000000 },
      get_active_staker_count: { count: 42 },
      bootstrap_tokens: [],
    },
  },
  GetBootstrapStatistics: {
    data: { bootstrap_statistics: { tvl: 1000000, updated_at: "2026-01-01" } },
  },
};

/**
 * Sets up all route interception for E2E tests.
 * Uses specific URL patterns instead of catch-all to avoid intercepting
 * static assets (JS chunks, CSS, images) which would add latency.
 */
export async function setupTestHarness(
  page: Page,
  graphqlOverrides?: GraphQLFixtureMap,
): Promise<void> {
  const fixtures = { ...defaultGraphQLFixtures, ...graphqlOverrides };

  // 1. GraphQL interception — match any URL containing "graphql"
  await page.route("**/graphql*", async (route) => {
    const request = route.request();
    if (request.method() !== "POST") return route.continue();

    try {
      const body = JSON.parse(request.postData() || "{}");
      const operationName = body.operationName;
      if (operationName && fixtures[operationName]) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(fixtures[operationName]),
        });
      }
    } catch {
      // parse error
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: {} }),
    });
  });

  // 2. EVM RPC proxy — Alchemy calls → Anvil
  await page.route("**/*.alchemy.com/**", async (route) => {
    const request = route.request();
    if (request.method() !== "POST" || !request.postData()) {
      return route.abort();
    }
    try {
      const response = await fetch(ANVIL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: request.postData()!,
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
  });

  // 3. EVM RPC proxy — Imua chain calls → Anvil
  await page.route("**/*exocore-restaking.com*", async (route) => {
    const request = route.request();
    if (request.method() !== "POST" || !request.postData()) {
      return route.continue();
    }
    try {
      const response = await fetch(ANVIL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: request.postData()!,
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
  });

  // 4. Cosmos REST API — mock with empty responses
  await page.route(
    "**/*exocore-restaking.com/imuachain/**",
    async (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({}),
        });
      }
      return route.continue();
    },
  );
}
