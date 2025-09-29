import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { fromBech32 } from "@cosmjs/encoding";

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

// Get short error message for display
export const getShortErrorMessage = (error: unknown): string => {
  let message = (error instanceof Error ? error.message : "Operation failed");
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

  // Default: smart truncation
  const maxLength = 60;
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

  return (simulated ? "Simulation: " : "") +
    short.trim() + (short.length < message.length ? "..." : "");
};
