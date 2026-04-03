// app/providers.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { AppKitContextProvider } from "@/contexts/AppKit";
import { ApolloProvider } from "@/components/providers/ApolloProvider";
import "@rainbow-me/rainbowkit/styles.css";
import { config } from "@/config/wagmi";
import { useState } from "react";
import { useOptimisticCacheCleanup } from "@/hooks/useOptimisticCacheCleanup";
import { installE2EAnvilFetchPatch } from "@/lib/e2e-anvil-fetch-patch";

if (
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_E2E_MODE === "true"
) {
  installE2EAnvilFetchPatch();
}

function OptimisticCacheCleanup() {
  useOptimisticCacheCleanup();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <AppKitContextProvider>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <ApolloProvider>
            <RainbowKitProvider>
              <OptimisticCacheCleanup />
              {children}
            </RainbowKitProvider>
          </ApolloProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </AppKitContextProvider>
  );
}
