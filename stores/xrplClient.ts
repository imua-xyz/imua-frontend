// stores/xrplClient.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Client } from "xrpl";
import { GemWalletNetwork } from "@/types/staking";

const createXrplClient = () => {
  const store = create<XrplClientState>()(
    persist(
      (set, get) => ({
        // State - simplified
        client: null,
        currentNetwork: null,
        error: null,

        // Set network without connecting
        setNetwork: (network: GemWalletNetwork) => {
          set({ currentNetwork: network });
        },

        // Connect or reconnect to the network
        connect: async (network?: GemWalletNetwork): Promise<Client> => {
          const { client, currentNetwork } = get();
          const targetNetwork = network || currentNetwork;

          if (!targetNetwork) {
            throw new Error("No network specified for connection");
          }

          // If network changed, we need a new client
          const networkChanged =
            currentNetwork?.websocket !== targetNetwork.websocket;

          try {
            // Try to use existing client if possible
            if (client && !networkChanged) {
              // Check if already connected
              if (client.isConnected()) {
                return client;
              }

              // Try to reconnect existing client
              try {
                await client.connect();
                return client;
              } catch (e) {
                console.error("Failed to reconnect existing client:", e);
                // Fall through to create new client
              }
            }

            // Disconnect old client if it exists
            if (client) {
              try {
                await client.disconnect();
              } catch (e) {
                console.error("Error disconnecting client:", e);
              }
            }

            // Create new client
            const newClient = new Client(targetNetwork.websocket);
            await newClient.connect();

            // Update store
            set({
              client: newClient,
              currentNetwork: targetNetwork,
              error: null,
            });

            console.log("XRP client connected successfully");
            return newClient;
          } catch (err) {
            console.error("Error connecting to XRP network:", err);
            const error = err instanceof Error ? err : new Error(String(err));
            set({ error });
            throw error;
          }
        },

        // Disconnect client
        disconnect: async () => {
          const { client } = get();

          if (client) {
            try {
              await client.disconnect();
            } catch (e) {
              console.error("Error disconnecting client:", e);
            }

            set({ client: null });
          }
        },

        getAccountInfo: async (address: string) => {
          let { client, currentNetwork, connect } = get();
          const isConnected = client ? client.isConnected() : false;

          // If not connected but we have network info, try to connect first
          if ((!client || !isConnected) && currentNetwork) {
            try {
              client = await connect(currentNetwork);
            } catch (err) {
              return {
                success: false,
                error: new Error("Failed to auto-connect to XRP network"),
                data: { balance: BigInt(0), sequence: 0 },
              };
            }
          } else if (!client || !isConnected) {
            return {
              success: false,
              error: new Error(
                "Client not connected and no network information available",
              ),
              data: { balance: BigInt(0), sequence: 0 },
            };
          }

          // If the client is still not connected, return an error
          if (!client || !isConnected) {
            return {
              success: false,
              error: new Error("Client not connected"),
              data: { balance: BigInt(0), sequence: 0 },
            };
          }

          try {
            const response = await (client as Client).request({
              command: "account_info",
              account: address,
              ledger_index: "validated",
            });

            const balance = response.result.account_data?.Balance
              ? BigInt(response.result.account_data.Balance)
              : BigInt(0);

            return {
              success: true,
              data: {
                balance,
                sequence: response.result.account_data?.Sequence,
              },
            };
          } catch (err) {
            console.error("XRP Ledger API call error:", err);
            return {
              success: false,
              error: err instanceof Error ? err : new Error(String(err)),
              data: { balance: BigInt(0), sequence: 0 },
            };
          }
        },

        getTransactionStatus: async (hash: string) => {
          let { client, currentNetwork, connect } = get();
          const isConnected = client ? client.isConnected() : false;
          // If not connected but we have network info, try to connect first
          if ((!client || !isConnected) && currentNetwork) {
            try {
              client = await connect(currentNetwork);
            } catch (err) {
              return {
                success: false,
                error: new Error("Failed to auto-connect to XRP network"),
                data: { finalized: false, success: false },
              };
            }
          } else if (!client || !isConnected) {
            return {
              success: false,
              error: new Error(
                "Client not connected and no network information available",
              ),
              data: { finalized: false, success: false },
            };
          }

          try {
            const response = await (client as Client).request({
              command: "tx",
              transaction: hash,
            });

            return {
              success: true,
              data: {
                finalized: response.result.validated
                  ? response.result.validated
                  : false,
                success:
                  response.result.meta &&
                  typeof response.result.meta !== "string"
                    ? response.result.meta.TransactionResult === "tesSUCCESS"
                    : false,
              },
            };
          } catch (err) {
            console.error("XRP Ledger API call error:", err);
            return {
              success: false,
              error: err instanceof Error ? err : new Error(String(err)),
              data: { finalized: false, success: false },
            };
          }
        },
      }),
      {
        name: "xrpl-client-storage",
        partialize: (state) => ({
          currentNetwork: state.currentNetwork,
        }),
      },
    ),
  );

  return {
    useStore: store,
  };
};

// Create a single instance
export const xrplClient = createXrplClient();

// Export the store for component usage
export const useXrplStore = xrplClient.useStore;

// Export interface for type checking
export interface XrplClientState {
  // State - simplified
  client: Client | null;
  currentNetwork: GemWalletNetwork | null;
  error: Error | null;

  // Actions
  setNetwork: (network: GemWalletNetwork) => void;
  connect: (network?: GemWalletNetwork) => Promise<Client>;
  disconnect: () => Promise<void>;
  getAccountInfo: (address: string) => Promise<{
    success: boolean;
    data: { balance: bigint; sequence: number };
    error?: Error;
  }>;
  getTransactionStatus: (hash: string) => Promise<{
    success: boolean;
    data: { finalized: boolean; success: boolean };
    error?: Error;
  }>;
}
