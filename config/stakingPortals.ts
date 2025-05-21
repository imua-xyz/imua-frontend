import ClientChainGatewayABI from "@/abi/ClientChainGateway.abi.json";
import UTXOGatewayABI from "@/abi/UTXOGateway.abi.json";
import deployedContracts from "@/deployedContracts.json";
import { StakingProviderMetadata } from "@/types/staking";

export const stakingPortals = {
  sepolia: {
    name: `Sepolia`,
    evmChainID: 11155111,
    customChainIdByImua: 40161,
    portalContracts: [
      {
        name: "ClientChainGateway",
        address: deployedContracts.clientChain.bootstrap,
        abi: ClientChainGatewayABI,
      },
    ],
  },
  ethMainnet: {
    name: `ETHMainnet`,
    evmChainID: 1,
    customChainIdByImua: 30101,
    portalContracts: [
      {
        name: "ClientChainGateway",
        address: null,
        abi: ClientChainGatewayABI,
      },
    ],
  },
  imua: {
    name: `Imuachain`,
    evmChainID: 233,
    customChainIdByImua: 40259,
    portalContracts: [
      {
        name: "UTXOGateway",
        address: deployedContracts.imuachain.utxoGateway,
        abi: UTXOGatewayABI,
      },
    ],
  },
  xrp: {
    name: `XRPL`,
    evmChainID: null,
    customChainIdByImua: 2,
    portalContracts: [
      {
        name: "UTXOGateway",
        address: deployedContracts.imuachain.utxoGateway,
        abi: UTXOGatewayABI,
      },
    ],
  },
};

export const getMetadataByEvmChainID = (
  evmChainID: number,
): StakingProviderMetadata | undefined => {
  const portal = Object.values(stakingPortals).find((portal) => {
    if (portal.evmChainID === evmChainID) {
      return portal;
    }
  });
  if (!portal) return undefined;

  return {
    chainName: portal.name,
    evmChainID: portal.evmChainID ?? undefined,
    customChainIdByImua: portal.customChainIdByImua,
    portalContract: {
      name: portal.portalContracts[0].name,
      address: portal.portalContracts[0].address as `0x${string}` | null,
    },
  };
};

export const getMetadataByCustomChainID = (
  customChainID: number,
): StakingProviderMetadata | undefined => {
  const portal = Object.values(stakingPortals).find((portal) => {
    if (portal.customChainIdByImua === customChainID) {
      return portal;
    }
  });
  if (!portal) return undefined;

  return {
    chainName: portal.name,
    evmChainID: portal.evmChainID ?? undefined,
    customChainIdByImua: portal.customChainIdByImua,
    portalContract: {
      name: portal.portalContracts[0].name,
      address: portal.portalContracts[0].address as `0x${string}` | null,
    },
  };
};

export const getPortalContractByEvmChainID = (
  evmChainID: number,
): {
  name: string;
  address: `0x${string}` | null;
  abi: any;
} | null => {
  const portal = Object.values(stakingPortals).find((portal) => {
    if (portal.evmChainID === evmChainID) {
      return portal;
    }
  });
  if (!portal) return null;

  return {
    name: portal.portalContracts[0].name,
    address: portal.portalContracts[0].address as `0x${string}` | null,
    abi: portal.portalContracts[0].abi,
  };
};

export const getAvailableNetworks = (): string[] => {
  return Object.values(stakingPortals)
    .filter((portal) => {
      return portal.portalContracts[0].address !== null;
    })
    .map((portal) => {
      return portal.name;
    });
};

export const getCustomChainIdByEvmChainID = (
  evmChainID: number,
): number | null => {
  const portal = Object.values(stakingPortals).find((portal) => {
    if (portal.evmChainID === evmChainID) {
      return portal;
    }
  });
  if (!portal) return null;
  return portal.customChainIdByImua;
};
