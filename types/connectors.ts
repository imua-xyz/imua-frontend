import { useGemWalletStore } from "@/stores/gemWalletClient";
import { GemWalletResponse } from "@/types/staking";
import { metaMask } from "wagmi/connectors";
import { config } from "@/config/wagmi";

export interface ConnectorBase {
  evmCompatible: boolean;
  requireExtraConnectToImua: boolean;
  customConnector?: CustomConnector;
}

export interface CustomConnector {
  name: string;
  iconUrl: string;
  checkInstallation: () => Promise<boolean>;
  connect: () => Promise<any>;
  disconnect: () => Promise<any>;
}

export interface EVMConnector extends ConnectorBase {
  evmCompatible: true;
  requireExtraConnectToImua: false;
}

export interface NonEVMConnector extends ConnectorBase {
  evmCompatible: false;
  requireExtraConnectToImua: boolean;
  customConnector: CustomConnector;
}

export const evmConnector: EVMConnector = {
  evmCompatible: true,
  requireExtraConnectToImua: false,
};

export const gemConnector: NonEVMConnector = {
  evmCompatible: false,
  requireExtraConnectToImua: true,
  customConnector: {
    name: "GemWallet",
    iconUrl: "/gem-logo.svg",
    checkInstallation: useGemWalletStore.getState().checkInstallation,
    connect: useGemWalletStore.getState().connect,
    disconnect: useGemWalletStore.getState().disconnect,
  },
} as const;