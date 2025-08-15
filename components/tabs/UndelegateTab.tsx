// components/new-staking/tabs/UndelegateTab.tsx
import { useState, useEffect, useMemo } from "react";
import { Info, ChevronRight, AlertCircle, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAmountInput } from "@/hooks/useAmountInput";
import { TxStatus } from "@/types/staking";
import { formatUnits } from "viem";
import { CustomOperationProgress } from "@/components/ui/custom-opration-progress";
import { useStakingServiceContext } from "@/contexts/StakingServiceContext";
import { useOperatorsContext } from "@/contexts/OperatorsContext";
import { OperatorSelectionModal } from "@/components/modals/OperatorSelectionModal";
import { OperatorInfo } from "@/types/operator";
import { Switch } from "@/components/ui/switch";
import { INSTANT_UNBOND_SLASH_RATE, UNBOND_PERIOD } from "@/config/cosmos";
import { useDelegations } from "@/hooks/useDelegations";
import { DelegationPerOperator } from "@/types/delegations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatCurrency, formatPercentage } from "@/lib/format";
import { useTokenPrices } from "@/hooks/useTokenPrices";
import { getTokenKey } from "@/types/tokens";

interface UndelegateTabProps {
  sourceChain: string;
  destinationChain: string;
  onSuccess?: () => void;
}

export function UndelegateTab({
  sourceChain,
  destinationChain,
  onSuccess,
}: UndelegateTabProps) {
  // Step management
  const [currentStep, setCurrentStep] = useState<"overview" | "details" | "review">("overview");
  
  // Context hooks
  const stakingService = useStakingServiceContext();
  const token = stakingService.token;
  const { operators } = useOperatorsContext();
  
  // Get delegations for this token
  const { data: delegationsData, isLoading: delegationsLoading } = useDelegations(token);
  
  // Get token price
  const { data: priceData, isLoading: priceLoading } = useTokenPrices([token]);
  const tokenPrice = priceData?.get(getTokenKey(token))?.data?.data || 0;
  const priceDecimals = priceData?.get(getTokenKey(token))?.data?.decimals || 0;
  
  // Check if this is a native chain operation (not cross-chain)
  const isNativeChainOperation = !!token.connector?.requireExtraConnectToImua;

  // State for undelegation process
  const [selectedOperator, setSelectedOperator] = useState<DelegationPerOperator | null>(null);
  const [isInstantUnbond, setIsInstantUnbond] = useState(false);
  
  // Get slash rate and unbond period from config
  const slashRate = INSTANT_UNBOND_SLASH_RATE ? parseFloat(INSTANT_UNBOND_SLASH_RATE) / 100 : 0.25;
  const unbondPeriod = UNBOND_PERIOD ? `${UNBOND_PERIOD} days` : "7 days";

  // Amount input with delegation constraint
  const maxAmount = selectedOperator?.delegated || BigInt(0);
  const decimals = stakingService.walletBalance?.decimals || 0;
  const {
    amount,
    parsedAmount,
    error: amountError,
    setAmount,
  } = useAmountInput({
    decimals: decimals,
    maxAmount: maxAmount,
  });

  // Calculate amounts based on unbonding type
  const finalAmount = useMemo(() => {
    if (!parsedAmount || parsedAmount === BigInt(0)) return BigInt(0);
    if (!isInstantUnbond) return parsedAmount;
    
    const slashAmount = (parsedAmount * BigInt(Math.floor(slashRate * 100))) / BigInt(100);
    return parsedAmount - slashAmount;
  }, [parsedAmount, isInstantUnbond, slashRate]);

  const slashAmount = useMemo(() => {
    if (!parsedAmount || parsedAmount === BigInt(0) || !isInstantUnbond) return BigInt(0);
    return parsedAmount - finalAmount;
  }, [parsedAmount, finalAmount, isInstantUnbond]);

  // Transaction state
  const [txStatus, setTxStatus] = useState<TxStatus | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | undefined>(undefined);
  const [showProgress, setShowProgress] = useState(false);

  // Get operator info for display
  const getOperatorInfo = (delegation: DelegationPerOperator): OperatorInfo | undefined => {
    return operators?.find(op => op.address.toLowerCase() === delegation.operatorAddress.toLowerCase());
  };

  // Handle operator selection
  const handleOperatorSelect = (delegation: DelegationPerOperator) => {
    setSelectedOperator(delegation);
    setAmount(""); // Reset amount when operator changes
    setCurrentStep("details");
  };

  // Handle continue to review
  const handleContinueToReview = () => {
    if (selectedOperator && parsedAmount && parsedAmount > BigInt(0)) {
      setCurrentStep("review");
    }
  };

  // Handle undelegation operation
  const handleUndelegate = async () => {
    if (!selectedOperator || !parsedAmount) return;

    setTxError(null);
    setTxStatus("processing");
    setShowProgress(true);

    try {
      const result = await stakingService.undelegateFrom(
        selectedOperator.operatorAddress,
        parsedAmount,
        isInstantUnbond,
        {
          onStatus: (status, error) => {
            setTxStatus(status);
            if (error) setTxError(error);
          },
        },
      );

      if (result.hash) {
        setTxHash(result.hash);
      }

      if (result.success) {
        setTxStatus("success");
        if (onSuccess) onSuccess();
      } else {
        setTxStatus("error");
        setTxError(result.error || "Transaction failed");
      }
    } catch (error) {
      console.error("Undelegation failed:", error);
      setTxStatus("error");
      setTxError(error instanceof Error ? error.message : "Transaction failed");
    }
  };

  // Format button text based on state
  const getButtonText = () => {
    if (txStatus === "approving") return "Approving...";
    if (txStatus === "processing") return "Processing...";
    if (txStatus === "success") return "Success!";
    if (txStatus === "error") return "Failed!";
    return "Undelegate";
  };

  // Calculate total delegated value
  const totalDelegatedValue = useMemo(() => {
    if (!delegationsData?.delegationsByOperator) return BigInt(0);
    return Array.from(delegationsData.delegationsByOperator.values())
      .reduce((sum, delegation) => sum + delegation.delegated, BigInt(0));
  }, [delegationsData]);

  // Calculate total unbonding value
  const totalUnbondingValue = useMemo(() => {
    if (!delegationsData?.delegationsByOperator) return BigInt(0);
    return Array.from(delegationsData.delegationsByOperator.values())
      .reduce((sum, delegation) => sum + delegation.unbonding, BigInt(0));
  }, [delegationsData]);

  // Helper function to calculate USD value
  const calculateUSDValue = (amount: bigint) => {
    if (!tokenPrice || !priceDecimals) return 0;
    const priceValue = Number(tokenPrice) / Math.pow(10, priceDecimals);
    return (Number(amount) / Math.pow(10, decimals)) * priceValue;
  };

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center justify-center mb-6">
        <div className="flex items-center space-x-4">
          <div className={`flex items-center ${currentStep === "overview" ? "text-[#00e5ff]" : "text-[#666677]"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === "overview" ? "bg-[#00e5ff] text-black" : "bg-[#222233] text-[#666677]"
            }`}>
              1
            </div>
            <span className="ml-2 text-sm font-medium">Overview</span>
          </div>
          
          <ChevronRight className="text-[#666677]" size={20} />
          
          <div className={`flex items-center ${currentStep === "details" ? "text-[#00e5ff]" : "text-[#666677]"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === "details" ? "bg-[#00e5ff] text-black" : "bg-[#222233] text-[#666677]"
            }`}>
              2
            </div>
            <span className="ml-2 text-sm font-medium">Details</span>
          </div>
          
          <ChevronRight className="text-[#666677]" size={20} />
          
          <div className={`flex items-center ${currentStep === "review" ? "text-[#00e5ff]" : "text-[#666677]"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === "review" ? "bg-[#00e5ff] text-black" : "bg-[#222233] text-[#666677]"
            }`}>
              3
            </div>
            <span className="ml-2 text-sm font-medium">Review</span>
          </div>
        </div>
      </div>

      {/* STEP 1: Delegation Overview */}
      {currentStep === "overview" && (
        <div className="space-y-6">
          {/* Summary Card */}
          <Card className="bg-[#1a1a24] border-[#222233]">
            <CardHeader>
              <CardTitle className="text-lg text-white">Your Delegations</CardTitle>
              <p className="text-sm text-[#9999aa]">
                Select an operator to undelegate from
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Total Delegated */}
              <div className="flex justify-between items-center p-4 bg-[#13131a] rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-[#00e5ff] rounded-full flex items-center justify-center">
                    <span className="text-black font-bold text-sm">TD</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">Total Delegated</p>
                    <p className="text-sm text-[#9999aa]">
                      {formatUnits(totalDelegatedValue, decimals)} {token.symbol}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[#00e5ff] font-bold text-lg">
                    {formatCurrency(calculateUSDValue(totalDelegatedValue))}
                  </p>
                </div>
              </div>

              {/* Total Unbonding */}
              {totalUnbondingValue > BigInt(0) && (
                <div className="flex justify-between items-center p-4 bg-[#1e3a2e] rounded-lg border border-[#4ade80]/20">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-[#4ade80] rounded-full flex items-center justify-center">
                      <Clock className="text-black" size={20} />
                    </div>
                    <div>
                      <p className="text-[#4ade80] font-medium">Currently Unbonding</p>
                      <p className="text-sm text-[#86efac]">
                        {formatUnits(totalUnbondingValue, decimals)} {token.symbol}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[#4ade80] font-bold text-lg">
                      {formatCurrency(calculateUSDValue(totalUnbondingValue))}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delegations List */}
          {delegationsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00e5ff]"></div>
            </div>
          ) : delegationsData?.delegationsByOperator && delegationsData.delegationsByOperator.size > 0 ? (
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-white">Select Operator to Undelegate From</h3>
              {Array.from(delegationsData.delegationsByOperator.values())
                .filter(delegation => delegation.delegated > BigInt(0))
                .map((delegation, index) => {
                  const operatorInfo = getOperatorInfo(delegation);
                  const delegatedValue = calculateUSDValue(delegation.delegated);
                  const unbondingValue = calculateUSDValue(delegation.unbonding);
                  
                  return (
                    <Card 
                      key={delegation.operatorAddress}
                      className="bg-[#1a1a24] border-[#222233] hover:border-[#00e5ff]/50 transition-colors cursor-pointer"
                      onClick={() => handleOperatorSelect(delegation)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-[#00e5ff] rounded-full flex items-center justify-center">
                              <span className="text-black font-bold text-sm">
                                {operatorInfo?.operator_meta_info?.slice(0, 2).toUpperCase() || "OP"}
                              </span>
                            </div>
                            <div>
                              <h4 className="text-white font-medium">
                                {operatorInfo?.operator_meta_info || "Unknown Operator"}
                              </h4>
                              <p className="text-sm text-[#9999aa]">
                                {delegation.operatorAddress.slice(0, 8)}...{delegation.operatorAddress.slice(-6)}
                              </p>
                              {operatorInfo && (
                                <p className="text-xs text-[#00e5ff]">
                                  {formatPercentage(operatorInfo.apr)} APR
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="flex items-center space-x-4">
                              <div>
                                <p className="text-white font-medium">
                                  {formatUnits(delegation.delegated, decimals)} {token.symbol}
                                </p>
                                <p className="text-sm text-[#00e5ff]">
                                  {formatCurrency(delegatedValue)}
                                </p>
                              </div>
                              
                              {delegation.unbonding > BigInt(0) && (
                                <div className="text-right">
                                  <p className="text-[#4ade80] text-sm">
                                    {formatUnits(delegation.unbonding, decimals)} unbonding
                                  </p>
                                  <p className="text-xs text-[#86efac]">
                                    {formatCurrency(unbondingValue)}
                                  </p>
                                </div>
                              )}
                              
                              <ChevronRight className="text-[#666677]" size={20} />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          ) : (
            <Card className="bg-[#1a1a24] border-[#222233]">
              <CardContent className="p-8 text-center">
                <AlertCircle className="w-12 h-12 text-[#666677] mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No Delegations Found</h3>
                <p className="text-sm text-[#9999aa] mb-4">
                  You don't have any active delegations for this token.
                </p>
                <Button 
                  onClick={() => window.location.href = '/staking'}
                  className="bg-[#00e5ff] hover:bg-[#00b8cc] text-black"
                >
                  Start Delegating
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* STEP 2: Undelegation Details */}
      {currentStep === "details" && selectedOperator && (
        <div className="space-y-6">
          {/* Selected Operator Summary */}
          <Card className="bg-[#1a1a24] border-[#222233]">
            <CardHeader>
              <CardTitle className="text-lg text-white">Undelegate from Operator</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-[#13131a] rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-[#00e5ff] rounded-full flex items-center justify-center">
                    <span className="text-black font-bold text-sm">
                      {getOperatorInfo(selectedOperator)?.operator_meta_info?.slice(0, 2).toUpperCase() || "OP"}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-white font-medium">
                      {getOperatorInfo(selectedOperator)?.operator_meta_info || "Unknown Operator"}
                    </h4>
                    <p className="text-sm text-[#9999aa]">
                      {selectedOperator.operatorAddress.slice(0, 8)}...{selectedOperator.operatorAddress.slice(-6)}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-white font-medium">
                    {formatUnits(selectedOperator.delegated, decimals)} {token.symbol}
                  </p>
                  <p className="text-sm text-[#00e5ff]">
                    Available to undelegate
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Unbonding Type Selection */}
          <Card className="bg-[#1a1a24] border-[#222233]">
            <CardHeader>
              <CardTitle className="text-lg text-white">Unbonding Type</CardTitle>
              <p className="text-sm text-[#9999aa]">
                Choose how quickly you want to unbond
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Delayed Unbonding */}
              <div 
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  !isInstantUnbond 
                    ? "bg-[#1e3a2e] border-[#4ade80] text-[#4ade80]" 
                    : "bg-[#13131a] border-[#333344] text-[#9999aa] hover:border-[#666677]"
                }`}
                onClick={() => setIsInstantUnbond(false)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5" />
                    <div>
                      <h4 className="font-medium">Delayed Unbonding</h4>
                      <p className="text-sm opacity-80">Wait for the unbonding period</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs bg-[#4ade80] text-black px-2 py-1 rounded">
                      No Slash
                    </span>
                    <p className="text-sm mt-1">{unbondPeriod}</p>
                  </div>
                </div>
              </div>

              {/* Instant Unbonding */}
              <div 
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  isInstantUnbond 
                    ? "bg-[#0d2d1d] border-[#4ade80] text-[#4ade80]" 
                    : "bg-[#13131a] border-[#333344] text-[#9999aa] hover:border-[#666677]"
                }`}
                onClick={() => setIsInstantUnbond(true)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Zap className="w-5 h-5" />
                    <div>
                      <h4 className="font-medium">Instant Unbonding</h4>
                      <p className="text-sm opacity-80">Unbond immediately with penalty</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs bg-[#4ade80] text-black px-2 py-1 rounded">
                      {INSTANT_UNBOND_SLASH_RATE || 25}% Slash
                    </span>
                    <p className="text-sm mt-1">Immediate</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Amount Input */}
          <Card className="bg-[#1a1a24] border-[#222233]">
            <CardHeader>
              <CardTitle className="text-lg text-white">Amount to Undelegate</CardTitle>
              <p className="text-sm text-[#9999aa]">
                Enter the amount you want to undelegate
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Available amount display */}
              <div className="flex justify-between items-center p-3 bg-[#13131a] rounded-lg">
                <span className="text-sm text-[#9999aa]">Available for undelegation</span>
                <span className="text-sm font-medium text-white">
                  {formatUnits(selectedOperator.delegated, decimals)} {token.symbol}
                </span>
              </div>

              {/* Amount input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-white">
                    Amount
                  </label>
                  <button
                    className="text-xs font-medium text-[#00e5ff] hover:text-[#00b8cc]"
                    onClick={() => setAmount(formatUnits(selectedOperator.delegated, decimals))}
                  >
                    MAX
                  </button>
                </div>

                <Input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-3 bg-[#15151c] border border-[#333344] rounded-lg text-white text-lg"
                  placeholder="0.0"
                />

                {amountError && (
                  <p className="text-sm text-red-500">{amountError}</p>
                )}
              </div>

              {/* Instant unbonding breakdown */}
              {isInstantUnbond && parsedAmount && parsedAmount > BigInt(0) && (
                <div className="p-4 bg-[#0d2d1d] rounded-lg border border-[#4ade80]/20 space-y-2">
                  <h5 className="text-sm font-medium text-[#4ade80]">Instant Unbonding Breakdown</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#86efac]">Original Amount:</span>
                      <span className="text-white">
                        {formatUnits(parsedAmount, decimals)} {token.symbol}
                      </span>
                    </div>
                    <div className="flex justify-between text-red-400">
                      <span>Slash ({INSTANT_UNBOND_SLASH_RATE || 25}%):</span>
                      <span>-{formatUnits(slashAmount, decimals)} {token.symbol}</span>
                    </div>
                    <div className="flex justify-between text-[#4ade80] font-medium border-t border-[#4ade80]/20 pt-2">
                      <span>Final Amount:</span>
                      <span>{formatUnits(finalAmount, decimals)} {token.symbol}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Continue Button */}
          <Button
            className="w-full py-3 bg-[#00e5ff] hover:bg-[#00c8df] text-black font-medium"
            disabled={
              !!amountError ||
              !amount ||
              !parsedAmount ||
              parsedAmount === BigInt(0) ||
              parsedAmount > selectedOperator.delegated
            }
            onClick={handleContinueToReview}
          >
            Continue to Review
          </Button>
        </div>
      )}

      {/* STEP 3: Review and Confirm */}
      {currentStep === "review" && selectedOperator && (
        <div className="space-y-6">
          {/* Review Summary */}
          <Card className="bg-[#1a1a24] border-[#222233]">
            <CardHeader>
              <CardTitle className="text-lg text-white">Review Undelegation</CardTitle>
              <p className="text-sm text-[#9999aa]">
                Confirm your undelegation details
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Operator */}
              <div className="flex justify-between items-center p-3 bg-[#13131a] rounded-lg">
                <span className="text-[#9999aa]">Operator</span>
                <div className="flex items-center space-x-3">
                  <span className="text-white font-medium">
                    {getOperatorInfo(selectedOperator)?.operator_meta_info || "Unknown Operator"}
                  </span>
                  <button
                    className="text-xs text-[#00e5ff] hover:text-[#00b8cc]"
                    onClick={() => setCurrentStep("overview")}
                  >
                    Change
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div className="flex justify-between items-center p-3 bg-[#13131a] rounded-lg">
                <span className="text-[#9999aa]">Amount</span>
                <div className="flex items-center space-x-3">
                  <span className="text-white font-medium">
                    {amount} {token.symbol}
                  </span>
                  <button
                    className="text-xs text-[#00e5ff] hover:text-[#00b8cc]"
                    onClick={() => setCurrentStep("details")}
                  >
                    Change
                  </button>
                </div>
              </div>

              {/* Unbonding Type */}
              <div className="flex justify-between items-center p-3 bg-[#13131a] rounded-lg">
                <span className="text-[#9999aa]">Unbonding Type</span>
                <div className="flex items-center space-x-3">
                  <span className={`font-medium ${
                    isInstantUnbond ? 'text-[#4ade80]' : 'text-[#00e5ff]'
                  }`}>
                    {isInstantUnbond ? '⚡ Instant' : '⏳ Delayed'}
                  </span>
                  <button
                    className="text-xs text-[#00e5ff] hover:text-[#00b8cc]"
                    onClick={() => setCurrentStep("details")}
                  >
                    Change
                  </button>
                </div>
              </div>

              {/* Final Amount (for instant unbonding) */}
              {isInstantUnbond && (
                <div className="flex justify-between items-center p-3 bg-[#0d2d1d] rounded-lg border border-[#4ade80]/20">
                  <span className="text-[#86efac]">Final Amount (after slash)</span>
                  <span className="text-[#4ade80] font-medium">
                    {formatUnits(finalAmount, decimals)} {token.symbol}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Estimated Impact */}
          {getOperatorInfo(selectedOperator) && parsedAmount && parsedAmount > BigInt(0) && (
            <Card className="bg-[#0d2d1d] border border-[#4ade80]/20">
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-[#4ade80]">
                    Estimated Impact
                  </h4>
                  <span className="font-bold text-[#4ade80]">
                    {getOperatorInfo(selectedOperator)?.apr}% APR
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#86efac]">Yearly rewards lost</span>
                  <span className="text-[#4ade80]">
                    ~{(Number(parsedAmount) / Math.pow(10, decimals) * (getOperatorInfo(selectedOperator)?.apr || 0) / 100).toFixed(4)} {token.symbol}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Fee information */}
          <div className="flex items-center text-xs text-[#9999aa] px-1">
            <Info size={12} className="mr-1 flex-shrink-0" />
            <span>No additional fees for this transaction</span>
          </div>

          {/* Action buttons */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              className="flex-1 border-[#333344] text-white hover:bg-[#222233]"
              onClick={() => setCurrentStep("details")}
            >
              Back
            </Button>

            <Button
              className="flex-1 bg-[#00e5ff] hover:bg-[#00c8df] text-black font-medium"
              disabled={
                !!txStatus ||
                !selectedOperator ||
                !parsedAmount ||
                parsedAmount === BigInt(0)
              }
              onClick={handleUndelegate}
            >
              {getButtonText()}
            </Button>
          </div>

          {txError && <p className="mt-3 text-sm text-red-500">{txError}</p>}
        </div>
      )}

      {/* Progress overlay */}
      {isNativeChainOperation ? (
        <CustomOperationProgress
          sourceChain={destinationChain}
          destinationChain={destinationChain}
          operation="undelegate"
          txHash={txHash}
          explorerUrl={token.network.txExplorerUrl}
          txStatus={txStatus}
          open={showProgress}
          onClose={() => {
            setShowProgress(false);
          }}
          onViewDetails={() => {
            if (token.network.txExplorerUrl && txHash) {
              window.open(`${token.network.txExplorerUrl}${txHash}`, "_blank");
            }
          }}
        />
      ) : (
        <CustomOperationProgress
          sourceChain={sourceChain}
          destinationChain={destinationChain}
          operation="undelegate"
          txHash={txHash}
          explorerUrl={token.network.txExplorerUrl}
          txStatus={txStatus}
          open={showProgress}
          onClose={() => {
            setShowProgress(false);
            setTxStatus(null);
            setTxError(null);
            setTxHash(undefined);
          }}
          onViewDetails={() => {
            if (token.network.txExplorerUrl && txHash) {
              window.open(`${token.network.txExplorerUrl}${txHash}`, "_blank");
            }
          }}
        />
      )}
    </div>
  );
}