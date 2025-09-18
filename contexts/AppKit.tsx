import { createAppKit } from "@reown/appkit/react";
import { projectId } from "@/config/wagmi";
import { bitcoinAdapter, metadata, supportedChains } from "@/config/reown";
import React, { type ReactNode } from "react";

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
