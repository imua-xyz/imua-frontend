// hooks/useBootstrapStatus.ts
import { useQuery } from "@tanstack/react-query";
import { bootstrapContractNetwork } from "@/types/networks";
import { BootstrapStatus } from "@/types/bootstrap-status";
import { getPublicClient } from "@wagmi/core";
import { config, publicClients } from "@/config/wagmi";
import { getContract } from "viem";

const BOOTSTRAP_STATUS_ABI = [
  {
    inputs: [],
    name: "bootstrapped",
    outputs: [{ type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "spawnTime",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "offsetDuration",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export function useBootstrapStatus() {
  // Use hoodi network but create minimal contract instance
  const evmChainID = bootstrapContractNetwork.evmChainID;
  const publicClient = getPublicClient(config, {
    chainId: evmChainID as keyof typeof publicClients,
  });
  const bootstrapStatusContract = publicClient
    ? getContract({
        address: bootstrapContractNetwork.portalContract
          .address as `0x${string}`,
        abi: BOOTSTRAP_STATUS_ABI,
        client: publicClient,
      })
    : undefined;

  const { data } = useQuery({
    queryKey: ["bootstrapStatus"],
    queryFn: async (): Promise<BootstrapStatus> => {
      if (!bootstrapStatusContract) throw new Error("Contract not available");

      // Read the bootstrap status from the contract
      const [bootstrapped, spawnTime, offsetDuration] = await Promise.all([
        bootstrapStatusContract.read.bootstrapped(),
        bootstrapStatusContract.read.spawnTime(),
        bootstrapStatusContract.read.offsetDuration(),
      ]);

      // Convert BigInts to numbers for easier use
      const spawnTimeNum = Number(spawnTime);
      const offsetDurationNum = Number(offsetDuration);
      const currentTime = Math.floor(Date.now() / 1000);

      // Calculate if the contract is in locked phase
      const lockTime = Math.max(0, spawnTimeNum - offsetDurationNum);
      const isLocked = bootstrapped ? false : currentTime >= lockTime;

      // Determine the current phase
      let phase: "pre-lock" | "locked" | "bootstrapped";
      if (bootstrapped) {
        phase = "bootstrapped";
      } else if (isLocked) {
        phase = "locked";
      } else {
        phase = "pre-lock";
      }

      return {
        isBootstrapped: Boolean(bootstrapped),
        spawnTime: spawnTimeNum,
        offsetDuration: offsetDurationNum,
        isLocked,
        phase,
      };
    },
    refetchInterval: 60000, // Refetch every minute
    enabled: !!bootstrapStatusContract, // Only depends on public client availability, not wallet connection
  });

  return {
    bootstrapStatus: data,
  };
}
