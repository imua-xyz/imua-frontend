"use client";

import { Providers } from "./providers";

export default function XrpStakingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="xrp-staking-layout">
      <Providers>{children}</Providers>
    </div>
  );
}
