// lib/txUtils.ts
// Transaction utility functions for handling EVM and XRPL transactions with phase-based lifecycle
// Supports local, simplex (one-way cross-chain), and duplex (two-way cross-chain) operations
// XRPL operations use UTXOGateway contract to check stake message processing status
import { BaseTxOptions, EVMTxOptions, XrplTxOptions } from "@/types/staking";
import { LAYERZERO_CONFIG } from "@/config/layerzero";
import { MessageResponse } from "@/types/layerzero";

// Timeout and polling constants
const TIMEOUTS = {
  TRANSACTION_RECEIPT: 30_000, // 30 seconds for transaction receipt
  LAYERZERO_QUERY: 300_000, // 5 minutes for LayerZero status
  XRPL_VALIDATION: 60_000, // 1 minute for XRPL validation
} as const;

const POLLING_INTERVALS = {
  LAYERZERO: 5000, // 5 seconds between LayerZero API calls
  XRPL: 2000, // 2 seconds between XRPL status checks
} as const;

const MAX_ATTEMPTS = {
  LAYERZERO: 60, // Max 60 attempts for LayerZero (5 minutes total)
  XRPL: 30, // Max 30 attempts for XRPL (1 minute total)
} as const;

type StateSnapshot = unknown;

interface UTXOGatewayContract {
  read: {
    isStakeMsgProcessed: (params: [number, `0x${string}`]) => Promise<boolean>;
  };
}

// Query LayerZero API for message status with polling
async function queryLayerZeroStatus(
  sourceTxHash: string,
): Promise<{ confirmed: boolean; error?: string; destinationTxHash?: string }> {
  const startTime = Date.now();

  for (let attempt = 1; attempt <= MAX_ATTEMPTS.LAYERZERO; attempt++) {
    try {
      // Check if we've exceeded the timeout
      if (Date.now() - startTime > TIMEOUTS.LAYERZERO_QUERY) {
        return { confirmed: false, error: "LayerZero query timeout exceeded" };
      }

      const response = await fetch(
        `${LAYERZERO_CONFIG.API_ENDPOINT}${LAYERZERO_CONFIG.PATHS.MESSAGE_STATUS(sourceTxHash)}`,
      );

      if (!response.ok) {
        // If it's a 404 or similar, the message might not be indexed yet
        if (response.status === 404) {
          console.log(
            `LayerZero message not indexed yet, attempt ${attempt}/${MAX_ATTEMPTS.LAYERZERO}`,
          );
          // Wait before next attempt (except on last attempt)
          if (attempt < MAX_ATTEMPTS.LAYERZERO) {
            await new Promise((resolve) =>
              setTimeout(resolve, POLLING_INTERVALS.LAYERZERO),
            );
          }
          continue;
        }
        return {
          confirmed: false,
          error: `API request failed: ${response.status}`,
        };
      }

      const data = (await response.json()) as MessageResponse;

      if (!data.data || data.data.length === 0) {
        console.log(
          `No LayerZero message data found, attempt ${attempt}/${MAX_ATTEMPTS.LAYERZERO}`,
        );
        // Wait before next attempt (except on last attempt)
        if (attempt < MAX_ATTEMPTS.LAYERZERO) {
          await new Promise((resolve) =>
            setTimeout(resolve, POLLING_INTERVALS.LAYERZERO),
          );
        }
        continue;
      }

      const message = data.data[0];

      // Check if source transaction is confirmed
      if (message.source?.status !== "SUCCEEDED") {
        console.log(
          `Source transaction not confirmed yet: ${message.source?.status}, attempt ${attempt}/${MAX_ATTEMPTS.LAYERZERO}`,
        );
        // Wait before next attempt (except on last attempt)
        if (attempt < MAX_ATTEMPTS.LAYERZERO) {
          await new Promise((resolve) =>
            setTimeout(resolve, POLLING_INTERVALS.LAYERZERO),
          );
        }
        continue;
      }

      // Check if destination transaction is confirmed
      if (message.destination?.status === "SUCCEEDED") {
        console.log(`LayerZero message confirmed after ${attempt} attempts`);
        return {
          confirmed: true,
          destinationTxHash: message.destination?.tx?.txHash,
        };
      }

      console.log(
        `Destination transaction not confirmed yet: ${message.destination?.status}, attempt ${attempt}/${MAX_ATTEMPTS.LAYERZERO}`,
      );

      // Wait before next attempt (except on last attempt)
      if (attempt < MAX_ATTEMPTS.LAYERZERO) {
        await new Promise((resolve) =>
          setTimeout(resolve, POLLING_INTERVALS.LAYERZERO),
        );
      }
    } catch (error) {
      console.warn(`LayerZero API query attempt ${attempt} failed:`, error);

      // Wait before next attempt (except on last attempt)
      if (attempt < MAX_ATTEMPTS.LAYERZERO) {
        await new Promise((resolve) =>
          setTimeout(resolve, POLLING_INTERVALS.LAYERZERO),
        );
      }
    }
  }

  return { confirmed: false, error: "LayerZero status polling timed out" };
}

// Consolidated completion function for all operation modes
async function handleCompletion(
  hash: string,
  options?: Pick<
    BaseTxOptions,
    "getStateSnapshot" | "verifyCompletion" | "onPhaseChange" | "onSuccess"
  >,
  snapshotBefore?: StateSnapshot,
): Promise<{ hash: string; success: boolean; error?: string }> {
  try {
    // Phase 6: Verifying Completion
    options?.onPhaseChange?.("verifyingCompletion");

    // Use custom verification if provided
    if (options?.verifyCompletion) {
      // Get state snapshot before verification if available
      let snapshotAfter: StateSnapshot | null = null;

      if (options.getStateSnapshot) {
        try {
          snapshotAfter = await options.getStateSnapshot();
        } catch (error) {
          console.warn(
            "Failed to get state snapshot after verification:",
            error,
          );
        }
      }

      const isValid = await options.verifyCompletion(
        snapshotBefore,
        snapshotAfter,
      );
      if (!isValid) {
        return { hash, success: false, error: "Verification failed" };
      }
    }

    // Call onSuccess callback after successful verification
    options?.onSuccess?.({ hash, success: true });

    return { hash, success: true };
  } catch {
    return { hash, success: false, error: "Completion failed" };
  }
}

// Helper for EVM transactions with phase-based lifecycle
export async function handleEVMTxWithStatus({
  mode,
  publicClient,
  spawnTx,
  getStateSnapshot,
  verifyCompletion,
  onPhaseChange,
  approvingTx,
  onSuccess,
}: EVMTxOptions): Promise<{ hash: string; success: boolean; error?: string }> {
  if (!publicClient) throw new Error("Public client not found");

  try {
    // Execute approval transaction if provided
    if (approvingTx) {
      onPhaseChange?.("approving");

      try {
        const approvalHash = await approvingTx();
        const approvalReceipt = await publicClient.waitForTransactionReceipt({
          hash: approvalHash,
          timeout: TIMEOUTS.TRANSACTION_RECEIPT,
        });

        if (approvalReceipt.status !== "success") {
          return {
            hash: "",
            success: false,
            error: "Approval transaction failed",
          };
        }
      } catch {
        return { hash: "", success: false, error: "Approval failed" };
      }
    }

    // Phase 2: Sending Transaction
    onPhaseChange?.("sendingTx");

    // Take initial state snapshot before spawn transaction
    let snapshotBefore: StateSnapshot | null = null;
    if (getStateSnapshot) {
      try {
        snapshotBefore = await getStateSnapshot();
      } catch (error) {
        console.warn("Failed to get initial state snapshot:", error);
      }
    }

    // Execute the spawn transaction
    const hash = await spawnTx();

    // Phase 3: Confirming Transaction
    onPhaseChange?.("confirmingTx");

    // Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      timeout: TIMEOUTS.TRANSACTION_RECEIPT,
    });

    if (receipt.status !== "success") {
      return { hash, success: false, error: "Transaction failed" };
    }

    // Handle different operation modes
    if (mode === "local") {
      // Local operations: go straight to completion
      return await handleCompletion(
        hash,
        {
          verifyCompletion,
          getStateSnapshot,
          onPhaseChange,
          onSuccess,
        },
        snapshotBefore,
      );
    } else if (mode === "simplex" || mode === "duplex") {
      // Cross-chain operations: handle relay and response
      return await handleCrossChainOperation(
        hash,
        mode,
        {
          verifyCompletion,
          getStateSnapshot,
          onPhaseChange,
          onSuccess,
        },
        snapshotBefore,
      );
    }

    return { hash, success: true };
  } catch {
    return { hash: "", success: false, error: "Operation failed" };
  }
}

// Handle cross-chain operations (simplex and duplex)
async function handleCrossChainOperation(
  hash: string,
  mode: "simplex" | "duplex",
  options?: Pick<
    BaseTxOptions,
    "getStateSnapshot" | "verifyCompletion" | "onPhaseChange" | "onSuccess"
  >,
  snapshotBefore?: StateSnapshot,
): Promise<{ hash: string; success: boolean; error?: string }> {
  try {
    // Phase 4: Sending Request
    options?.onPhaseChange?.("sendingRequest");

    // Query LayerZero status
    const relayResult = await queryLayerZeroStatus(hash);

    if (!relayResult.confirmed) {
      return {
        hash,
        success: false,
        error: relayResult.error || "Relay failed",
      };
    }

    if (mode === "duplex") {
      // Duplex mode: wait for response, pass the destination tx hash
      return await handleDuplexResponse(
        hash,
        options,
        snapshotBefore,
        relayResult.destinationTxHash,
      );
    } else {
      // Simplex mode: go to completion
      return await handleCompletion(hash, options, snapshotBefore);
    }
  } catch {
    return { hash, success: false, error: "Operation failed" };
  }
}

// Handle XRPL simplex operations (deposit to Imuachain)
async function handleXrplSimplexOperation(
  txHash: string,
  utxoGateway: UTXOGatewayContract,
  options?: Pick<
    BaseTxOptions,
    "onPhaseChange" | "verifyCompletion" | "getStateSnapshot" | "onSuccess"
  >,
): Promise<{ hash: string; success: boolean; error?: string }> {
  try {
    // Phase 4: Sending Request (XRPL deposit message relayed to Imuachain)
    options?.onPhaseChange?.("sendingRequest");

    if (!utxoGateway) {
      return {
        hash: txHash,
        success: false,
        error: "UTXOGateway contract not available",
      };
    }

    // Convert XRPL tx hash to bytes32 format
    // XRPL tx hash is typically a hex string, we need to ensure it's 32 bytes
    let bytes32Hash: `0x${string}`;
    if (txHash.startsWith("0x")) {
      // Remove 0x prefix and pad to 64 characters (32 bytes)
      const hashWithoutPrefix = txHash.slice(2);
      bytes32Hash = `0x${hashWithoutPrefix.padStart(64, "0")}` as `0x${string}`;
    } else {
      // Add 0x prefix and pad to 64 characters (32 bytes)
      bytes32Hash = `0x${txHash.padStart(64, "0")}` as `0x${string}`;
    }

    // Poll UTXOGateway contract to check if stake message was processed
    const startTime = Date.now();
    let isProcessed = false;

    while (!isProcessed && Date.now() - startTime < TIMEOUTS.LAYERZERO_QUERY) {
      try {
        // Call isStakeMsgProcessed with XRP chain ID (2) and converted tx hash
        const processed = await utxoGateway.read.isStakeMsgProcessed([
          2,
          bytes32Hash,
        ]);

        if (processed) {
          isProcessed = true;
          console.log(
            `XRPL stake message processed after ${Date.now() - startTime}ms`,
          );
          break;
        }

        // Wait before next attempt
        await new Promise((resolve) =>
          setTimeout(resolve, POLLING_INTERVALS.LAYERZERO),
        );
      } catch (error) {
        console.warn("Failed to query UTXOGateway contract:", error);
        // Wait before next attempt
        await new Promise((resolve) =>
          setTimeout(resolve, POLLING_INTERVALS.LAYERZERO),
        );
      }
    }

    if (!isProcessed) {
      return {
        hash: txHash,
        success: false,
        error: "XRPL stake message processing timed out",
      };
    }

    // Phase 6: Verifying Completion
    return await handleCompletion(txHash, options);
  } catch {
    return {
      hash: txHash,
      success: false,
      error: "XRPL simplex operation failed",
    };
  }
}

// Handle duplex mode response
async function handleDuplexResponse(
  hash: string,
  options?: Pick<BaseTxOptions, "onPhaseChange">,
  snapshotBefore?: StateSnapshot,
  destinationTxHash?: string,
): Promise<{ hash: string; success: boolean; error?: string }> {
  try {
    // Phase 5: Receiving Response
    options?.onPhaseChange?.("receivingResponse");

    // For duplex operations, we can check the response status using the destination transaction hash
    if (!destinationTxHash) {
      return {
        hash,
        success: false,
        error: "No destination transaction hash provided for response checking",
      };
    }

    // Use the destination tx hash as source to query the reverse direction (response)
    const responseStatus = await queryLayerZeroStatus(destinationTxHash);

    if (!responseStatus.confirmed) {
      return {
        hash,
        success: false,
        error: responseStatus.error || "Response not confirmed",
      };
    }

    // Response is confirmed, proceed to completion
    console.log(
      `Duplex response confirmed: ${responseStatus.destinationTxHash}`,
    );

    // Phase 6: Verifying Completion
    return await handleCompletion(hash, options, snapshotBefore);
  } catch {
    return { hash, success: false, error: "Operation failed" };
  }
}

// Helper for XRPL transactions
export async function handleXrplTxWithStatus({
  mode,
  spawnTx,
  getTransactionStatus,
  getStateSnapshot,
  verifyCompletion,
  onPhaseChange,
  onSuccess,
  utxoGateway,
}: XrplTxOptions): Promise<{ hash: string; success: boolean; error?: string }> {
  try {
    onPhaseChange?.("sendingTx");

    const response = await spawnTx();

    if (!response.data?.hash) {
      return {
        hash: "",
        success: false,
        error: "Transaction failed to be broadcasted",
      };
    }

    const txHash = response.data.hash.result.hash;

    // Phase 3: Confirming Transaction
    onPhaseChange?.("confirmingTx");

    // Poll XRPL status
    const startTime = Date.now();
    let isValidated = false;

    while (!isValidated && Date.now() - startTime < TIMEOUTS.XRPL_VALIDATION) {
      const status = await getTransactionStatus(txHash);

      if (status.success && status.data?.finalized) {
        isValidated = true;
        if (status.data?.success) {
          // Handle completion based on mode
          if (mode === "local") {
            return await handleCompletion(txHash, {
              verifyCompletion,
              getStateSnapshot,
              onPhaseChange,
              onSuccess,
            });
          } else if (mode === "simplex") {
            // Simplex mode: handle cross-chain relay to Imuachain
            return await handleXrplSimplexOperation(txHash, utxoGateway, {
              verifyCompletion,
              getStateSnapshot,
              onPhaseChange,
              onSuccess,
            });
          } else {
            // Duplex mode not supported for XRPL
            return {
              hash: txHash,
              success: false,
              error: "Duplex mode not supported for XRPL operations",
            };
          }
        } else {
          return {
            hash: txHash,
            success: false,
            error: "Transaction failed on the ledger",
          };
        }
      }

      await new Promise((resolve) =>
        setTimeout(resolve, POLLING_INTERVALS.XRPL),
      );
    }

    // Timeout
    return {
      hash: txHash,
      success: false,
      error: "Transaction validation timed out",
    };
  } catch {
    return {
      hash: "",
      success: false,
      error: "Operation failed",
    };
  }
}
