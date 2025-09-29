import { createAppKit } from "@reown/appkit/react";
import { bitcoinAdapter, metadata, supportedChains } from "@/config/reown";
import React, { type ReactNode } from "react";

// Get this from WalletConnect dashboard
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
if (!projectId) {
  throw new Error("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set");
}

// Create AppKit instance - this creates a global modal that can be used anywhere
export const appKit = createAppKit({
  adapters: [bitcoinAdapter],
  networks: supportedChains,
  metadata,
  projectId,
  features: {
    analytics: true,
    email: false,
    socials: [],
  },
  themeMode: "dark",
  themeVariables: {
    "--w3m-accent": "#00e5ff",
    // Use system fonts to avoid CORS issues
    "--w3m-font-family": "system-ui, -apple-system, sans-serif",
  },
});

// No provider needed - AppKit is now globally available
export function AppKitContextProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
