import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { createPublicClient, http, type Address } from "viem";
import { anvilE2EPortalAddress } from "../setup/anvil-portal";
import { ANVIL_HOODI_FORK_CHAIN_ID, ANVIL_RPC_URL } from "../setup/anvil-chain";

export async function gotoStaking(page: Page) {
  await page.goto("/staking", { waitUntil: "domcontentloaded" });
}

export async function connectEvmWalletFromCTA(page: Page) {
  await page.getByTestId("connect-wallet-cta").click();
  const connectInModal = page.locator("button").filter({ hasText: "Connect Wallet" }).last();
  await connectInModal.click();
}

const TEST_WALLET = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266" as Address;
const IMETH = "0x80e5bb3a04554e54b40dd6e14ca0f97212d9428d" as Address;
const OPERATOR_1_ADDRESS = "imua1validator1xxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
const bootstrapAddress = anvilE2EPortalAddress;

const BOOTSTRAP_READ_ABI = [
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

async function readClaimable(): Promise<bigint> {
  return (await client.readContract({
    address: bootstrapAddress,
    abi: BOOTSTRAP_READ_ABI,
    functionName: "withdrawableAmounts",
    args: [TEST_WALLET, IMETH],
  })) as bigint;
}

async function readTotalDeposited(): Promise<bigint> {
  return (await client.readContract({
    address: bootstrapAddress,
    abi: BOOTSTRAP_READ_ABI,
    functionName: "totalDepositAmounts",
    args: [TEST_WALLET, IMETH],
  })) as bigint;
}

async function readAnvilChainId(): Promise<bigint> {
  return client.getChainId();
}

async function readDelegatedTotal(): Promise<bigint> {
  const count = (await client.readContract({
    address: bootstrapAddress,
    abi: BOOTSTRAP_READ_ABI,
    functionName: "getValidatorsCountForStakerToken",
    args: [TEST_WALLET, IMETH],
  })) as bigint;
  let total = 0n;
  for (let i = 0n; i < count; i++) {
    const validator = (await client.readContract({
      address: bootstrapAddress,
      abi: BOOTSTRAP_READ_ABI,
      functionName: "stakerToTokenToValidators",
      args: [TEST_WALLET, IMETH, i],
    })) as string;
    total += (await client.readContract({
      address: bootstrapAddress,
      abi: BOOTSTRAP_READ_ABI,
      functionName: "delegations",
      args: [TEST_WALLET, validator, IMETH],
    })) as bigint;
  }
  return total;
}

/**
 * Wait for OperationProgress modal: success (Close) or surface UI error text.
 */
async function waitForOperationProgressFinished(page: Page): Promise<void> {
  const modal = page.getByTestId("operation-progress-modal");
  await expect(modal).toBeVisible({
    timeout: 20_000,
    message:
      "Deposit/stake progress modal did not open — submit may not have run (check NEXT_PUBLIC_E2E_MODE, wallet chain, RPC proxy in test harness).",
  });

  const closeBtn = page.getByTestId("operation-close-button");
  const errorMsg = modal.locator("p.text-xs.text-red-400");

  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
      return;
    }
    const errText = await errorMsg
      .first()
      .textContent()
      .catch(() => null);
    if (errText?.trim()) {
      throw new Error(
        `Deposit/stake failed in UI (check Anvil logs / tx revert): ${errText.trim()}`,
      );
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  throw new Error(
    "Timed out waiting for deposit/stake modal to finish (120s). " +
      "Capture a trace: pnpm test:e2e -- --trace on …",
  );
}

async function waitForClaimableIncrease(
  beforeClaimable: bigint,
  beforeDeposited: bigint,
  timeoutMs: number,
): Promise<void> {
  const started = Date.now();
  let lastClaimable = beforeClaimable;
  let lastDeposited = beforeDeposited;

  while (Date.now() - started < timeoutMs) {
    try {
      lastClaimable = await readClaimable();
      lastDeposited = await readTotalDeposited();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(
        `On-chain read failed: ${msg} (portal=${bootstrapAddress}, rpc=${ANVIL_RPC_URL})`,
      );
    }

    if (lastClaimable > beforeClaimable) return;

    await new Promise((r) => setTimeout(r, 1000));
  }

  let chainIdStr = "unknown";
  try {
    chainIdStr = String(await readAnvilChainId());
  } catch {
    /* ignore */
  }

  throw new Error(
    `Timed out waiting for withdrawableAmounts to increase. chainId=${chainIdStr} (expect ${ANVIL_HOODI_FORK_CHAIN_ID} on Hoodi fork). ` +
      `withdrawable ${beforeClaimable}→${lastClaimable}, totalDeposit ${beforeDeposited}→${lastDeposited}. portal=${bootstrapAddress}`,
  );
}

export async function ensureHasClaimableBalance(page: Page): Promise<void> {
  const beforeClaimable = await readClaimable();
  const beforeDeposited = await readTotalDeposited();
  if (beforeClaimable > 0n) return;

  await page.getByTestId("tab-stake").click();
  const modeToggle = page.getByTestId("stake-mode-toggle");
  if (await modeToggle.isVisible().catch(() => false)) {
    // Use deposit-only path to increase claimable balance.
    await modeToggle.click();
  }
  await page.getByTestId("stake-amount-input").fill("0.01");
  await page.getByTestId("stake-continue-button").click();
  await expect(page.getByTestId("stake-submit-button")).toBeVisible({
    timeout: 15000,
  });
  await page.getByTestId("stake-submit-button").click();

  await waitForOperationProgressFinished(page);

  await waitForClaimableIncrease(beforeClaimable, beforeDeposited, 60_000);
}

export async function ensureHasDelegation(page: Page): Promise<void> {
  const before = await readDelegatedTotal();
  if (before > 0n) return;

  await ensureHasClaimableBalance(page);

  await page.getByTestId("tab-delegate").click();
  await page.getByTestId("delegate-amount-input").fill("0.005");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByTestId(`operator-row-${OPERATOR_1_ADDRESS}`)).toBeVisible({
    timeout: 15000,
  });
  await page.getByTestId(`operator-row-${OPERATOR_1_ADDRESS}`).click();
  await expect(page.getByTestId("delegate-submit-button")).toBeVisible({
    timeout: 15000,
  });
  await page.getByTestId("delegate-submit-button").click();
  await waitForOperationProgressFinished(page);

  const started = Date.now();
  while (Date.now() - started < 60_000) {
    if ((await readDelegatedTotal()) > before) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(
    "Timed out waiting for delegation on-chain. portal=" + bootstrapAddress,
  );
}
