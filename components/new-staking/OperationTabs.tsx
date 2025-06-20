// components/new-staking/StakingOperationTabs.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StakeTab } from "./tabs/StakeTab";
import { useState } from "react";
import { useStakingServiceContext } from "@/contexts/StakingServiceContext";

interface OperationTabsProps {
  sourceChain: string;
  destinationChain: string;
  onSuccess?: () => void;
}

export function OperationTabs({
  sourceChain,
  destinationChain,
  onSuccess
}: OperationTabsProps) {
  const [currentTab, setCurrentTab] = useState("stake");
  
  return (
    <Tabs value={currentTab} onValueChange={setCurrentTab}>
      <TabsList className="w-full grid grid-cols-4 bg-[#15151c] p-1 rounded-lg mb-6">
        <TabsTrigger 
          value="stake"
          className="data-[state=active]:bg-[#222233] data-[state=active]:text-[#00e5ff] data-[state=active]:shadow-none"
        >
          Stake
        </TabsTrigger>
        <TabsTrigger 
          value="delegate"
          className="data-[state=active]:bg-[#222233] data-[state=active]:text-[#00e5ff] data-[state=active]:shadow-none"
        >
          Delegate
        </TabsTrigger>
        <TabsTrigger 
          value="undelegate"
          className="data-[state=active]:bg-[#222233] data-[state=active]:text-[#00e5ff] data-[state=active]:shadow-none"
        >
          Undelegate
        </TabsTrigger>
        <TabsTrigger 
          value="withdraw"
          className="data-[state=active]:bg-[#222233] data-[state=active]:text-[#00e5ff] data-[state=active]:shadow-none"
        >
          Withdraw
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="stake">
        <StakeTab
          sourceChain={sourceChain}
          destinationChain={destinationChain}
          onSuccess={onSuccess}
        />
      </TabsContent>
      
      <TabsContent value="delegate">
        <div className="p-6 bg-[#15151c] rounded-lg text-white text-center">
          <p>Delegate functionality coming soon</p>
        </div>
      </TabsContent>
      
      <TabsContent value="undelegate">
        <div className="p-6 bg-[#15151c] rounded-lg text-white text-center">
          <p>Undelegate functionality coming soon</p>
        </div>
      </TabsContent>
      
      <TabsContent value="withdraw">
        <div className="p-6 bg-[#15151c] rounded-lg text-white text-center">
          <p>Withdraw functionality coming soon</p>
        </div>
      </TabsContent>
    </Tabs>
  );
}