import { spawn, ChildProcess } from "child_process";
import { writeFileSync, existsSync, readFileSync, unlinkSync } from "fs";
import { join } from "path";
import {
  decodeFunctionResult,
  encodeAbiParameters,
  encodeFunctionData,
  keccak256,
  type Hex,
} from "viem";

const RPC_URL = "http://localhost:8545";

// Token contracts on Hoodi
const TOKENS = {
  imETH: {
    address: "0x80E5bb3A04554E54b40Dd6e14ca0F97212d9428d",
  },
  wstETH: {
    address: "0x32118ebD4b82A84B0f13218dbA41f352CC7c2923",
  },
} as const;

// Anvil default test account #0 (same as config/testWallet.ts)
const TEST_WALLET = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const TEST_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const E2E_PID_FILE = join(process.cwd(), ".e2e-anvil-pid");
const E2E_ERC20_SLOT_CACHE_FILE = join(
  process.cwd(),
  ".e2e-erc20-balance-slots.json",
);
const WAD = BigInt(10) ** BigInt(18);

let anvilProcess: ChildProcess | null = null;
let erc20BalanceSlotCache: Record<string, number> | null = null;

const ERC20_BALANCE_OF_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

async function jsonRpc<T = any>(
  method: string,
  params: any[] = [],
): Promise<T> {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });

  if (!res.ok) {
    throw new Error(`RPC ${method} failed with status ${res.status}`);
  }

  const body = await res.json();
  if (body.error) {
    throw new Error(`RPC ${method} error: ${body.error.message || "unknown"}`);
  }

  return body.result as T;
}

function loadERC20SlotCache(): Record<string, number> {
  if (erc20BalanceSlotCache) return erc20BalanceSlotCache;
  if (!existsSync(E2E_ERC20_SLOT_CACHE_FILE)) {
    erc20BalanceSlotCache = {};
    return erc20BalanceSlotCache;
  }

  try {
    const parsed = JSON.parse(
      readFileSync(E2E_ERC20_SLOT_CACHE_FILE, "utf8"),
    ) as Record<string, number>;
    erc20BalanceSlotCache = Object.fromEntries(
      Object.entries(parsed).filter(([, slot]) => Number.isInteger(slot)),
    );
  } catch {
    erc20BalanceSlotCache = {};
  }

  return erc20BalanceSlotCache;
}

function saveERC20SlotCache(): void {
  if (!erc20BalanceSlotCache) return;
  try {
    writeFileSync(
      E2E_ERC20_SLOT_CACHE_FILE,
      JSON.stringify(erc20BalanceSlotCache, null, 2),
    );
  } catch {
    // ignore cache write failures; discovery can happen again next run
  }
}

function getCachedERC20BalanceSlot(tokenAddress: string): number | undefined {
  return loadERC20SlotCache()[tokenAddress.toLowerCase()];
}

function rememberERC20BalanceSlot(tokenAddress: string, slot: number): void {
  const cache = loadERC20SlotCache();
  cache[tokenAddress.toLowerCase()] = slot;
  saveERC20SlotCache();
}

/** Poll RPC until Anvil responds (for detached start). */
export async function waitForAnvil(maxAttempts = 30): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await jsonRpc("eth_chainId");
      return;
    } catch {
      // ignore and retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(
    "Anvil did not become ready on port 8545. Start it with: anvil --fork-url <Hoodi RPC> --port 8545. Or set ANVIL_FORK_URL in the environment to have Playwright start it.",
  );
}

/**
 * Start Anvil in detached mode so it survives after this process exits.
 * Writes PID to .e2e-anvil-pid for globalTeardown to kill.
 */
export async function startAnvilDetached(forkUrl: string): Promise<void> {
  const child = spawn(
    "anvil",
    ["--fork-url", forkUrl, "--block-time", "1", "--port", "8545"],
    {
      detached: true,
      stdio: "ignore",
    },
  );
  child.unref();
  const pid = child.pid;
  if (pid == null) throw new Error("Failed to start Anvil");
  writeFileSync(E2E_PID_FILE, String(pid));
  await waitForAnvil();
}

export function stopAnvilDetached(): void {
  if (!existsSync(E2E_PID_FILE)) return;
  try {
    const pid = parseInt(readFileSync(E2E_PID_FILE, "utf8"), 10);
    process.kill(pid, "SIGTERM");
  } catch {
    // ignore
  } finally {
    try {
      unlinkSync(E2E_PID_FILE);
    } catch {
      // ignore
    }
  }
}

export async function startAnvil(forkUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    anvilProcess = spawn(
      "anvil",
      ["--fork-url", forkUrl, "--block-time", "1", "--port", "8545"],
      { stdio: "pipe" },
    );

    anvilProcess.stderr?.on("data", (data: Buffer) => {
      const msg = data.toString();
      if (msg.includes("Listening on")) {
        resolve();
      }
    });

    anvilProcess.on("error", reject);

    // Fallback timeout
    setTimeout(resolve, 5000);
  });
}

export function stopAnvil(): void {
  if (anvilProcess) {
    anvilProcess.kill();
    anvilProcess = null;
  }
}

export async function fundETH(
  address: string = TEST_WALLET,
  ethAmount: number = 100,
): Promise<void> {
  const weiHex = `0x${(BigInt(ethAmount) * WAD).toString(16)}`;
  await jsonRpc("anvil_setBalance", [address, weiHex]);
}

function calculateMappingSlot(
  address: string,
  mappingSlot: number,
): `0x${string}` {
  // keccak256(abi.encode(address, uint256(slot)))
  return keccak256(
    encodeAbiParameters(
      [
        { name: "key", type: "address" },
        { name: "slot", type: "uint256" },
      ],
      [address as `0x${string}`, BigInt(mappingSlot)],
    ),
  );
}

async function readERC20Balance(
  tokenAddress: string,
  walletAddress: string,
): Promise<bigint> {
  const data = encodeFunctionData({
    abi: ERC20_BALANCE_OF_ABI,
    functionName: "balanceOf",
    args: [walletAddress as `0x${string}`],
  });
  const result = await jsonRpc<Hex>("eth_call", [
    {
      to: tokenAddress,
      data,
    },
    "latest",
  ]);
  return decodeFunctionResult({
    abi: ERC20_BALANCE_OF_ABI,
    functionName: "balanceOf",
    data: result,
  }) as bigint;
}

async function trySetERC20BalanceSlot(
  tokenAddress: string,
  walletAddress: string,
  amount: bigint,
  slot: number,
): Promise<boolean> {
  const balanceSlot = calculateMappingSlot(walletAddress, slot);
  const amountHex = `0x${amount.toString(16).padStart(64, "0")}`;
  await jsonRpc("anvil_setStorageAt", [tokenAddress, balanceSlot, amountHex]);
  const currentBalance = await readERC20Balance(tokenAddress, walletAddress);
  return currentBalance === amount;
}

async function discoverERC20BalanceSlot(
  tokenAddress: string,
  walletAddress: string,
  amount: bigint,
  maxSlots = 100,
): Promise<number> {
  const candidates = new Set<number>();
  const cachedSlot = getCachedERC20BalanceSlot(tokenAddress);
  if (cachedSlot !== undefined) candidates.add(cachedSlot);
  // Optional: allow a configured "known slot" if TOKENS entries ever add it.
  for (const token of Object.values(TOKENS)) {
    if (token.address.toLowerCase() !== tokenAddress.toLowerCase()) continue;
    const maybeSlot = (token as { balanceMappingSlot?: unknown })
      .balanceMappingSlot;
    if (typeof maybeSlot === "number") candidates.add(maybeSlot);
  }
  for (let slot = 0; slot < maxSlots; slot++) {
    candidates.add(slot);
  }

  const snapshotId = await jsonRpc<string>("evm_snapshot");
  let currentSnapshot = snapshotId;
  try {
    for (const slot of candidates) {
      const matched = await trySetERC20BalanceSlot(
        tokenAddress,
        walletAddress,
        amount,
        slot,
      );
      if (matched) {
        rememberERC20BalanceSlot(tokenAddress, slot);
        return slot;
      }

      await jsonRpc("evm_revert", [currentSnapshot]);
      currentSnapshot = await jsonRpc<string>("evm_snapshot");
    }
  } catch (error) {
    try {
      await jsonRpc("evm_revert", [currentSnapshot]);
    } catch {
      // ignore
    }
    throw error;
  }

  try {
    await jsonRpc("evm_revert", [currentSnapshot]);
  } catch {
    // ignore
  }

  throw new Error(
    `Unable to discover ERC20 balance slot for ${tokenAddress}. ` +
      `Checked cached slot and the first ${maxSlots} candidate slots.`,
  );
}

export async function fundERC20(
  tokenSymbol: keyof typeof TOKENS,
  address: string = TEST_WALLET,
  amount: bigint = BigInt(100) * WAD,
): Promise<void> {
  const token = TOKENS[tokenSymbol];
  const cachedSlot = getCachedERC20BalanceSlot(token.address);
  const slot =
    cachedSlot ??
    (await discoverERC20BalanceSlot(token.address, address, amount));

  // Actually fund the wallet by writing to the discovered mapping slot.
  const balanceSlot = calculateMappingSlot(address, slot);
  const amountHex = `0x${amount.toString(16).padStart(64, "0")}`;
  await jsonRpc("anvil_setStorageAt", [token.address, balanceSlot, amountHex]);

  // Persist the discovered slot so future runs can skip brute-force discovery.
  rememberERC20BalanceSlot(token.address, slot);
}

/** Fund the E2E test wallet with ETH and LST tokens so useTokenBalance returns real balances. */
export async function fundTestWallet(): Promise<void> {
  await fundETH(TEST_WALLET, 100);
  const ten = BigInt(10) * WAD;
  await fundERC20("wstETH", TEST_WALLET, ten);
  await fundERC20("imETH", TEST_WALLET, ten);
}

export const config = {
  RPC_URL,
  TOKENS,
  TEST_WALLET,
  TEST_PRIVATE_KEY,
};
