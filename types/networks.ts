import ClientChainGatewayABI from "@/abi/ClientChainGateway.abi.json";
import UTXOGatewayABI from "@/abi/UTXOGateway.abi.json";
import deployedContracts from "@/deployedContracts.json";
import { ValidEVMChain } from "@/config/wagmi";

export interface NetworkBase {
  chainName: string;
  customChainIdByImua: number;
  txExplorerUrl?: string;
  accountExplorerUrl?: string;
}

export interface EVMNetwork extends NetworkBase {
  chainName: ValidEVMChain;
  evmChainID: number;
  portalContract: {
    name: string;
    address: `0x${string}`;
    abi: any;
  };
}

export interface XRPL extends NetworkBase {
  chainName: "XRPL";
  customChainIdByImua: 2;
  portalContract: {
    name: "UTXOGateway";
    address: `0x${string}`;
    abi: any;
  };
  txExplorerUrl: "https://testnet.xrpl.org/transactions/";
  accountExplorerUrl: "https://testnet.xrpl.org/accounts/";
}

export const sepolia: EVMNetwork = {
  chainName: "Sepolia",
  evmChainID: 11155111,
  customChainIdByImua: 40161,
  portalContract: {
    name: "ClientChainGateway",
    address: deployedContracts.clientChain.bootstrap as `0x${string}`,
    abi: ClientChainGatewayABI,
  },
  txExplorerUrl: "https://sepolia.etherscan.io/tx/",
  accountExplorerUrl: "https://sepolia.etherscan.io/address/",
} as const;

export const xrpl: XRPL = {
  chainName: "XRPL",
  customChainIdByImua: 2,
  portalContract: {
    name: "UTXOGateway",
    address: deployedContracts.imuachain.utxoGateway as `0x${string}`,
    abi: UTXOGatewayABI,
  },
  txExplorerUrl: "https://testnet.xrpl.org/transactions/",
  accountExplorerUrl: "https://testnet.xrpl.org/accounts/",
} as const;

export const imua = {
  chainName: "Imua",
  evmChainID: 233,
  customChainIdByImua: 40259,
  txExplorerUrl: "https://exoscan.org/tx/",
  accountExplorerUrl: "https://exoscan.org/address/",
} as const;

export type Network = typeof sepolia | typeof xrpl;
