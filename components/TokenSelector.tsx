// components/new-staking/TokenSelector.tsx
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Token, validTokens } from "@/types/tokens";

interface TokenSelectorProps {
  selectedToken: Token | null;
  onTokenSelect: (token: Token) => void;
}

export function TokenSelector({ selectedToken, onTokenSelect }: TokenSelectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  return (
    <div className="relative">
      {/* Token Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center space-x-2 bg-[#15151c] border border-[rgba(255,255,255,0.1)] rounded-lg p-3 hover:border-[rgba(255,255,255,0.2)] transition-all w-full"
      >
        {selectedToken ? (
          <>
            <div className="w-8 h-8 relative">
              <Image
                src={selectedToken.iconUrl}
                alt={selectedToken.symbol}
                fill
                className="object-contain"
              />
            </div>
            <span className="font-medium text-white">{selectedToken.symbol}</span>
            <span className="text-sm text-[#9999aa]">{selectedToken.name}</span>
            <div className="ml-auto">
              <span className="text-[#00e5ff] font-bold">3% APY</span>
            </div>
          </>
        ) : (
          <>
            <div className="w-8 h-8 bg-[#222233] rounded-full flex items-center justify-center">
              <ChevronDown className="text-white" size={16} />
            </div>
            <span className="text-white">Select a token</span>
          </>
        )}
        <ChevronDown className="ml-auto text-[#9999aa]" size={18} />
      </button>
      
      {/* Token Selection Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setIsModalOpen(false)}
            />
            
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute z-50 top-full mt-2 left-0 right-0 bg-[#15151c] rounded-xl border border-[rgba(255,255,255,0.1)] shadow-xl max-h-[400px] overflow-auto"
            >
              <div className="p-4">
                <h3 className="text-white font-bold mb-3">Select a token</h3>
                <div className="space-y-2">
                  {validTokens.map((token) => (
                    <div
                      key={token.symbol}
                      className="flex items-center p-3 hover:bg-[#222233] rounded-lg cursor-pointer transition-colors"
                      onClick={() => {
                        onTokenSelect(token);
                        setIsModalOpen(false);
                      }}
                    >
                      <div className="w-8 h-8 relative mr-3">
                        <Image
                          src={token.iconUrl}
                          alt={token.symbol}
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
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}