// lib/txUtils.ts (or utils/transactions.ts)
import { TxHandlerOptions, TxStatus } from "@/types/staking";
import { GemWalletResponse } from "@/types/staking";
import { PublicClient } from "viem";
import { XrplClientState } from "@/stores/xrplClient";

// Helper for EVM transactions
export async function handleEVMTxWithStatus(
  txPromise: Promise<`0x${string}`>,
  publicClient: PublicClient,
  options?: TxHandlerOptions,
  status: TxStatus = "processing",
): Promise<{ hash: string; success: boolean; error?: string }> {
  if (!publicClient) throw new Error("Public client not found");
  
  try {
    options?.onStatus?.(status);
    const hash = await txPromise;

    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      timeout: 30_000,
    });

    if (receipt.status === "success") {
      options?.onStatus?.("success");
      return { hash, success: true };
    } else {
      options?.onStatus?.("error", "Transaction failed");
      return { hash, success: false };
    }
  } catch (error) {
    options?.onStatus?.(
      "error",
      error instanceof Error ? error.message : "Transaction failed",
    );
    return {
      hash: "",
      success: false,
      error: error instanceof Error ? error.message : "Transaction failed",
    };
  }
}

// Helper for XRPL transactions
export async function handleXrplTxWithStatus(
  txPromise: Promise<GemWalletResponse>,
  getTransactionStatus: XrplClientState["getTransactionStatus"],
  options?: TxHandlerOptions,
): Promise<{ hash: string; success: boolean; error?: string }> {
  options?.onStatus?.("processing");
  const MAX_WAIT_TIME = 60000; // 60 seconds timeout
  const POLLING_INTERVAL = 2000; // Check every 2 seconds

  try {
    const response = await txPromise;

    if (!response.data?.hash) {
      options?.onStatus?.(
        "error",
        "Transaction failed to be broadcasted and returned without a hash",
      );
      return {
        hash: "",
        success: false,
        error:
          "Transaction failed to be broadcasted and returned without a hash",
      };
    }

    const txResponse = response.data.hash;
    const txHash = txResponse.result.hash;
    const startTime = Date.now();
    let isValidated = false;

    // Poll until transaction is validated or timeout
    while (!isValidated && Date.now() - startTime < MAX_WAIT_TIME) {
      // Check transaction status
      const status = await getTransactionStatus(txHash);

      if (!status.success) {
        // Continue polling if we just can't get the status yet
        await new Promise((resolve) =>
          setTimeout(resolve, POLLING_INTERVAL),
        );
        continue;
      }

      // If transaction is finalized (included in a validated ledger)
      if (status.data?.finalized) {
        if (status.data?.success) {
          options?.onStatus?.("success");
          return { hash: txHash, success: true };
        } else {
          options?.onStatus?.("error", "Transaction failed on the ledger");
          return {
            hash: txHash,
            success: false,
            error: "Transaction failed on the ledger",
          };
        }
      }

      // Wait before checking again
      await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL));
    }

    // If we've reached here, we timed out
    if (!isValidated) {
      options?.onStatus?.(
        "error",
        "Transaction submitted but validation timed out",
      );
      return {
        hash: txHash,
        success: false,
        error: "Transaction submitted but validation timed out",
      };
    }

    return { hash: txHash, success: true };
  } catch (error) {
    options?.onStatus?.(
      "error",
      error instanceof Error ? error.message : "Transaction failed",
    );
    return {
      hash: "",
      success: false,
      error: error instanceof Error ? error.message : "Transaction failed",
    };
  }
}