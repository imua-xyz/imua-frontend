// components/new-staking/modals/TokenSelectorModal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, X, Check } from "lucide-react";
import { useState } from "react";
import { Token } from "@/types/tokens";

interface TokenSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokens: Token[];
  selectedToken: Token;
  onSelectToken: (token: Token) => void;
}

export function TokenSelectorModal({
  isOpen,
  onClose,
  tokens,
  selectedToken,
  onSelectToken,
}: TokenSelectorModalProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTokens = tokens.filter(token => 
    token.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    token.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[420px] bg-[#13131a] border-[#222233] text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Select a token</DialogTitle>
        </DialogHeader>
        
        {/* Search input */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#9999aa] w-4 h-4" />
          <input
            type="text"
            placeholder="Search by name or symbol"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1a1a24] border border-[#333344] rounded-lg py-2 pl-10 pr-4 text-white placeholder:text-[#9999aa] focus:outline-none focus:ring-1 focus:ring-[#00e5ff]"
          />
          {searchTerm && (
            <button 
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#9999aa] hover:text-white"
              onClick={() => setSearchTerm("")}
            >
              <X size={16} />
            </button>
          )}
        </div>
        
        {/* Token list */}
        <div className="max-h-[300px] overflow-y-auto pr-1">
          {filteredTokens.map(token => (
            <button
              key={token.symbol}
              className={`w-full flex items-center justify-between p-3 rounded-lg mb-2 hover:bg-[#222233] ${
                selectedToken.symbol === token.symbol ? "bg-[#222233]" : ""
              }`}
              onClick={() => onSelectToken(token)}
            >
              <div className="flex items-center">
                <img src={token.iconUrl} alt={token.symbol} className="w-8 h-8 mr-3" />
                <div className="text-left">
                  <div className="font-medium text-white">{token.symbol}</div>
                  <div className="text-xs text-[#9999aa]">{token.name}</div>
                </div>
              </div>
              
              {selectedToken.symbol === token.symbol && (
                <Check size={18} className="text-[#00e5ff]" />
              )}
            </button>
          ))}
          
          {filteredTokens.length === 0 && (
            <div className="text-center py-6 text-[#9999aa]">
              No tokens found matching "{searchTerm}"
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}