import ClientChainGatewayABI from "@/abi/ClientChainGateway.abi.json";
import UTXOGatewayABI from "@/abi/UTXOGateway.abi.json";
import deployedContracts from "@/deployedContracts.json";
import { ValidEVMChain } from "@/config/wagmi";
import BootstrapABI from "@/abi/Bootstrap.abi.json";

export type ContractType = "ClientChainGateway" | "UTXOGateway" | "Bootstrap";

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
    type: ContractType;
    address: `0x${string}`;
    abi: any;
    bootstrapABI?: any;
  };
}

export interface XRPL extends NetworkBase {
  chainName: "XRPL";
  customChainIdByImua: 2;
  portalContract: {
    type: ContractType;
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
    type: "ClientChainGateway",
    address: deployedContracts.clientChain.bootstrap as `0x${string}`,
    abi: ClientChainGatewayABI,
  },
  txExplorerUrl: "https://sepolia.etherscan.io/tx/",
  accountExplorerUrl: "https://sepolia.etherscan.io/address/",
} as const;

export const hoodi: EVMNetwork = {
  chainName: "Hoodi",
  evmChainID: 560048,
  customChainIdByImua: 999,
  portalContract: {
    type: "ClientChainGateway",
    address: "0xf21FB1667A8Aa3D3ea365D3D1D257f3E4fdd0651",
    abi: ClientChainGatewayABI,
    bootstrapABI: BootstrapABI,
  },
  txExplorerUrl: "https://hoodi.etherscan.io/",
  accountExplorerUrl: "https://hoodi.etherscan.io/address/",
} as const;

export const xrpl: XRPL = {
  chainName: "XRPL",
  customChainIdByImua: 2,
  portalContract: {
    type: "UTXOGateway",
    address: deployedContracts.imuachain.utxoGateway as `0x${string}`,
    abi: UTXOGatewayABI,
  },
  txExplorerUrl: "https://testnet.xrpl.org/transactions/",
  accountExplorerUrl: "https://testnet.xrpl.org/accounts/",
} as const;

export const imuaChain: EVMNetwork = {
  chainName: "Imua",
  evmChainID: 233,
  customChainIdByImua: 40259,
  portalContract: {
    type: "Bootstrap",
    address: "0x0",
    abi: "",
  },
  txExplorerUrl: "https://exoscan.org/tx/",
  accountExplorerUrl: "https://exoscan.org/address/",
} as const;

export type Network =
  | typeof sepolia
  | typeof hoodi
  | typeof xrpl
  | typeof imuaChain;

export const bootstrapContractNetwork = hoodi;
