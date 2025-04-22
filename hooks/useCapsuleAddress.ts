import { useClientChainGateway } from "./useClientChainGateway";
import { useReadContract } from "wagmi";
import ClientChainGatewayABI from "@/abi/ClientChainGateway.abi.json";

export function useCapsuleAddress() {
  const { contractAddress, userAddress } = useClientChainGateway();

  const { data: capsuleAddress } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: ClientChainGatewayABI,
    functionName: "ownerToCapsule",
    args: [userAddress],
    query: {
      enabled: Boolean(contractAddress && userAddress),
      gcTime: Infinity,
      staleTime: Infinity,
    },
  });

  return capsuleAddress;
}
