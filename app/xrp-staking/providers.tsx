"use client";

import { XrpClientProvider } from "@/components/Staking/xrp/XRPClientProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return <XrpClientProvider>{children}</XrpClientProvider>;
}
