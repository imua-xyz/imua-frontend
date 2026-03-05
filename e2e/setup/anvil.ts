import { execSync, spawn, ChildProcess } from "child_process";

const RPC_URL = "http://localhost:8545";
const BOOTSTRAP_CONTRACT = "0xf21FB1667A8Aa3D3ea365D3D1D257f3E4fdd0651";
const BOOTSTRAPPED_SLOT =
  "0x0000000000000000000000000000000000000000000000000000000000000101"; // slot 257

// Token contracts on Hoodi
const TOKENS = {
  imETH: {
    address: "0x80E5bb3A04554E54b40Dd6e14ca0F97212d9428d",
    balanceMappingSlot: 0,
  },
  wstETH: {
    address: "0x32118ebD4b82A84B0f13218dbA41f352CC7c2923",
    balanceMappingSlot: 0,
  },
} as const;

// Anvil default test account #0
const TEST_WALLET = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const TEST_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

let anvilProcess: ChildProcess | null = null;

function cast(args: string): string {
  return execSync(`cast ${args} --rpc-url ${RPC_URL}`, {
    encoding: "utf-8",
  }).trim();
}

function castRpc(method: string, params: string[] = []): string {
  const paramStr = params.map((p) => `"${p}"`).join(" ");
  return cast(`rpc ${method} ${paramStr}`);
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

export function fundETH(
  address: string = TEST_WALLET,
  ethAmount: number = 100,
): void {
  const weiHex = `0x${(BigInt(ethAmount) * BigInt(10 ** 18)).toString(16)}`;
  castRpc("anvil_setBalance", [address, weiHex]);
}

export function fundERC20(
  tokenSymbol: keyof typeof TOKENS,
  address: string = TEST_WALLET,
  amount: bigint = BigInt(100) * BigInt(10 ** 18),
): void {
  const token = TOKENS[tokenSymbol];
  const balanceSlot = calculateMappingSlot(address, token.balanceMappingSlot);
  const amountHex = `0x${amount.toString(16).padStart(64, "0")}`;
  castRpc("anvil_setStorageAt", [token.address, balanceSlot, amountHex]);
}

function calculateMappingSlot(address: string, mappingSlot: number): string {
  return execSync(
    `cast index address ${address} ${mappingSlot}`,
    { encoding: "utf-8" },
  ).trim();
}

export function setBootstrapped(value: boolean): void {
  const storageValue = value
    ? "0x0000000000000000000000000000000000000000000000000000000000000001"
    : "0x0000000000000000000000000000000000000000000000000000000000000000";
  castRpc("anvil_setStorageAt", [
    BOOTSTRAP_CONTRACT,
    BOOTSTRAPPED_SLOT,
    storageValue,
  ]);
}

export function isBootstrapped(): boolean {
  const result = cast(
    `call ${BOOTSTRAP_CONTRACT} "bootstrapped()(bool)"`,
  );
  return result === "true";
}

export function takeSnapshot(): string {
  return castRpc("evm_snapshot").replace(/"/g, "");
}

export function revertSnapshot(snapshotId: string): void {
  castRpc("evm_revert", [snapshotId]);
}

export function getERC20Balance(
  tokenSymbol: keyof typeof TOKENS,
  address: string = TEST_WALLET,
): bigint {
  const token = TOKENS[tokenSymbol];
  const result = cast(
    `call ${token.address} "balanceOf(address)(uint256)" ${address}`,
  );
  return BigInt(result.split(" ")[0]);
}

export const config = {
  RPC_URL,
  BOOTSTRAP_CONTRACT,
  BOOTSTRAPPED_SLOT,
  TOKENS,
  TEST_WALLET,
  TEST_PRIVATE_KEY,
};
