// hooks/useXRPBinding.ts
import { useEffect } from "react";
import { useGemWalletStore } from "@/stores/gemWalletClient";
import { useBindingStore, bindingClient } from "@/stores/bindingClient";
import { usePortalContract } from "@/hooks/usePortalContract";
import { useBootstrapStatus } from "@/hooks/useBootstrapStatus";
import { xrp } from "@/types/tokens";

export function useXRPBinding() {
  const { readonlyContract } = usePortalContract(xrp.network);
  const { bootstrapStatus } = useBootstrapStatus();

  // Get XRP wallet state
  const xrpAddress = useGemWalletStore((state) => state.userAddress);
  const isConnected = useGemWalletStore((state) => state.isWalletConnected);

  // Get binding state for this address
  const boundAddress = useBindingStore((state) =>
    xrpAddress ? state.boundAddresses[xrpAddress] : undefined,
  );

  // Determine if we're in bootstrap phase
  const isBootstrapPhase = !bootstrapStatus?.isBootstrapped;

  // Set up contract in binding client (only for post-bootstrap phase)
  useEffect(() => {
    if (readonlyContract && !isBootstrapPhase) {
      bindingClient.setContract(readonlyContract);
    }
  }, [readonlyContract, isBootstrapPhase]);

  // Check binding on connection changes
  useEffect(() => {
    if (isConnected && xrpAddress && boundAddress === undefined) {
      // Pass bootstrap phase status to binding client
      bindingClient.checkBinding(xrpAddress, isBootstrapPhase);
    }
  }, [isConnected, xrpAddress, boundAddress, isBootstrapPhase]);
}
