/**
 * Anvil fork JSON-RPC quirks: `result: null` for fee/estimate methods or missing
 * `baseFeePerGas` on blocks → viem `BigInt(null)`. Used by `/api/e2e-anvil` only.
 */

export const E2E_FALLBACK_FEE_HEX = "0x3b9aca00"; // 1 gwei
export const E2E_FALLBACK_ESTIMATE_GAS_HEX = "0x07a120"; // 500_000

export type JsonRpcResponse = {
  jsonrpc?: string;
  id?: number | string;
  result?: unknown;
  error?: { code?: number; message?: string; data?: unknown };
};

export function patchE2eAnvilRpcResponse(
  method: string | undefined,
  response: JsonRpcResponse,
): JsonRpcResponse {
  if (response.error) return response;

  if (
    method === "eth_maxPriorityFeePerGas" ||
    method === "eth_gasPrice"
  ) {
    if (response.result === null || response.result === undefined) {
      return { ...response, result: E2E_FALLBACK_FEE_HEX };
    }
  }

  if (method === "eth_estimateGas") {
    if (response.result === null || response.result === undefined) {
      return { ...response, result: E2E_FALLBACK_ESTIMATE_GAS_HEX };
    }
  }

  if (method === "eth_getTransactionReceipt") {
    const r = response.result;
    if (r && typeof r === "object" && !Array.isArray(r)) {
      const b = { ...(r as Record<string, unknown>) };
      for (const key of [
        "effectiveGasPrice",
        "gasUsed",
        "cumulativeGasUsed",
        "blobGasPrice",
        "blobGasUsed",
      ]) {
        if (b[key] === null || b[key] === undefined) {
          b[key] = key === "effectiveGasPrice" ? E2E_FALLBACK_FEE_HEX : "0x0";
        }
      }
      if (b.blockNumber === null || b.blockNumber === undefined) {
        b.blockNumber = "0x0";
      }
      return { ...response, result: b };
    }
  }

  if (method === "eth_getBlockByNumber" || method === "eth_getBlockByHash") {
    const r = response.result;
    if (r && typeof r === "object" && !Array.isArray(r)) {
      const b = r as Record<string, unknown>;
      if (b.baseFeePerGas === null || b.baseFeePerGas === undefined) {
        return {
          ...response,
          result: { ...b, baseFeePerGas: E2E_FALLBACK_FEE_HEX },
        };
      }
    }
  }

  return response;
}

type JsonRpcRequest = { method?: string; id?: number | string };

/** Batch responses are often sorted by `id`; index alignment is unreliable. */
export function patchE2eAnvilRpcExchange(
  requestJson: unknown,
  responseJson: unknown,
): unknown {
  if (Array.isArray(requestJson) && Array.isArray(responseJson)) {
    const reqById = new Map<number | string, JsonRpcRequest>();
    for (const r of requestJson) {
      const req = r as JsonRpcRequest;
      reqById.set(req.id ?? 0, req);
    }
    return responseJson.map((res) => {
      const id = (res as { id?: number | string }).id ?? 0;
      const req = reqById.get(id);
      return patchE2eAnvilRpcResponse(req?.method, res as JsonRpcResponse);
    });
  }
  return patchE2eAnvilRpcResponse(
    (requestJson as { method?: string })?.method,
    responseJson as JsonRpcResponse,
  );
}
