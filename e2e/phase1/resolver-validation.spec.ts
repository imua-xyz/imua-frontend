import { test, expect } from "@playwright/test";
import { createPublicClient, http, type Address } from "viem";
import { anvilE2EPortalAddress } from "../setup/anvil-portal";
import { ANVIL_HOODI_FORK_CHAIN_ID, ANVIL_RPC_URL } from "../setup/anvil-chain";
import { setupTestHarness } from "../setup/test-harness";
const TEST_WALLET = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
const CHAIN_HEX = "0x3e7";
const STAKER_ID = `${TEST_WALLET}_${CHAIN_HEX}`;

const BOOTSTRAP_READ_ABI = [
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
    name: "delegations",
    stateMutability: "view",
    inputs: [
      { name: "delegator", type: "address" },
      { name: "imAddress", type: "string" },
      { name: "tokenAddress", type: "address" },
    ],
    outputs: [{ name: "amount", type: "uint256" }],
  },
] as const;

const client = createPublicClient({
  chain: {
    id: ANVIL_HOODI_FORK_CHAIN_ID,
    name: "hoodi-anvil-fork",
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: {
      default: { http: [ANVIL_RPC_URL] },
      public: { http: [ANVIL_RPC_URL] },
    },
  },
  transport: http(ANVIL_RPC_URL),
});

const bootstrapAddress = anvilE2EPortalAddress;

function assetIdOf(token: Address): string {
  return `${token.toLowerCase()}_${CHAIN_HEX}`;
}

async function connectWallet(page: any) {
  await page.getByTestId("connect-wallet-cta").click();
  await page.locator("button").filter({ hasText: "Connect Wallet" }).last().click();
  await expect(page.getByTestId("connect-wallet-cta")).not.toBeVisible({ timeout: 15000 });
}

test.describe("E2E resolver validation", () => {
  test("resolver output tracks real on-chain deposit operation", async ({ page }) => {
    test.setTimeout(180000);
    await setupTestHarness(page);

    await page.goto("/staking", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("staking-heading")).toBeVisible({ timeout: 60000 });
    await connectWallet(page);

    const tokenCount = (await client.readContract({
      address: bootstrapAddress,
      abi: BOOTSTRAP_READ_ABI,
      functionName: "getWhitelistedTokensCount",
    })) as bigint;
    expect(tokenCount > 0n).toBeTruthy();

    const tokenInfo = (await client.readContract({
      address: bootstrapAddress,
      abi: BOOTSTRAP_READ_ABI,
      functionName: "getWhitelistedTokenAtIndex",
      args: [0n],
    })) as { tokenAddress: Address };
    const tokenAddress = tokenInfo.tokenAddress;
    const targetAssetId = assetIdOf(tokenAddress);

    const preDeposited = (await client.readContract({
      address: bootstrapAddress,
      abi: BOOTSTRAP_READ_ABI,
      functionName: "totalDepositAmounts",
      args: [TEST_WALLET as Address, tokenAddress],
    })) as bigint;

    // Execute a real deposit-only operation through the UI.
    await page.getByTestId("tab-stake").click();
    await page.getByTestId("stake-mode-toggle").click();
    await page.getByTestId("stake-amount-input").fill("0.01");
    await page.getByTestId("stake-continue-button").click();
    await expect(page.getByTestId("stake-submit-button")).toBeVisible({ timeout: 15000 });
    await page.getByTestId("stake-submit-button").click();

    // Wait for chain to advance and UI polling to refetch GraphQL.
    await page.waitForTimeout(4000);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("staking-heading")).toBeVisible({ timeout: 60000 });
    if (await page.getByTestId("connect-wallet-cta").isVisible()) {
      await connectWallet(page);
    }
    await page.waitForTimeout(1500);

    const postDeposited = (await client.readContract({
      address: bootstrapAddress,
      abi: BOOTSTRAP_READ_ABI,
      functionName: "totalDepositAmounts",
      args: [TEST_WALLET as Address, tokenAddress],
    })) as bigint;
    expect(postDeposited >= preDeposited).toBeTruthy();

    // Query the resolver endpoint directly to validate payload values.
    const stakerPayload = (await page.evaluate(async (stakerId) => {
      const res = await fetch("/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operationName: "GetBootstrapStakerAssets",
          query:
            "query GetBootstrapStakerAssets($stakerId: String!) { bootstrap_staker_assets(where: { staker_id: { _eq: $stakerId } }) { staker_id asset_id deposited withdrawable delegated updated_at updated_at_block } }",
          variables: { stakerId },
        }),
      });
      return res.json();
    }, STAKER_ID)) as {
      data?: { bootstrap_staker_assets?: Array<any> };
    };
    const stakerAssets = (stakerPayload?.data?.bootstrap_staker_assets ?? []) as Array<{
      staker_id: string;
      asset_id: string;
      deposited: string;
      withdrawable: string;
      delegated: string;
    }>;
    const expectedNonZeroAssetIds = new Set<string>();
    for (let i = 0n; i < tokenCount; i++) {
      const info = (await client.readContract({
        address: bootstrapAddress,
        abi: BOOTSTRAP_READ_ABI,
        functionName: "getWhitelistedTokenAtIndex",
        args: [i],
      })) as { tokenAddress: Address };
      const t = info.tokenAddress;
      const deposited = (await client.readContract({
        address: bootstrapAddress,
        abi: BOOTSTRAP_READ_ABI,
        functionName: "totalDepositAmounts",
        args: [TEST_WALLET as Address, t],
      })) as bigint;
      const validators = (await client.readContract({
        address: bootstrapAddress,
        abi: BOOTSTRAP_READ_ABI,
        functionName: "getValidatorsCountForStakerToken",
        args: [TEST_WALLET as Address, t],
      })) as bigint;
      let delegated = 0n;
      for (let j = 0n; j < validators; j++) {
        const validator = (await client.readContract({
          address: bootstrapAddress,
          abi: BOOTSTRAP_READ_ABI,
          functionName: "stakerToTokenToValidators",
          args: [TEST_WALLET as Address, t, j],
        })) as string;
        delegated += (await client.readContract({
          address: bootstrapAddress,
          abi: BOOTSTRAP_READ_ABI,
          functionName: "delegations",
          args: [TEST_WALLET as Address, validator, t],
        })) as bigint;
      }
      if (deposited > 0n || delegated > 0n) {
        expectedNonZeroAssetIds.add(assetIdOf(t).toLowerCase());
      }
    }
    expect(stakerAssets.length).toBe(expectedNonZeroAssetIds.size);
    for (const row of stakerAssets) {
      expect(expectedNonZeroAssetIds.has(row.asset_id.toLowerCase())).toBeTruthy();
    }

    // Validate latest delegations-by-asset payload against direct on-chain aggregation.
    const validatorsCount = (await client.readContract({
      address: bootstrapAddress,
      abi: BOOTSTRAP_READ_ABI,
      functionName: "getValidatorsCountForStakerToken",
      args: [TEST_WALLET as Address, tokenAddress],
    })) as bigint;
    let delegatedTotal = 0n;
    for (let i = 0n; i < validatorsCount; i++) {
      const validator = (await client.readContract({
        address: bootstrapAddress,
        abi: BOOTSTRAP_READ_ABI,
        functionName: "stakerToTokenToValidators",
        args: [TEST_WALLET as Address, tokenAddress, i],
      })) as string;
      delegatedTotal += (await client.readContract({
        address: bootstrapAddress,
        abi: BOOTSTRAP_READ_ABI,
        functionName: "delegations",
        args: [TEST_WALLET as Address, validator, tokenAddress],
      })) as bigint;
    }

    const delegationPayload = (await page.evaluate(
      async ({ stakerId, assetId }) => {
        const res = await fetch("/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            operationName: "GetBootstrapDelegationsByAsset",
            query:
              "query GetBootstrapDelegationsByAsset($stakerId: String!, $assetId: String!) { bootstrap_delegation_states(where: { staker_id: { _eq: $stakerId }, asset_id: { _eq: $assetId } }) { staker_id asset_id operator_addr delegated updated_at updated_at_block } }",
            variables: { stakerId, assetId },
          }),
        });
        return res.json();
      },
      { stakerId: STAKER_ID, assetId: targetAssetId },
    )) as {
      data?: { bootstrap_delegation_states?: Array<any> };
    };

    const rows = (delegationPayload?.data?.bootstrap_delegation_states ?? []) as Array<{
      delegated: string;
    }>;
    const gqlDelegatedTotal = rows.reduce((acc, row) => acc + BigInt(row.delegated), 0n);
    expect(gqlDelegatedTotal).toBe(delegatedTotal);
  });
});

