import ClientChainGatewayABI from "@/abi/ClientChainGateway.abi.json";
import UTXOGatewayABI from "@/abi/UTXOGateway.abi.json";
import deployedContracts from "@/deployedContracts.json";
import { ValidEVMChain } from "@/config/wagmi";
import BootstrapABI from "@/abi/Bootstrap.abi.json";
import {
  ConnectorBase,
  evmConnector,
  gemConnector,
  bitcoinConnector,
} from "./connectors";

export type ContractType = "ClientChainGateway" | "UTXOGateway" | "Bootstrap";

export interface NetworkBase {
  chainName: string;
  customChainIdByImua: number;
  txExplorerUrl?: string;
  accountExplorerUrl?: string;
  connector: ConnectorBase;
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

export interface BitcoinNetwork extends NetworkBase {
  chainName: "Bitcoin";
  customChainIdByImua: 1;
  portalContract: {
    type: ContractType;
    address: `0x${string}`;
    abi: any;
  };
  txExplorerUrl: "https://blockstream.info/tx/";
  accountExplorerUrl: "https://blockstream.info/address/";
}

export interface BitcoinTestnetNetwork extends NetworkBase {
  chainName: "Bitcoin Testnet";
  customChainIdByImua: 1;
  portalContract: {
    type: ContractType;
    address: `0x${string}`;
    abi: any;
  };
  txExplorerUrl: "https://blockstream.info/testnet/tx/";
  accountExplorerUrl: "https://blockstream.info/testnet/address/";
}

export const sepolia: EVMNetwork = {
  chainName: "Sepolia",
  evmChainID: 11155111,
  customChainIdByImua: 40161,
  connector: evmConnector,
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
  connector: evmConnector,
  portalContract: {
    type: "ClientChainGateway",
    address: "0xf21FB1667A8Aa3D3ea365D3D1D257f3E4fdd0651",
    abi: ClientChainGatewayABI,
    bootstrapABI: BootstrapABI,
  },
  txExplorerUrl: "https://hoodi.etherscan.io/tx/",
  accountExplorerUrl: "https://hoodi.etherscan.io/address/",
} as const;

export const xrpl: XRPL = {
  chainName: "XRPL",
  customChainIdByImua: 2,
  connector: gemConnector,
  portalContract: {
    type: "UTXOGateway",
    address: deployedContracts.imuachain.utxoGateway as `0x${string}`,
    abi: UTXOGatewayABI,
  },
  txExplorerUrl: "https://testnet.xrpl.org/transactions/",
  accountExplorerUrl: "https://testnet.xrpl.org/accounts/",
} as const;

export const bitcoin: BitcoinNetwork = {
  chainName: "Bitcoin",
  customChainIdByImua: 1,
  connector: bitcoinConnector,
  portalContract: {
    type: "UTXOGateway",
    address: deployedContracts.imuachain.utxoGateway as `0x${string}`,
    abi: UTXOGatewayABI,
  },
  txExplorerUrl: "https://blockstream.info/tx/",
  accountExplorerUrl: "https://blockstream.info/address/",
} as const;

export const bitcoinTestnet: BitcoinTestnetNetwork = {
  chainName: "Bitcoin Testnet",
  customChainIdByImua: 1,
  connector: bitcoinConnector,
  portalContract: {
    type: "UTXOGateway",
    address: deployedContracts.imuachain.utxoGateway as `0x${string}`,
    abi: UTXOGatewayABI,
  },
  txExplorerUrl: "https://blockstream.info/testnet/tx/",
  accountExplorerUrl: "https://blockstream.info/testnet/address/",
} as const;

export const imuaChain: EVMNetwork = {
  chainName: "Imua",
  evmChainID: 233,
  customChainIdByImua: 40259,
  connector: evmConnector,
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
  | typeof bitcoin
  | typeof bitcoinTestnet
  | typeof imuaChain;

export const bootstrapContractNetwork = hoodi;
