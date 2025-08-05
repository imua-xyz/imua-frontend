export interface AVS {
  address: `0x${string}`;
  name: string;
  description: string;
  iconUrl: string;
  apy: number;
}

export const imuaChainAVS: AVS = {
  address: "0xedb7a6077ab45df72e57bc2ea091f9183429720e",
  name: "Imua",
  description: "An omnichain staking protocol",
  iconUrl: "/imua-logo.avif",
  apy: 3,
} as const;

export const validAVS: AVS[] = [imuaChainAVS];
