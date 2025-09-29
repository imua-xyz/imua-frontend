import { BitcoinAdapter } from "@reown/appkit-adapter-bitcoin";
import { bitcoinTestnet, AppKitNetwork } from "@reown/appkit/networks";

// Get this from WalletConnect dashboard
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
if (!projectId) {
  throw new Error("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set");
}

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
