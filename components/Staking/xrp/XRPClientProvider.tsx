import { useState, useEffect, ReactNode } from "react";
import { XrpClientContext } from "@/types/xrpClientContext";
import { GemWalletNetwork } from "@/types/staking";
import { Client } from "xrpl";

export function XrpClientProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<Client | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentNetwork, setCurrentNetwork] = useState<GemWalletNetwork | null>(
    null,
  );

  // Connect to a network
  const connect = async (network: GemWalletNetwork) => {
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
      setClient(null);
      setIsConnected(false);
    }

    setIsConnecting(true);
    setCurrentNetwork(network);
    setError(null);

    try {
      const newClient = new Client(network.websocket);
      await newClient.connect();

      setClient(newClient);
      setIsConnected(true);
      console.log("XRP client connected successfully");
    } catch (err) {
      console.error("Error connecting to XRP network:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect client
  const disconnect = async () => {
    if (client) {
      try {
        await client.disconnect();
      } catch (e) {
        console.error("Error disconnecting client:", e);
      }
      setClient(null);
      setIsConnected(false);
      setCurrentNetwork(null);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (client) {
        client
          .disconnect()
          .catch((e) => console.error("Error disconnecting client:", e));
      }
    };
  }, []);

  // Helper function for client API calls with better error handling
  const safeClientCall = async <T,>(
    apiCall: (client: Client) => Promise<T>,
    defaultValue: T,
  ): Promise<{ success: boolean; data: T; error?: Error }> => {
    if (!client || !isConnected) {
      return {
        success: false,
        error: new Error("Client not connected"),
        data: defaultValue,
      };
    }

    try {
      const result = await apiCall(client);
      return { success: true, data: result };
    } catch (err) {
      console.error("XRP Ledger API call error:", err);
      return {
        success: false,
        error: err instanceof Error ? err : new Error(String(err)),
        data: defaultValue,
      };
    }
  };

  // Account info helper
  const getAccountInfo = async (address: string) => {
    return safeClientCall(
      async (c) => {
        const response = await c.request({
          command: "account_info",
          account: address,
          ledger_index: "validated",
        });

        const balance = response.result.account_data?.Balance
          ? BigInt(response.result.account_data.Balance)
          : BigInt(0);

        return {
          balance,
          sequence: response.result.account_data?.Sequence,
        };
      },
      { balance: BigInt(0), sequence: 0 },
    );
  };

  const getTransactionStatus = async (hash: string) => {
    return safeClientCall(
      async (c) => {
        const response = await c.request({ command: "tx", tx_hash: hash });
        return {
          finalized: response.result.validated
            ? response.result.validated
            : false,
          success:
            response.result.meta && typeof response.result.meta !== "string"
              ? response.result.meta.TransactionResult === "tesSUCCESS"
              : false,
        };
      },
      { finalized: false, success: false },
    );
  };

  return (
    <XrpClientContext.Provider
      value={{
        client,
        isConnected,
        isConnecting,
        error,
        connect,
        disconnect,
        getAccountInfo,
        getTransactionStatus,
      }}
    >
      {children}
    </XrpClientContext.Provider>
  );
}
