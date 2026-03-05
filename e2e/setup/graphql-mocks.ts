import { Page } from "@playwright/test";
import bootstrapValidators from "../fixtures/bootstrap-validators.json";
import bootstrapOperatorAssets from "../fixtures/bootstrap-operator-assets.json";

const EMPTY_GRAPHQL_RESPONSE = { data: {} };

interface GraphQLFixtureMap {
  [operationName: string]: object;
}

const defaultFixtures: GraphQLFixtureMap = {
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

export async function setupGraphQLMocks(
  page: Page,
  overrides?: GraphQLFixtureMap,
): Promise<void> {
  const fixtures = { ...defaultFixtures, ...overrides };

  await page.route("**/*", async (route) => {
    const request = route.request();

    if (
      request.method() === "POST" &&
      request.url().includes("graphql")
    ) {
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
        // Parsing failed, fall through
      }

      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EMPTY_GRAPHQL_RESPONSE),
      });
    }

    // Let all non-GraphQL requests pass through (including RPC to Anvil)
    return route.continue();
  });
}
