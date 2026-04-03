const ANVIL_URL = "http://localhost:8545";

let baselineSnapshotId: string | null = null;

async function jsonRpc<T = unknown>(
  method: string,
  params: unknown[] = [],
): Promise<T> {
  const res = await fetch(ANVIL_URL, {
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
  const body = (await res.json()) as {
    error?: { message?: string };
    result?: T;
  };
  if (body.error) {
    throw new Error(`RPC ${method} error: ${body.error.message || "unknown"}`);
  }
  return body.result as T;
}

/**
 * Keep an in-process baseline snapshot and reset to it before each test.
 * First call captures baseline; subsequent calls revert then re-snapshot.
 */
export async function resetAnvilToBaseline(): Promise<void> {
  if (!baselineSnapshotId) {
    baselineSnapshotId = await jsonRpc<string>("evm_snapshot");
    return;
  }

  await jsonRpc("evm_revert", [baselineSnapshotId]);
  baselineSnapshotId = await jsonRpc<string>("evm_snapshot");
}

