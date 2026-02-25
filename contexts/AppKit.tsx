import { createAppKit } from "@reown/appkit/react";
import { bitcoinAdapter, metadata, supportedChains } from "@/config/reown";
import React, { type ReactNode } from "react";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

// Create AppKit instance - this creates a global modal that can be used anywhere
// projectId may be empty during build/SSR; AppKit features will be inert until
// the variable is supplied at runtime.
export const appKit = projectId
  ? createAppKit({
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
        "--w3m-font-family": "system-ui, -apple-system, sans-serif",
      },
    })
  : null;

// No provider needed - AppKit is now globally available
export function AppKitContextProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
