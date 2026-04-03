import { Page } from "@playwright/test";
import { createPublicClient, http, type Address } from "viem";
import bootstrapValidators from "../fixtures/bootstrap-validators.json";
import bootstrapOperatorAssets from "../fixtures/bootstrap-operator-assets.json";
import { anvilE2EPortalAddress } from "./anvil-portal";
import { ANVIL_HOODI_FORK_CHAIN_ID, ANVIL_RPC_URL } from "./anvil-chain";
import { resetAnvilToBaseline } from "./anvil-state";

const publicClient = createPublicClient({
  chain: {
    id: ANVIL_HOODI_FORK_CHAIN_ID,
    name: "anvil-e2e",
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: {
      default: { http: [ANVIL_RPC_URL] },
      public: { http: [ANVIL_RPC_URL] },
    },
  },
  transport: http(ANVIL_RPC_URL),
});

const bootstrapAddress = anvilE2EPortalAddress;

const BOOTSTRAP_READ_ABI = [
  {
    type: "function",
    name: "totalDepositAmounts",
    stateMutability: "view",
    inputs: [
      { name: "depositor", type: "address" },
      { name: "tokenAddress", type: "address" },
    ],
    outputs: [{ name: "amount", type: "uint256" }],
  },
  {
    type: "function",
    name: "withdrawableAmounts",
    stateMutability: "view",
    inputs: [
      { name: "depositor", type: "address" },
      { name: "tokenAddress", type: "address" },
    ],
    outputs: [{ name: "amount", type: "uint256" }],
  },
  {
    type: "function",
    name: "delegations",
    stateMutability: "view",
    inputs: [
      { name: "delegator", type: "address" },
      { name: "imAddress", type: "string" },
      { name: "tokenAddress", type: "address" },
    ],
    outputs: [{ name: "amount", type: "uint256" }],
  },
  {
    type: "function",
    name: "getValidatorsCountForStakerToken",
    stateMutability: "view",
    inputs: [
      { name: "stakerAddress", type: "address" },
      { name: "token", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "stakerToTokenToValidators",
    stateMutability: "view",
    inputs: [
      { name: "staker", type: "address" },
      { name: "token", type: "address" },
      { name: "", type: "uint256" },
    ],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "getWhitelistedTokensCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getWhitelistedTokenAtIndex",
    stateMutability: "view",
    inputs: [{ name: "index", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "name", type: "string" },
          { name: "symbol", type: "string" },
          { name: "tokenAddress", type: "address" },
          { name: "decimals", type: "uint8" },
          { name: "depositAmount", type: "uint256" },
        ],
      },
    ],
  },
] as const;

interface GraphQLFixtureMap {
  [operationName: string]: object;
}

const defaultGraphQLFixtures: GraphQLFixtureMap = {
  GetBootstrapValidators: bootstrapValidators,
  GetBootstrapOperatorAssets: bootstrapOperatorAssets,
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

function parseStakerId(stakerId: string): { stakerAddress: Address; chainHex: string } {
  const [addr, chainHex] = stakerId.split("_");
  if (!addr || !chainHex) {
    throw new Error(`Invalid stakerId: ${stakerId}`);
  }
  return { stakerAddress: addr as Address, chainHex: chainHex.toLowerCase() };
}

function makeAssetId(tokenAddress: Address, chainHex: string): string {
  return `${tokenAddress.toLowerCase()}_${chainHex}`;
}

async function getWhitelistedTokenAddresses(): Promise<Address[]> {
  const count = (await publicClient.readContract({
    address: bootstrapAddress,
    abi: BOOTSTRAP_READ_ABI,
    functionName: "getWhitelistedTokensCount",
  })) as bigint;

  const tokens: Address[] = [];
  for (let i = 0n; i < count; i++) {
    const info = (await publicClient.readContract({
      address: bootstrapAddress,
      abi: BOOTSTRAP_READ_ABI,
      functionName: "getWhitelistedTokenAtIndex",
      args: [i],
    })) as {
      tokenAddress: Address;
    };
    tokens.push(info.tokenAddress);
  }
  return tokens;
}

async function resolveBootstrapStakerAssets(stakerId: string) {
  const { stakerAddress, chainHex } = parseStakerId(stakerId);
  const tokenAddresses = await getWhitelistedTokenAddresses();
  const block = await publicClient.getBlockNumber();
  const now = new Date().toISOString();

  const rows = await Promise.all(
    tokenAddresses.map(async (tokenAddress) => {
      const [deposited, claimable, delegated] = (await Promise.all([
        publicClient.readContract({
          address: bootstrapAddress,
          abi: BOOTSTRAP_READ_ABI,
          functionName: "totalDepositAmounts",
          args: [stakerAddress, tokenAddress],
        }),
        publicClient.readContract({
          address: bootstrapAddress,
          abi: BOOTSTRAP_READ_ABI,
          functionName: "withdrawableAmounts",
          args: [stakerAddress, tokenAddress],
        }),
        (async () => {
          const count = (await publicClient.readContract({
            address: bootstrapAddress,
            abi: BOOTSTRAP_READ_ABI,
            functionName: "getValidatorsCountForStakerToken",
            args: [stakerAddress, tokenAddress],
          })) as bigint;
          let total = 0n;
          for (let i = 0n; i < count; i++) {
            const validator = (await publicClient.readContract({
              address: bootstrapAddress,
              abi: BOOTSTRAP_READ_ABI,
              functionName: "stakerToTokenToValidators",
              args: [stakerAddress, tokenAddress, i],
            })) as string;
            const amount = (await publicClient.readContract({
              address: bootstrapAddress,
              abi: BOOTSTRAP_READ_ABI,
              functionName: "delegations",
              args: [stakerAddress, validator, tokenAddress],
            })) as bigint;
            total += amount;
          }
          return total;
        })(),
      ])) as [bigint, bigint, bigint];

      return {
        staker_id: stakerId.toLowerCase(),
        asset_id: makeAssetId(tokenAddress, chainHex),
        deposited: deposited.toString(),
        withdrawable: claimable.toString(),
        delegated: delegated.toString(),
        updated_at: now,
        updated_at_block: Number(block),
      };
    }),
  );

  return {
    data: {
      bootstrap_staker_assets: rows.filter(
        (x) => x.deposited !== "0" || x.withdrawable !== "0" || x.delegated !== "0",
      ),
    },
  };
}

async function resolveBootstrapDelegations(stakerId: string, assetId?: string) {
  const { stakerAddress, chainHex } = parseStakerId(stakerId);
  const block = await publicClient.getBlockNumber();
  const now = new Date().toISOString();
  const tokenAddresses = await getWhitelistedTokenAddresses();
  const filteredTokens = assetId
    ? tokenAddresses.filter((t) => makeAssetId(t, chainHex) === assetId.toLowerCase())
    : tokenAddresses;

  const rows: Array<{
    staker_id: string;
    asset_id: string;
    operator_addr: string;
    delegated: string;
    updated_at: string;
    updated_at_block: number;
  }> = [];

  for (const tokenAddress of filteredTokens) {
    const count = (await publicClient.readContract({
      address: bootstrapAddress,
      abi: BOOTSTRAP_READ_ABI,
      functionName: "getValidatorsCountForStakerToken",
      args: [stakerAddress, tokenAddress],
    })) as bigint;

    for (let i = 0n; i < count; i++) {
      const validator = (await publicClient.readContract({
        address: bootstrapAddress,
        abi: BOOTSTRAP_READ_ABI,
        functionName: "stakerToTokenToValidators",
        args: [stakerAddress, tokenAddress, i],
      })) as string;
      const amount = (await publicClient.readContract({
        address: bootstrapAddress,
        abi: BOOTSTRAP_READ_ABI,
        functionName: "delegations",
        args: [stakerAddress, validator, tokenAddress],
      })) as bigint;
      if (amount === 0n) continue;

      rows.push({
        staker_id: stakerId.toLowerCase(),
        asset_id: makeAssetId(tokenAddress, chainHex),
        operator_addr: validator,
        delegated: amount.toString(),
        updated_at: now,
        updated_at_block: Number(block),
      });
    }
  }

  return {
    data: {
      bootstrap_delegation_states: rows,
    },
  };
}

/**
 * Sets up route interception for E2E tests (GraphQL + RPC proxy).
 * First navigation can be slow while Next.js compiles in dev.
 */
const NAVIGATION_TIMEOUT_MS = 120_000;

export async function setupTestHarness(
  page: Page,
  graphqlOverrides?: GraphQLFixtureMap,
): Promise<void> {
  await resetAnvilToBaseline();
  page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS);
  const fixtures = { ...defaultGraphQLFixtures, ...graphqlOverrides };

  // 1. GraphQL interception — match any URL containing "graphql" (e.g. /v1/graphql or /api/mock-graphql)
  await page.route(/graphql/, async (route) => {
    const request = route.request();
    if (request.method() !== "POST") return route.continue();

    try {
      const body = JSON.parse(request.postData() || "{}");
      const operationName = body.operationName;
      if (operationName === "GetBootstrapStakerAssets") {
        const stakerId = body?.variables?.stakerId as string;
        const data = await resolveBootstrapStakerAssets(stakerId);
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(data),
        });
      }

      if (operationName === "GetBootstrapDelegations") {
        const stakerId = body?.variables?.stakerId as string;
        const data = await resolveBootstrapDelegations(stakerId);
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(data),
        });
      }

      if (operationName === "GetBootstrapDelegationsByAsset") {
        const stakerId = body?.variables?.stakerId as string;
        const assetId = (body?.variables?.assetId as string | undefined)?.toLowerCase();
        const data = await resolveBootstrapDelegations(stakerId, assetId);
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(data),
        });
      }

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
      const response = await fetch(ANVIL_RPC_URL, {
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
      const response = await fetch(ANVIL_RPC_URL, {
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
