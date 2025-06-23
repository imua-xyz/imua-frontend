import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Search, SortDesc, SortAsc, X, Check, Info } from "lucide-react";
import { OperatorInfo } from "@/types/operator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type SortOption = "apr" | "commission" | "name";
type SortDirection = "asc" | "desc";

interface OperatorSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (operator: OperatorInfo) => void;
  operators: OperatorInfo[];
  selectedOperator?: OperatorInfo | null;
}

export function OperatorSelectionModal({
  isOpen,
  onClose,
  onSelect,
  operators,
  selectedOperator
}: OperatorSelectionModalProps) {
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("apr");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  
  // Parse operator name from meta info
  const getOperatorName = (operator: OperatorInfo): string => {
    try {
      return operator.operator_meta_info || "Unknown Operator";
    } catch {
      return "Unknown Operator";
    }
  };
  
  // Format commission rate as percentage
  const formatCommission = (rate: string): string => {
    return `${(parseFloat(rate) * 100).toFixed(2)}%`;
  };

  // Toggle sort direction
  const toggleSortDirection = () => {
    setSortDirection(prev => prev === "asc" ? "desc" : "asc");
  };

  // Change sort field
  const handleSortChange = (value: SortOption) => {
    if (value === sortBy) {
      toggleSortDirection();
    } else {
      setSortBy(value);
      // Default to descending for APR, ascending for others
      setSortDirection(value === "apr" ? "desc" : "asc");
    }
  };

  // Filter and sort operators
  const filteredOperators = useMemo(() => {
    return operators
      .filter(op => {
        const name = getOperatorName(op).toLowerCase();
        const address = op.address.toLowerCase();
        const searchLower = searchTerm.toLowerCase();
        
        return name.includes(searchLower) || address.includes(searchLower);
      })
      .sort((a, b) => {
        let comparison = 0;
        
        switch (sortBy) {
          case "apr":
            comparison = a.apr - b.apr;
            break;
          case "commission":
            comparison = parseFloat(a.commission.commission_rates.rate) - 
                         parseFloat(b.commission.commission_rates.rate);
            break;
          case "name":
            comparison = getOperatorName(a).localeCompare(getOperatorName(b));
            break;
        }
        
        return sortDirection === "asc" ? comparison : -comparison;
      });
  }, [operators, searchTerm, sortBy, sortDirection]);

  // Truncate address for display
  const truncateAddress = (address: string): string => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">
            Select an Operator
          </DialogTitle>
        </DialogHeader>
        
        {/* Search and sort controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#9999aa] w-4 h-4" />
            <Input
              placeholder="Search by name or address"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-[#15151c] border-[#333344] text-white"
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
          
          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={handleSortChange}>
              <SelectTrigger className="w-[180px] bg-[#15151c] border-[#333344] text-white">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-[#21212f] border-[#333344] text-white">
                <SelectItem value="apr">Sort by APR</SelectItem>
                <SelectItem value="commission">Sort by Commission</SelectItem>
                <SelectItem value="name">Sort by Name</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              size="icon"
              onClick={toggleSortDirection}
              className="bg-[#15151c] border-[#333344] text-white hover:bg-[#21212f]"
            >
              {sortDirection === "asc" ? <SortAsc size={18} /> : <SortDesc size={18} />}
            </Button>
          </div>
        </div>
        
        {/* Results count */}
        <div className="text-sm text-[#9999aa] mb-2">
          Showing {filteredOperators.length} of {operators.length} operators
        </div>
        
        {/* Operators list */}
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="space-y-2">
            {filteredOperators.length > 0 ? (
              filteredOperators.map(operator => {
                const isSelected = selectedOperator?.address === operator.address;
                const operatorName = getOperatorName(operator);
                
                return (
                  <div
                    key={operator.address}
                    className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                      isSelected 
                        ? "border-[#00e5ff] bg-[#00e5ff]/10" 
                        : "border-[#333344] hover:bg-[#222233]"
                    }`}
                    onClick={() => onSelect(operator)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-[#333344] flex items-center justify-center text-sm">
                          {operatorName.substring(0, 2).toUpperCase()}
                        </div>
                        
                        <div>
                          <div className="font-medium text-white flex items-center">
                            {operatorName}
                            {isSelected && (
                              <Check size={16} className="ml-2 text-[#00e5ff]" />
                            )}
                          </div>
                          <div className="text-xs text-[#9999aa]">
                            {truncateAddress(operator.address)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-bold text-[#00e5ff]">
                          {operator.apr}% APR
                        </div>
                        <div className="flex items-center text-xs text-[#9999aa]">
                          Commission: {formatCommission(operator.commission.commission_rates.rate)}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="ml-1">
                                  <Info size={12} />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-[#333344] text-white border-[#444455]">
                                <p>Commission taken from rewards</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-[#9999aa]">
                No operators found matching your search
              </div>
            )}
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex justify-end space-x-3 mt-4 pt-4 border-t border-[#333344]">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="bg-transparent border-[#333344] text-white hover:bg-[#222233]"
          >
            Cancel
          </Button>
          
          {selectedOperator && (
            <Button 
              onClick={() => onSelect(selectedOperator)}
              className="bg-[#00e5ff] text-black hover:bg-[#00c8df]"
            >
              Confirm Selection
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}