// components/new-staking/ConnectWalletButton.tsx
"use client";

import { motion } from "framer-motion";
import { ActionButton } from "@/components/ui/action-button";
import { NativeToken, LSTToken, EVMNSTToken } from "@/types/tokens";

interface ConnectWalletButtonProps {
  onClick: () => void;
  token: NativeToken | LSTToken | EVMNSTToken;
}

export function ConnectWalletButton({
  onClick,
  token,
}: ConnectWalletButtonProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="w-full max-w-lg mx-auto"
    >
      <ActionButton
        onClick={onClick}
        variant="primary"
        size="lg"
        className="w-full"
      >
        Connect {token.network.chainName}{" "}
        {token.network.connector.requireExtraConnectToImua
          ? "And Imua Wallets"
          : "Wallet"}
      </ActionButton>
    </motion.div>
  );
}
