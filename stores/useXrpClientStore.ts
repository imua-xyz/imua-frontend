// stores/useXrpClientStore.ts
import { create } from 'zustand';
import { Client } from 'xrpl';
import { GemWalletNetwork } from '@/types/staking';

interface XrpClientState {
  client: Client | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  currentNetwork: GemWalletNetwork | null;
  
  // Actions
  connect: (network: GemWalletNetwork) => Promise<void>;
  disconnect: () => Promise<void>;
  getAccountInfo: (address: string) => Promise<{ 
    success: boolean; 
    data: { balance: bigint; sequence: number }; 
    error?: Error 
  }>;
  getTransactionStatus: (hash: string) => Promise<{ 
    success: boolean; 
    data: { finalized: boolean; success: boolean }; 
    error?: Error 
  }>;
}

export const useXrpClientStore = create<XrpClientState>()((set, get) => ({
  client: null,
  isConnected: false,
  isConnecting: false,
  error: null,
  currentNetwork: null,
  
  connect: async (network: GemWalletNetwork) => {
    const { client, isConnected, currentNetwork } = get();
    
    // Don't reconnect if already connected to this network
    if (isConnected && currentNetwork?.websocket === network.websocket) {
      return;
    }
    
    // Disconnect current client if exists
    if (client) {
      try {
        await client.disconnect();
      } catch (e) {
        console.error("Error disconnecting client:", e);
      }
    }
    
    set({
      client: null,
      isConnected: false,
      isConnecting: true,
      currentNetwork: network,
      error: null
    });
    
    try {
      const newClient = new Client(network.websocket);
      await newClient.connect();
      
      set({
        client: newClient,
        isConnected: true,
        isConnecting: false
      });
      console.log("XRP client connected successfully");
    } catch (err) {
      console.error("Error connecting to XRP network:", err);
      set({
        isConnecting: false,
        error: err instanceof Error ? err : new Error(String(err))
      });
    }
  },
  
  disconnect: async () => {
    const { client } = get();
    
    if (client) {
      try {
        await client.disconnect();
      } catch (e) {
        console.error("Error disconnecting client:", e);
      }
      
      set({
        client: null,
        isConnected: false,
        currentNetwork: null
      });
    }
  },
  
  getAccountInfo: async (address: string) => {
    let { client, isConnected, currentNetwork, connect } = get();
    
    // If not connected but we have network info, try to connect first
    if ((!client || !isConnected) && currentNetwork) {
      try {
        await connect(currentNetwork);
        ({ client, isConnected } = get());
      } catch (err) {
        return {
          success: false,
          error: new Error("Failed to auto-connect to XRP network"),
          data: { balance: BigInt(0), sequence: 0 }
        };
      }
    } else if (!client || !isConnected) {
      return {
        success: false,
        error: new Error("Client not connected and no network information available"),
        data: { balance: BigInt(0), sequence: 0 }
      };
    }

    // If the client is still not connected, return an error
    if (!client || !isConnected) {
      return {
        success: false,
        error: new Error("Client not connected"),
        data: { balance: BigInt(0), sequence: 0 }
      };
    }
    
    try {
      const response = await (client as Client).request({
        command: "account_info",
        account: address,
        ledger_index: "validated"
      });
      
      const balance = response.result.account_data?.Balance
        ? BigInt(response.result.account_data.Balance)
        : BigInt(0);
      
      return {
        success: true,
        data: {
          balance,
          sequence: response.result.account_data?.Sequence
        }
      };
    } catch (err) {
      console.error("XRP Ledger API call error:", err);
      return {
        success: false,
        error: err instanceof Error ? err : new Error(String(err)),
        data: { balance: BigInt(0), sequence: 0 }
      };
    }
  },
  
  getTransactionStatus: async (hash: string) => {
    let { client, isConnected, currentNetwork, connect } = get();
    
    // If not connected but we have network info, try to connect first
    if ((!client || !isConnected) && currentNetwork) {
      try {
        await connect(currentNetwork);
        ({ client, isConnected } = get());
      } catch (err) {
        return {
          success: false,
          error: new Error("Failed to auto-connect to XRP network"),
          data: { finalized: false, success: false }
        };
      }
    } else if (!client || !isConnected) {
      return {
        success: false,
        error: new Error("Client not connected and no network information available"),
        data: { finalized: false, success: false }
      };
    }
    
    try {
      console.log("DEBUG: XRP transaction hash:", hash);
      const response = await (client as Client).request({ command: "tx", transaction: hash });
      console.log("DEBUG: XRP transaction status response:", response);
      
      return {
        success: true,
        data: {
          finalized: response.result.validated ? response.result.validated : false,
          success: response.result.meta && typeof response.result.meta !== "string"
            ? response.result.meta.TransactionResult === "tesSUCCESS"
            : false
        }
      };
    } catch (err) {
      console.error("XRP Ledger API call error:", err);
      return {
        success: false,
        error: err instanceof Error ? err : new Error(String(err)),
        data: { finalized: false, success: false }
      };
    }
  }
}));