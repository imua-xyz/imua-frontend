import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Client } from "xrpl";
import { GemWalletNetwork } from "@/types/staking";

export interface XrpClientContextType {
  client: Client | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  connect: (network: GemWalletNetwork) => void;
  disconnect: () => void;
  getAccountInfo: (address: string) => Promise<{
    success: boolean;
    data?: { balance: bigint; sequence?: number; accountData?: any };
    error?: Error;
  }>;
  getTransactionStatus: (hash: string) => Promise<{
    success: boolean;
    data?: { finalized: boolean; success: boolean };
    error?: Error;
  }>;
}

export const XrpClientContext = createContext<XrpClientContextType>({
  client: null,
  isConnected: false,
  isConnecting: false,
  error: null,
  connect: () => {},
  disconnect: () => {},
  getAccountInfo: async () => ({
    success: false,
    error: new Error("Context not initialized"),
  }),
  getTransactionStatus: async () => ({
    success: false,
    error: new Error("Context not initialized"),
  }),
});
