// components/staking/TokenSelectionPanel.tsx
"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Token, validTokens } from "@/types/tokens";

interface TokenSelectionPanelProps {
  selectedToken: Token | null;
  onTokenSelect: (token: Token) => void;
}

export function TokenSelectionPanel({
  selectedToken,
  onTokenSelect,
}: TokenSelectionPanelProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white mb-4">Choose Token Type</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {validTokens.map((token) => (
          <motion.div
            key={token.symbol}
            onClick={() => onTokenSelect(token)}
            className={`
              p-4 rounded-xl border cursor-pointer transition-all
              ${
                selectedToken?.symbol === token.symbol
                  ? "border-[#00e5ff] bg-[#15151c] shadow-[0_0_15px_rgba(0,229,255,0.2)]"
                  : "border-[rgba(255,255,255,0.1)] bg-[#15151c] hover:border-[rgba(255,255,255,0.2)]"
              }
            `}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center">
              <div className="w-10 h-10 mr-3 relative">
                <Image
                  src={token.iconUrl}
                  alt={token.symbol}
                  width={40}
                  height={40}
                  fill
                  className="object-contain"
                />
              </div>
              <div>
                <div className="font-bold text-white">{token.symbol}</div>
                <div className="text-sm text-[#9999aa]">{token.name}</div>
              </div>
              <div className="ml-auto">
                <span className="text-[#00e5ff] font-bold">3% APY</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
