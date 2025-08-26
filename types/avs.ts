export interface AVS {
  address: `0x${string}`;
  name: string;
  description: string;
  iconUrl: string;
  apy: number;
}

export interface UnknownAVS extends AVS {
  name: "unknown";
  description: "Unknown AVS";
  iconUrl: "/operators/op-1.svg";
  apy: 0;
}

export const imuaChainAVS: AVS = {
  address: "0xedb7a6077ab45df72e57bc2ea091f9183429720e",
  name: "Imua",
  description: "An omnichain staking protocol",
  iconUrl: "/imua-logo.avif",
  apy: 3,
} as const;

export const knownAVS: AVS[] = [imuaChainAVS];

// Helper function to find AVS by address
export function findKnownAVSByAddress(avsAddress: string): AVS | undefined {
  return knownAVS.find(
    (avs) => avs.address.toLowerCase() === avsAddress.toLowerCase(),
  );
}

export function createUnknownAVS(avsAddress: string): UnknownAVS {
  return {
    address: avsAddress as `0x${string}`,
    name: "unknown",
    description: "Unknown AVS",
    iconUrl: "/operators/op-1.svg",
    apy: 0,
  };
}
