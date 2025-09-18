"use client";

import { useCallback, useMemo } from "react";
import * as bitcoin from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";
import { getFeeRates } from "./useFeeRate";
import { useUTXOSet, UTXO } from "./useUTXOSet";
import { useRawTransactions, RawTransaction } from "./useRawTransactions";
import { DUST_THRESHOLD } from "@/config/bitcoin";

// Initialize ECC library for Taproot support
bitcoin.initEccLib(ecc);

// Transaction size constants for fee estimation
const TX_SIZE_CONSTANTS = {
  // Typical stake transaction structure
  TYPICAL_INPUTS: 2, // 2 inputs
  TYPICAL_OUTPUTS: 3, // 3 outputs (OP_RETURN + vault + change)
  INPUT_SIZE: 68, // ~68 vBytes per input
  OUTPUT_SIZE: 31, // ~31 vBytes per regular output
  OP_RETURN_SIZE: 72, // 72 vBytes for OP_RETURN output
  OVERHEAD: 10.5, // ~10.5 vBytes base transaction overhead
} as const;

type DetailedAddressType =
  | "P2WPKH"
  | "P2WSH"
  | "P2TR"
  | "P2PKH"
  | "P2SH"
  | "P2SH_P2WPKH"
  | "Unknown";

export interface PSBTBuildOptions {
  vaultAddress: string;
  amount: bigint;
  opReturnData: string;
  feeStrategy?: "fast" | "balanced" | "economical";
}

export interface PSBTBuildResult {
  psbt: string; // Base64 encoded PSBT
  estimatedFee: number;
  changeAmount?: bigint;
  selectedUTXOs: UTXO[];
  totalInputSats: bigint;
}

export interface PSBTBuilderState {
  isLoading: boolean;
  error: Error | null;
  canBuild: boolean;
  estimatedFee: number;
  changeAmount?: bigint;
  selectedUTXOs: UTXO[];
  totalInputSats: bigint;
  buildPSBT: (options: PSBTBuildOptions) => Promise<PSBTBuildResult>;
}

// Calculate estimated fee for typical stake transaction
function calculateEstimatedFee(feeRate: number): number {
  const typicalSize =
    TX_SIZE_CONSTANTS.TYPICAL_INPUTS * TX_SIZE_CONSTANTS.INPUT_SIZE +
    TX_SIZE_CONSTANTS.OP_RETURN_SIZE + // OP_RETURN output (larger than regular output)
    (TX_SIZE_CONSTANTS.TYPICAL_OUTPUTS - 1) * TX_SIZE_CONSTANTS.OUTPUT_SIZE + // Vault + change outputs
    TX_SIZE_CONSTANTS.OVERHEAD;

  return Math.ceil(typicalSize * feeRate);
}

// Sort UTXOs by confirmation status first, then by value (ascending) for optimal selection
function sortUTXOsByValue(utxos: UTXO[]): UTXO[] {
  return [...utxos].sort((a, b) => {
    // Confirmed UTXOs first
    if (a.status.confirmed && !b.status.confirmed) return -1;
    if (!a.status.confirmed && b.status.confirmed) return 1;

    // Then sort by value (ascending)
    return Number(a.value - b.value);
  });
}

// Select smallest UTXOs to cover required amount
function selectUTXOsForAmount(
  utxos: UTXO[],
  requiredAmount: bigint,
  isSegwit: boolean = true, // Default to segwit (allows unconfirmed)
): {
  selectedUTXOs: UTXO[];
  totalAmount: bigint;
} {
  // For P2SH addresses, only use confirmed UTXOs to avoid mempool issues
  const availableUTXOs = isSegwit
    ? utxos
    : utxos.filter((utxo) => utxo.status.confirmed);

  const sortedUTXOs = sortUTXOsByValue(availableUTXOs);
  const selectedUTXOs: UTXO[] = [];
  let totalAmount = BigInt(0);

  for (const utxo of sortedUTXOs) {
    selectedUTXOs.push(utxo);
    totalAmount = totalAmount + BigInt(utxo.value);

    if (totalAmount >= requiredAmount) {
      break;
    }
  }

  return { selectedUTXOs, totalAmount };
}

// Calculate PSBT virtual size using sum-of-parts heuristics (BIP-141 aligned)
function estimatePSBTVirtualSize(
  psbt: bitcoin.Psbt,
  detailedAddressType: DetailedAddressType,
): number {
  // Per-type input vbytes mapping (conservative where variable)
  const inputVBytesMap: Record<DetailedAddressType, number> = {
    P2WPKH: 68,
    P2WSH: 109, // depends on witness script; conservative default
    P2TR: 58, // ~57-58 vB keypath spend
    P2PKH: 148,
    P2SH: 109, // bare P2SH unknown redeem script, conservative
    P2SH_P2WPKH: 91,
    Unknown: 148,
  };

  let totalVSize = TX_SIZE_CONSTANTS.OVERHEAD;
  for (const out of psbt.txOutputs) totalVSize += 9 + out.script.length;
  const perInput = inputVBytesMap[detailedAddressType] ?? 148;
  totalVSize += psbt.data.inputs.length * perInput;
  return Math.ceil(totalVSize);
}

/**
 * Returns whether the address is segwit and a detailed script type.
 */
function getAddressInfo(address: string): {
  isSegwit: boolean;
  type: DetailedAddressType;
} {
  if (typeof address !== "string") return { isSegwit: false, type: "Unknown" };

  // Try bech32/bech32m decode for segwit/taproot
  try {
    const dec = bitcoin.address.fromBech32(address);
    // version 1 => Taproot
    if (dec.version === 1) return { isSegwit: true, type: "P2TR" };
    // version 0 => P2WPKH (20-byte program) or P2WSH (32-byte program)
    if (dec.version === 0) {
      if (dec.data.length === 20) return { isSegwit: true, type: "P2WPKH" };
      if (dec.data.length === 32) return { isSegwit: true, type: "P2WSH" };
      return { isSegwit: true, type: "Unknown" };
    }
    // Other versions: treat as segwit unknown
    return { isSegwit: true, type: "Unknown" };
  } catch (error) {
    // Not bech32, fall back to Base58 prefixes
    if (
      address.startsWith("1") ||
      address.startsWith("m") ||
      address.startsWith("n")
    ) {
      return { isSegwit: false, type: "P2PKH" };
    }
    if (address.startsWith("3") || address.startsWith("2")) {
      // For addresses starting with 2 or 3, we need to determine if it's P2SH or P2SH-P2WPKH
      // We can't determine this from the address alone - we need to examine the UTXO's scriptPubKey
      // For now, we'll assume P2SH and let the PSBT construction logic handle the detection
      return { isSegwit: false, type: "P2SH" };
    }
    return { isSegwit: false, type: "Unknown" };
  }
}

// Helper function to get address script for PSBT construction
function getAddressScript(address: string, network: bitcoin.Network): Buffer {
  try {
    return bitcoin.address.toOutputScript(address, network);
  } catch (error) {
    console.error(`Error generating script for address ${address}:`, error);
    console.error(`Address details:`, {
      address,
      network: network === bitcoin.networks.testnet ? "testnet" : "mainnet",
      addressType: getAddressInfo(address),
    });
    throw new Error(`Invalid Bitcoin address: ${address}`);
  }
}

// Helper function to convert hex string to Buffer
function hexToBuffer(hex: string): Buffer {
  return Buffer.from(hex, "hex");
}

// Helper: Detect nested P2SH-P2WPKH by rebuilding from pubkey and comparing scriptPubKey
function isNestedP2WPKHForAddressScript(
  addressScript: Buffer,
  publicKey: Buffer,
  network: bitcoin.Network,
): boolean {
  try {
    const p2wpkh = bitcoin.payments.p2wpkh({ pubkey: publicKey, network });
    const nested = bitcoin.payments.p2sh({ redeem: p2wpkh, network });
    return !!nested.output && nested.output.equals(addressScript);
  } catch (_e) {
    return false;
  }
}

// Helper: quick check if an output script is P2SH (OP_HASH160 <20> OP_EQUAL)
function isP2SHScript(script: Buffer): boolean {
  return (
    script.length === 23 &&
    script[0] === 0xa9 &&
    script[1] === 0x14 &&
    script[22] === 0x87
  );
}

// Helper function to create PSBT with inputs using React Query cached data
function createPSBTWithInputs(
  selectedUTXOs: UTXO[],
  isSegwit: boolean,
  addressScript: Buffer,
  rawTransactions?: RawTransaction[],
  publicKey?: Buffer,
): bitcoin.Psbt {
  const psbt = new bitcoin.Psbt({ network: bitcoin.networks.testnet });

  for (let i = 0; i < selectedUTXOs.length; i++) {
    const utxo = selectedUTXOs[i];

    if (isSegwit) {
      // Native SegWit addresses (P2WPKH, P2WSH, P2TR)
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
          script: addressScript,
          value: utxo.value,
        },
      });
    } else {
      // If this looks like P2SH by script AND we have no pubkey, fail fast with guidance
      if (isP2SHScript(addressScript) && !publicKey) {
        throw new Error(
          "Address appears to be P2SH. If it is nested SegWit (P2SH-P2WPKH), a public key is required to derive the redeemScript. Provide pubkey or use a native SegWit address.",
        );
      }

      // Short-circuit: if this is nested P2SH-P2WPKH (pubkey present & matches),
      // we do not need full transactions; use witnessUtxo + redeemScript.
      if (
        publicKey &&
        isNestedP2WPKHForAddressScript(
          addressScript,
          publicKey,
          bitcoin.networks.testnet,
        )
      ) {
        const p2wpkh = bitcoin.payments.p2wpkh({
          pubkey: publicKey,
          network: bitcoin.networks.testnet,
        });
        if (!p2wpkh.output) {
          throw new Error("Failed to derive redeemScript for nested P2WPKH");
        }
        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          witnessUtxo: {
            script: addressScript,
            value: utxo.value,
          },
          redeemScript: p2wpkh.output,
        });
        continue;
      }

      if (!rawTransactions) {
        throw new Error("Raw transactions not available for legacy address");
      }

      const rawTx = rawTransactions.find((tx) => tx.txid === utxo.txid);
      if (!rawTx) {
        throw new Error(`Raw transaction not found for ${utxo.txid}.`);
      }

      // Use the raw transaction hex directly - this is much more reliable
      console.log(`Using raw transaction hex for ${utxo.txid}`);
      const transactionBuffer = hexToBuffer(rawTx.hex);

      // Validate the raw transaction hash
      const parsedTx = bitcoin.Transaction.fromHex(rawTx.hex);
      const parsedHash = parsedTx.getId();
      if (parsedHash !== utxo.txid) {
        console.warn(
          `Raw transaction hash mismatch for ${utxo.txid}: expected ${utxo.txid}, got ${parsedHash}`,
        );
      }

      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        nonWitnessUtxo: transactionBuffer,
      });
    }
  }

  return psbt;
}

export function useBitcoinPSBTBuilder(
  paymentAddress?: string,
  publicKey?: string, // Hex-encoded public key for P2SH-P2WPKH redeem script construction
): PSBTBuilderState {
  // Get UTXO set for the payment address
  const {
    utxos,
    balance: utxoBalance,
    isLoading: utxosLoading,
    error: utxosError,
  } = useUTXOSet(paymentAddress);

  // Get address type to determine if we need full transactions
  const { isSegwit, type: detailedAddressType } = paymentAddress
    ? getAddressInfo(paymentAddress)
    : { isSegwit: false, type: "Unknown" as DetailedAddressType };

  // Convert hex public key to Buffer if provided
  const publicKeyBuffer = publicKey ? Buffer.from(publicKey, "hex") : undefined;

  // P2SH-P2WPKH addresses are treated as SegWit for PSBT construction
  // This avoids the empty scriptsig issue in transaction reconstruction
  const needsRawTransactions = !isSegwit;

  // Get raw transaction hexes for legacy addresses
  const txids = needsRawTransactions ? utxos.map((utxo) => utxo.txid) : [];
  const {
    data: rawTransactions,
    isLoading: rawTxLoading,
    error: rawTxError,
  } = useRawTransactions(txids);

  const isLoading = utxosLoading || (needsRawTransactions && rawTxLoading);
  const error = utxosError || rawTxError;

  // Estimated fee placeholder; will compute after fetching rate in build
  const estimatedFee = 0;

  const canBuild = useMemo(() => {
    return !!(
      paymentAddress &&
      utxos.length > 0 &&
      !isLoading &&
      !error &&
      (!needsRawTransactions || rawTransactions)
    );
  }, [
    paymentAddress,
    utxos.length,
    isLoading,
    error,
    needsRawTransactions,
    rawTransactions,
  ]);

  const buildPSBT = useCallback(
    async (options: PSBTBuildOptions): Promise<PSBTBuildResult> => {
      if (!paymentAddress) {
        throw new Error("Payment address not available");
      }

      if (utxosError) {
        throw new Error(`UTXO fetch error: ${utxosError.message}`);
      }

      // Validate that we have fresh UTXO data
      if (utxos.length === 0) {
        throw new Error(
          "No UTXOs available for this address. Please ensure the address has received funds.",
        );
      }

      // Check for unconfirmed UTXOs and warn/filter them
      const unconfirmedUTXOs = utxos.filter((utxo) => !utxo.status.confirmed);
      if (unconfirmedUTXOs.length > 0) {
        console.warn(
          `Found ${unconfirmedUTXOs.length} unconfirmed UTXOs. These may cause transaction failures.`,
        );
        unconfirmedUTXOs.forEach((utxo) => {
          console.warn(
            `Unconfirmed UTXO: ${utxo.txid}:${utxo.vout} = ${utxo.value} sats`,
          );
        });

        // For non-segwit addresses, we should avoid unconfirmed UTXOs entirely
        if (!isSegwit) {
          const confirmedUTXOs = utxos.filter((utxo) => utxo.status.confirmed);
          if (confirmedUTXOs.length === 0) {
            throw new Error(
              `No confirmed UTXOs available for non-segwit address. All ${utxos.length} UTXOs are unconfirmed and may cause transaction failures. Please wait for confirmation or use a different address with confirmed funds.`,
            );
          }
          console.warn(
            `Using only ${confirmedUTXOs.length} confirmed UTXOs out of ${utxos.length} total UTXOs.`,
          );
        }
      }

      // For non-segwit addresses, ensure we have raw transaction data
      if (!isSegwit && (!rawTransactions || rawTransactions.length === 0)) {
        throw new Error(
          "Raw transaction data not available for non-segwit address. This may be due to network issues or stale cache.",
        );
      }

      // Fetch real-time market fee rates for all strategies
      const feeRates = await getFeeRates();
      const liveFee = feeRates[options.feeStrategy ?? "balanced"];

      if (liveFee.feeRate === 0) {
        throw new Error("Unable to get fee rate");
      }

      // Get address script for PSBT construction
      const addressScript = getAddressScript(
        paymentAddress,
        bitcoin.networks.testnet,
      );

      // Step 1: Calculate estimated fee for typical stake transaction
      const estimatedFee = calculateEstimatedFee(liveFee.feeRate);

      // Step 2: Use current market fee rate
      const marketFeeRate = liveFee.feeRate;

      // Step 3: Sort UTXOs and select smallest ones to cover transfer amount + estimated fee
      const requiredAmount = options.amount + BigInt(estimatedFee);

      if (utxoBalance < requiredAmount) {
        throw new Error(
          `Insufficient funds. Need ${requiredAmount} sats (${options.amount} + ${estimatedFee} fee), have ${utxoBalance} sats`,
        );
      }

      let selectedUTXOs: UTXO[] = [];
      let totalInputSats = BigInt(0);
      let finalFee = estimatedFee;
      let changeAmount: bigint | undefined;
      let psbt: bitcoin.Psbt;

      // Step 4-7: Iterative UTXO selection and PSBT construction
      let attempt = 0;
      const maxAttempts = 10; // Prevent infinite loops

      while (attempt < maxAttempts) {
        // Select UTXOs for current attempt
        const selection = selectUTXOsForAmount(
          utxos,
          options.amount + BigInt(finalFee),
          isSegwit,
        );
        selectedUTXOs = selection.selectedUTXOs;
        totalInputSats = selection.totalAmount;

        if (selectedUTXOs.length === 0) {
          throw new Error("No UTXOs available for transaction");
        }

        // Step 4: Construct PSBT object
        psbt = createPSBTWithInputs(
          selectedUTXOs,
          isSegwit,
          addressScript,
          rawTransactions,
          publicKeyBuffer,
        );

        // Add OP_RETURN output with op_return data
        psbt.addOutput({
          script: bitcoin.script.compile([
            bitcoin.opcodes.OP_RETURN,
            Buffer.from(options.opReturnData, "hex"),
          ]),
          value: 0,
        });

        // Add output to vault address
        psbt.addOutput({
          address: options.vaultAddress,
          value: Number(options.amount),
        });

        // Add change output with estimated amount for size calculation
        const estimatedChange =
          totalInputSats - options.amount - BigInt(finalFee);
        psbt.addOutput({
          address: paymentAddress,
          value: Number(
            estimatedChange > BigInt(0) ? estimatedChange : BigInt(0),
          ),
        });

        try {
          // Step 5: Calculate corrected fee using actual virtual size and market fee rate
          const virtualSize = estimatePSBTVirtualSize(
            psbt,
            detailedAddressType,
          );
          const correctedFee = Math.ceil(virtualSize * marketFeeRate);

          // Step 6: Check if total input amount covers transfer + corrected fee
          if (totalInputSats >= options.amount + BigInt(correctedFee)) {
            // Yes - calculate change amount
            const changeSats =
              totalInputSats - options.amount - BigInt(correctedFee);

            if (changeSats > DUST_THRESHOLD) {
              // We have a valid change output - update the existing change output directly
              const currentChange = psbt.txOutputs[2]?.value || 0;
              const changeDifference = Math.abs(
                Number(changeSats) - currentChange,
              );

              // Only rebuild if change amount is significantly different (more than 10% or 1000 sats)
              if (changeDifference > Math.max(1000, Number(changeSats) * 0.1)) {
                // Rebuild with correct change amount using helper function
                psbt = createPSBTWithInputs(
                  selectedUTXOs,
                  isSegwit,
                  addressScript,
                  rawTransactions,
                  publicKeyBuffer,
                );

                // Add OP_RETURN output
                psbt.addOutput({
                  script: bitcoin.script.compile([
                    bitcoin.opcodes.OP_RETURN,
                    Buffer.from(options.opReturnData, "hex"),
                  ]),
                  value: 0,
                });

                // Add vault output
                psbt.addOutput({
                  address: options.vaultAddress,
                  value: Number(options.amount),
                });

                // Add change output with correct amount
                psbt.addOutput({
                  address: paymentAddress,
                  value: Number(changeSats),
                });
              }

              changeAmount = changeSats;
            } else {
              // Change is below dust threshold - rebuild without change output
              psbt = createPSBTWithInputs(
                selectedUTXOs,
                isSegwit,
                addressScript,
                rawTransactions,
                publicKeyBuffer,
              );

              // Add OP_RETURN and vault outputs (no change output)
              psbt.addOutput({
                script: bitcoin.script.compile([
                  bitcoin.opcodes.OP_RETURN,
                  Buffer.from(options.opReturnData, "hex"),
                ]),
                value: 0,
              });

              psbt.addOutput({
                address: options.vaultAddress,
                value: Number(options.amount),
              });
            }

            finalFee = correctedFee;
            break; // Success - exit loop
          } else {
            // No - add more UTXOs and try again
            finalFee = correctedFee;
            attempt++;

            if (attempt >= maxAttempts) {
              throw new Error(
                `Insufficient funds after ${maxAttempts} attempts. Need ${options.amount + BigInt(correctedFee)} sats, have ${totalInputSats} sats`,
              );
            }
          }
        } catch (error) {
          console.error(`Error in attempt ${attempt + 1}:`, error);

          // If this is a UTXO hash mismatch error, try refreshing UTXO data
          if (
            error instanceof Error &&
            error.message.includes("hash") &&
            error.message.includes("prevout")
          ) {
            console.warn(
              "Detected UTXO hash mismatch, this may be due to stale UTXO data. Consider refreshing the page or waiting for cache to update.",
            );

            // For now, we'll throw the error, but in the future we could implement automatic refresh
            throw new Error(
              `UTXO data appears to be stale. The UTXO you're trying to spend may have already been spent in another transaction. Please refresh the page and try again. Original error: ${error.message}`,
            );
          }

          throw new Error(
            `Failed to build PSBT: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      }

      if (!psbt!) {
        throw new Error("Failed to build PSBT after all attempts");
      }

      const psbtBase64 = psbt.toBase64();

      return {
        psbt: psbtBase64,
        estimatedFee: finalFee,
        changeAmount,
        selectedUTXOs,
        totalInputSats,
      };
    },
    [
      paymentAddress,
      utxos,
      utxoBalance,
      utxosError,
      detailedAddressType,
      isSegwit,
      rawTransactions,
      publicKeyBuffer,
    ],
  );

  return {
    isLoading,
    error: error as Error | null,
    canBuild,
    estimatedFee,
    changeAmount: undefined, // Will be calculated during build
    selectedUTXOs: utxos, // All UTXOs available for selection
    totalInputSats: utxoBalance,
    buildPSBT,
  };
}
