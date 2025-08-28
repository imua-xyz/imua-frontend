// hooks/useXRPBinding.ts
import { useEffect } from "react";
import { useGemWalletStore } from "@/stores/gemWalletClient";
import { useBindingStore, bindingClient } from "@/stores/bindingClient";
import { usePortalContract } from "@/hooks/usePortalContract";
import { xrp } from "@/types/tokens";

export function useXRPBinding() {
  const { readonlyContract } = usePortalContract(xrp.network);

  // Get XRP wallet state
  const xrpAddress = useGemWalletStore((state) => state.userAddress);
  const isConnected = useGemWalletStore((state) => state.isWalletConnected);

  // Get binding state for this address
  const boundAddress = useBindingStore((state) =>
    xrpAddress ? state.boundAddresses[xrpAddress] : undefined,
  );

  // Set up contract in binding client
  useEffect(() => {
    if (readonlyContract) {
      bindingClient.setContract(readonlyContract);
    }
  }, [readonlyContract]);

  // Check binding on connection changes
  useEffect(() => {
    if (
      isConnected &&
      xrpAddress &&
      readonlyContract &&
      boundAddress === undefined
    ) {
      bindingClient.checkBinding(xrpAddress);
    }
  }, [isConnected, xrpAddress, readonlyContract, boundAddress]);
}
