import BootstrapContract from "@/out/Bootstrap.sol/Bootstrap.json";
import ClientChainGatewayContract from "@/out/ClientChainGateway.sol/ClientChainGateway.json";
import UTXOGatewayContract from "@/out/UTXOGateway.sol/UTXOGateway.json";
// TODO: import this from lib?
import deployedContracts from "@/deployedContracts.json";
import { ValidEVMChain } from "@/config/wagmi";

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
    abi: readonly unknown[];
    bootstrapABI?: readonly unknown[];
  };
}

export interface EVMNSTNetwork extends EVMNetwork {
  validatorExplorerUrl: string;
  beaconApiUrl: string;
}

export interface XRPL extends NetworkBase {
  chainName: "XRPL";
  customChainIdByImua: 2;
  portalContract: {
    type: ContractType;
    address: `0x${string}`;
    abi: readonly unknown[];
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
    abi: ClientChainGatewayContract.abi,
  },
  txExplorerUrl: "https://sepolia.etherscan.io/tx/",
  accountExplorerUrl: "https://sepolia.etherscan.io/address/",
} as const;

export const hoodi: EVMNSTNetwork = {
  chainName: "Hoodi",
  evmChainID: 560048,
  customChainIdByImua: 999,
  portalContract: {
    type: "ClientChainGateway",
    address: "0xf21FB1667A8Aa3D3ea365D3D1D257f3E4fdd0651",
    abi: ClientChainGatewayContract.abi,
    bootstrapABI: BootstrapContract.abi,
  },
  txExplorerUrl: "https://hoodi.etherscan.io/tx/",
  accountExplorerUrl: "https://hoodi.etherscan.io/address/",
  validatorExplorerUrl: "https://hoodi.beaconcha.in/validator/",
  beaconApiUrl: "",
} as const;

if (process.env.NEXT_PUBLIC_NST_LOCALNET?.toLowerCase() !== "true") {
  // not localnet
  if (!process.env.NEXT_PUBLIC_BEACON_API_URL) {
    // and no beacon api url is set
    throw new Error("NEXT_PUBLIC_BEACON_API_URL is not set");
  }
  // otherwise set the beacon api url
  hoodi.beaconApiUrl = process.env.NEXT_PUBLIC_BEACON_API_URL;
}

export const xrpl: XRPL = {
  chainName: "XRPL",
  customChainIdByImua: 2,
  portalContract: {
    type: "UTXOGateway",
    address: deployedContracts.imuachain.utxoGateway as `0x${string}`,
    abi: UTXOGatewayContract.abi,
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
    abi: [],
  },
  txExplorerUrl: "https://exoscan.org/tx/",
  accountExplorerUrl: "https://exoscan.org/address/",
} as const;

export const ethPosLocalnet: EVMNSTNetwork = {
  chainName: "ETH POS localnet",
  evmChainID: 31337,
  // not set
  customChainIdByImua: 999,
  portalContract: {
    type: "Bootstrap",
    // write script to deploy and derive this address from create3
    address: "0x356b1e5938e64387a4A752e35ac4447B19027c6a",
    abi: ClientChainGatewayContract.abi,
    bootstrapABI: BootstrapContract.abi,
  },
  txExplorerUrl: "http://127.0.0.1:3000/tx/",
  accountExplorerUrl: "http://127.0.0.1:3000/address/",
  validatorExplorerUrl: "http://127.0.0.1:36003/validator/",
  beaconApiUrl: "http://127.0.0.1:33001",
} as const;

export const imuaLocalnet: EVMNetwork = {
  chainName: "Imua localnet",
  evmChainID: 232,
  customChainIdByImua: 999,
  portalContract: {
    type: "Bootstrap",
    address: "0x0",
    abi: [],
  },
} as const;

export type Network =
  | typeof sepolia
  | typeof hoodi
  | typeof xrpl
  | typeof imuaChain 
  | typeof ethPosLocalnet
  | typeof imuaLocalnet;

export const bootstrapContractNetwork = 
  process.env.NEXT_PUBLIC_NST_LOCALNET?.toLowerCase() === "true"
    ? ethPosLocalnet
    : hoodi;
