// hooks/useBootstrapStatus.ts
import { useQuery } from "@tanstack/react-query";
import { usePortalContract } from "./usePortalContract";
import { hoodi } from "@/types/networks";
import { BootstrapStatus } from "@/types/bootstrap-status";

export function useBootstrapStatus() {
  // Always use the sepolia network to get the bootstrap contract
  const { readonlyContract } = usePortalContract(hoodi);

  const { data } = useQuery({
    queryKey: ["bootstrapStatus"],
    queryFn: async (): Promise<BootstrapStatus> => {
      if (!readonlyContract) throw new Error("Contract not available");

      // Read the bootstrap status from the contract
      const [bootstrapped, spawnTime, offsetDuration] = await Promise.all([
        readonlyContract.read.bootstrapped([]),
        readonlyContract.read.spawnTime([]),
        readonlyContract.read.offsetDuration([]),
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
    enabled: !!readonlyContract, // Only depends on public client availability, not wallet connection
  });

  return {
    bootstrapStatus: data,
  };
}
