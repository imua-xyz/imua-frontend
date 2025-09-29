// components/new-staking/ConnectWalletButton.tsx
"use client";

import { motion } from "framer-motion";
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
    <motion.button
      onClick={onClick}
      className="w-full max-w-lg mx-auto py-3 px-6 bg-[#00e5ff] hover:bg-[#00e5ff]/90 text-black font-medium rounded-lg transition-colors flex justify-center items-center"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      Connect {token.network.chainName}{" "}
      {token.connector.requireExtraConnectToImua
        ? "And Imua Wallets"
        : "Wallet"}
    </motion.button>
  );
}
