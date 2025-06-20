import ClientChainGatewayABI from "@/abi/ClientChainGateway.abi.json";
import UTXOGatewayABI from "@/abi/UTXOGateway.abi.json";
import deployedContracts from "@/deployedContracts.json";
import { ValidEVMChain } from "@/config/wagmi";

export interface NetworkBase {
  chainName: string;
  customChainIdByImua: number;
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
} as const;

export const xrpl: XRPL = {
  chainName: "XRPL",
  customChainIdByImua: 2,
  portalContract: {
    name: "UTXOGateway",
    address: deployedContracts.imuachain.utxoGateway as `0x${string}`,
    abi: UTXOGatewayABI,
  },
} as const;

export const imua = {
    chainName: "Imua",
    evmChainID: 233,
    customChainIdByImua: 40259,
  } as const;

export type Network = typeof sepolia | typeof xrpl;