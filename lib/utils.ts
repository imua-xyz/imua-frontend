import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { fromBech32 } from "@cosmjs/encoding";
import { BaseError } from "viem";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isValidOperatorAddress(address: string): boolean {
  try {
    const { prefix, data } = fromBech32(address);
    return prefix === "im" && data.length === 20;
  } catch {
    return false;
  }
}

/** Pull viem/wagmi details out of nested errors (RPC, simulation, etc.). */
export function formatEVMTransactionError(error: unknown): string {
  if (error instanceof BaseError) {
    const parts = [
      error.shortMessage,
      error.details ? `Details: ${error.details}` : null,
      ...(error.metaMessages ?? []),
    ].filter(Boolean) as string[];
    return parts.join("\n");
  }
  if (error instanceof Error) {
    let msg = error.message;
    const cause = (error as Error & { cause?: unknown }).cause;
    if (cause instanceof Error) {
      msg += ` | cause: ${cause.message}`;
    } else if (cause != null) {
      msg += ` | cause: ${String(cause)}`;
    }
    return msg;
  }
  return String(error);
}

const isE2EVerboseErrors =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_E2E_MODE === "true";

// Get short error message for display
export const getShortErrorMessage = (error: unknown): string => {
  const formatted = formatEVMTransactionError(error);

  if (isE2EVerboseErrors) {
    return formatted.length > 4000
      ? `${formatted.slice(0, 4000)}…`
      : formatted;
  }

  let message = formatted || "Operation failed";
  let simulated = false;
  if (message.includes("Transaction simulation failed: ")) {
    simulated = true;
    message = message.replace("Transaction simulation failed: ", "");
  }

  // Common error patterns
  if (message.includes("insufficient funds")) {
    return "Insufficient funds for transaction";
  }

  if (message.includes("user rejected") || message.includes("User denied")) {
    return "Transaction rejected by user";
  }

  if (message.includes("network") || message.includes("timeout")) {
    return "Network error occurred";
  }

  if (message.includes("gas")) {
    return "Transaction failed - gas issue";
  }

  // Default: smart truncation (30 was too aggressive — hid real RPC text in the UI)
  const maxLength = 180;
  if (message.length <= maxLength) {
    return message;
  }

  // Try to break at sentence boundaries
  const sentences = message.split(". ");
  let short = "";

  for (const sentence of sentences) {
    if ((short + sentence + ". ").length <= maxLength) {
      short += sentence + ". ";
    } else {
      break;
    }
  }

  if (!short) {
    // Fallback to word boundary
    const words = message.split(" ");
    for (const word of words) {
      if ((short + word + " ").length <= maxLength) {
        short += word + " ";
      } else {
        break;
      }
    }
  }

  return (
    (simulated ? "Simulation: " : "") +
    short.trim() +
    (short.length < message.length ? "..." : "")
  );
};
