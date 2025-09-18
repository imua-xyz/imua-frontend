import { createAppKit } from "@reown/appkit/react";
import { BitcoinAdapter } from "@reown/appkit-adapter-bitcoin";
import { projectId } from "./wagmi";
import { bitcoinTestnet, AppKitNetwork } from "@reown/appkit/networks";

// Set up Bitcoin Adapter
export const bitcoinAdapter = new BitcoinAdapter({
  projectId,
});

// Create a metadata object
export const metadata = {
  name: "Imua Staking",
  description: "Omnichain Restaking Platform",
  url: "https://www.imua.xyz/",
  icons: ["public/imua-logo.avif"],
};

export const supportedChains = [bitcoinTestnet] as [
  AppKitNetwork,
  ...AppKitNetwork[],
];
