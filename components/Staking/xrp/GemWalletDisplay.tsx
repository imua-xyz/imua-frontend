// components/Staking/xrp/GemWalletDisplay.tsx
import { Button } from "@/components/ui/button";
import { useGemWallet } from "@/hooks/useGemWallet";
import { useXrplClient } from "@/hooks/useXrplClient";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { ChevronDown, ExternalLink, LogOut, Copy, Check } from "lucide-react";
import { useState, useEffect } from "react";
import Image from "next/image";

export function GemWalletDisplay() {
  const { 
    isConnected, 
    userAddress, 
    network, 
    connect, 
    disconnect,
    installed
  } = useGemWallet();
  
  const { getAccountInfo } = useXrplClient();
  const [balance, setBalance] = useState<string>("0");
  const [copied, setCopied] = useState(false);

  // Fetch balance when connected
  useEffect(() => {
    if (isConnected && userAddress) {
      const fetchBalance = async () => {
        try {
          const info = await getAccountInfo(userAddress);
          console.log("DEBUG: Gem wallet display info", info);
          if (info.success) {
            // Format balance to show max 6 decimal places
            const formattedBalance = (Number(info.data.balance) / 1_000_000).toFixed(2);
            setBalance(formattedBalance);
          }
        } catch (error) {
          console.error("Failed to fetch balance:", error);
        }
      };
      
      fetchBalance();
      // Refetch every minute, only when document is focused
      const interval = setInterval(() => {
        if (document.hasFocus()) {
          fetchBalance();
        }
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [isConnected, userAddress, getAccountInfo]);

  // Handle copy address
  const copyAddress = () => {
    if (userAddress) {
      navigator.clipboard.writeText(userAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!installed) {
    return (
      <div className="flex items-center gap-2">
        <Button 
          onClick={() => window.open("https://gemwallet.app/download", "_blank")}
          size="sm" 
          variant="outline"
          className="bg-card border-muted shadow-sm"
        >
          Install GemWallet
        </Button>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex items-center gap-2">
        <NetworkDropdown />
        <Button 
          onClick={connect} 
          size="sm" 
          variant="outline"
          className="bg-card border-muted shadow-sm"
        >
          Connect GemWallet
        </Button>
      </div>
    );
  }

  // Format the address for display
  const formattedAddress = userAddress 
    ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`
    : "";

  return (
    <div className="flex items-center gap-2">
      <NetworkDropdown />
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2 py-2 h-auto bg-card border-muted shadow-sm hover:bg-accent"
          >
            <span className="font-medium">{balance} XRP</span>
            <div className="flex items-center font-medium">
              <span className="text-sm">{formattedAddress}</span>
              <ChevronDown size={14} className="ml-1 opacity-70" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-56">
          <div className="flex flex-col space-y-1 p-2">
            <p className="text-xs font-medium text-muted-foreground">XRP Account</p>
            <p className="text-sm font-medium truncate">{userAddress}</p>
            <p className="text-sm font-medium">{balance} XRP</p>
          </div>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            className="flex items-center gap-2 cursor-pointer"
            onClick={copyAddress}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? "Copied!" : "Copy Address"}</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => window.open(`https://testnet.xrpl.org/accounts/${userAddress}`, "_blank")}
          >
            <ExternalLink size={14} />
            <span>View on XRP Ledger Explorer</span>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            className="flex items-center gap-2 text-red-500 cursor-pointer"
            onClick={disconnect}
          >
            <LogOut size={14} />
            <span>Disconnect</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Network dropdown component
function NetworkDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-2 py-2 h-auto bg-card border-muted shadow-sm hover:bg-accent"
        >
          <div className="flex items-center">
            <div className="h-4 w-4 mr-1 rounded-full overflow-hidden">
              {/* XRP logo - simplified as a purple circle */}
              <div className="h-full w-full bg-purple-600 flex items-center justify-center">
                <div className="text-white text-xs font-bold">X</div>
              </div>
            </div>
            <span className="font-medium">Testnet</span>
            <ChevronDown size={14} className="ml-1 opacity-70" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-40">
        <div className="p-2">
          <p className="text-xs font-medium text-muted-foreground mb-2">Available Networks</p>
          
          <div className="flex items-center gap-2 p-1.5 rounded-md bg-primary/10 cursor-not-allowed">
            <div className="h-4 w-4 rounded-full overflow-hidden bg-purple-600 flex items-center justify-center">
              <div className="text-white text-xs font-bold">X</div>
            </div>
            <span className="text-sm font-medium">Testnet</span>
            <Check size={14} className="ml-auto" />
          </div>
          
          <div className="flex items-center gap-2 p-1.5 rounded-md text-muted-foreground opacity-50 cursor-not-allowed mt-1">
            <div className="h-4 w-4 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center">
              <div className="text-white text-xs font-bold">X</div>
            </div>
            <span className="text-sm">Mainnet</span>
            <span className="text-xs ml-auto">Coming Soon</span>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}