export const LAYERZERO_CONFIG = {
  API_ENDPOINT: "https://scan-testnet.layerzero-api.com",
  PATHS: {
    MESSAGE_STATUS: (sourceTxHash: string) => `/v1/messages/tx/${sourceTxHash}`,
  },
} as const;
