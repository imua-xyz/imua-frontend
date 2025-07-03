import { useGemWalletStore } from "@/stores/gemWalletClient";
import { GemWalletResponse } from "@/types/staking";
import { metaMask } from "wagmi/connectors";
import { config } from "@/config/wagmi";

export interface ConnectorBase {
  evmCompatible: boolean;
  requireExtraConnectToImua: boolean;
  customConnector?: CustomConnector;
  installUrl?: string;
}

export interface CustomConnector {
  name: string;
  iconUrl: string;
}

export interface EVMConnector extends ConnectorBase {
  evmCompatible: true;
  requireExtraConnectToImua: false;
  customConnector: undefined;
}

export interface NonEVMConnector extends ConnectorBase {
  evmCompatible: false;
  requireExtraConnectToImua: boolean;
  customConnector: CustomConnector;
}

export const evmConnector: EVMConnector = {
  evmCompatible: true,
  requireExtraConnectToImua: false,
  customConnector: undefined,
  installUrl: "https://metamask.io/download/",
} as const;

export const gemConnector: NonEVMConnector = {
  evmCompatible: false,
  requireExtraConnectToImua: true,
  customConnector: {
    name: "GemWallet",
    iconUrl: "/gem-logo.svg",
  },
  installUrl: "https://chromewebstore.google.com/detail/gemwallet/egebedonbdapoieedfcfkofloclfghab?hl=en",
} as const;