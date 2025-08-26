import { useState, useMemo } from "react";
import { X, ChevronLeft, Clock, Zap, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAmountInput } from "@/hooks/useAmountInput";
import { TxStatus } from "@/types/staking";
import { formatUnits } from "viem";
import { MultiChainOperationProgress } from "@/components/ui/multi-chain-operation-progress";
import { useStakingServiceContext } from "@/contexts/StakingServiceContext";
import { useOperatorsContext } from "@/contexts/OperatorsContext";
import { OperatorInfo } from "@/types/operator";
import { INSTANT_UNBOND_SLASH_RATE, UNBOND_PERIOD } from "@/config/cosmos";
import { useDelegations } from "@/hooks/useDelegations";
import { DelegationPerOperator } from "@/types/delegations";
import { useTokenPrices } from "@/hooks/useTokenPrices";
import { getTokenKey } from "@/types/tokens";
import { formatCurrency, formatPercentage } from "@/lib/format";

interface UndelegateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  sourceChain: string;
  destinationChain: string;
}

export function UndelegateModal({
  open,
  onClose,
  onSuccess,
  sourceChain,
  destinationChain,
}: UndelegateModalProps) {
  // Step management
  const [currentStep, setCurrentStep] = useState<"overview" | "details" | "review">("overview");
  
  // Context hooks
  const stakingService = useStakingServiceContext();
  const token = stakingService.token;
  const { operators } = useOperatorsContext();
  
  // Get delegations for this token
  const { data: delegationsData, isLoading: delegationsLoading } = useDelegations(token);
  
  // Get token price
  const { data: priceData } = useTokenPrices([token]);
  const tokenPrice = priceData?.get(getTokenKey(token))?.data?.data || 0;
  const priceDecimals = priceData?.get(getTokenKey(token))?.data?.decimals || 0;
  
  // Check if this is a native chain operation
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

  // Handle modal close
  const handleClose = () => {
    if (currentStep !== "overview") {
      setCurrentStep("overview");
      setSelectedOperator(null);
      setAmount("");
      setIsInstantUnbond(false);
    } else {
      onClose();
    }
  };

  // Get step title and description
  const getStepInfo = () => {
    switch (currentStep) {
      case "overview":
        return {
          title: "Select Operator to Undelegate From",
          description: "Choose which operator you want to undelegate from",
          stepNumber: 1,
        };
      case "details":
        return {
          title: "Undelegation Details",
          description: "Set amount and choose unbonding type",
          stepNumber: 2,
        };
      case "review":
        return {
          title: "Review & Confirm",
          description: "Confirm your undelegation details",
          stepNumber: 3,
        };
      default:
        return { title: "", description: "", stepNumber: 0 };
    }
  };

  const stepInfo = getStepInfo();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[#0f0f1a] border border-[#222233] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#222233]">
          <div className="flex items-center space-x-4">
            {currentStep !== "overview" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentStep("overview")}
                className="p-2 hover:bg-[#222233] text-[#9999aa]"
              >
                <ChevronLeft size={20} />
              </Button>
            )}
            <div>
              <h2 className="text-xl font-semibold text-white">{stepInfo.title}</h2>
              <p className="text-sm text-[#9999aa]">{stepInfo.description}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="p-2 hover:bg-[#222233] text-[#9999aa]"
          >
            <X size={20} />
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 border-b border-[#222233]">
          <div className="flex items-center space-x-2">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    step === stepInfo.stepNumber
                      ? "bg-[#00e5ff] text-black"
                      : step < stepInfo.stepNumber
                      ? "bg-[#4ade80] text-black"
                      : "bg-[#222233] text-[#666677]"
                  }`}
                >
                  {step < stepInfo.stepNumber ? "✓" : step}
                </div>
                {step < 3 && (
                  <div
                    className={`w-12 h-0.5 mx-2 transition-all ${
                      step < stepInfo.stepNumber ? "bg-[#4ade80]" : "bg-[#222233]"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* STEP 1: Overview */}
          {currentStep === "overview" && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Total Delegated */}
                <div className="bg-[#1a1a24] border border-[#222233] rounded-xl p-4">
                  <div className="flex items-center space-x-3 mb-3">
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
                  <p className="text-[#00e5ff] font-bold text-xl">
                    {formatCurrency(calculateUSDValue(totalDelegatedValue))}
                  </p>
                </div>

                {/* Total Unbonding */}
                {totalUnbondingValue > BigInt(0) && (
                  <div className="bg-[#1e3a2e] border border-[#4ade80]/20 rounded-xl p-4">
                    <div className="flex items-center space-x-3 mb-3">
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
                    <p className="text-[#4ade80] font-bold text-xl">
                      {formatCurrency(calculateUSDValue(totalUnbondingValue))}
                    </p>
                  </div>
                )}
              </div>

              {/* Operators Grid */}
              {delegationsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00e5ff]"></div>
                </div>
              ) : delegationsData?.delegationsByOperator && delegationsData.delegationsByOperator.size > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-white">Select Operator</h3>
                  <div className="grid grid-cols-1 gap-3">
                    {Array.from(delegationsData.delegationsByOperator.values())
                      .filter(delegation => delegation.delegated > BigInt(0))
                      .map((delegation) => {
                        const operatorInfo = getOperatorInfo(delegation);
                        const delegatedValue = calculateUSDValue(delegation.delegated);
                        
                        return (
                          <div
                            key={delegation.operatorAddress}
                            className="bg-[#1a1a24] border border-[#222233] rounded-xl p-4 hover:border-[#00e5ff]/50 transition-all cursor-pointer group"
                            onClick={() => handleOperatorSelect(delegation)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-[#00e5ff] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                  <span className="text-black font-bold text-sm">
                                    {operatorInfo?.operator_meta_info?.slice(0, 2).toUpperCase() || "OP"}
                                  </span>
                                </div>
                                <div>
                                  <h4 className="text-white font-medium group-hover:text-[#00e5ff] transition-colors">
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
                                <p className="text-white font-medium">
                                  {formatUnits(delegation.delegated, decimals)} {token.symbol}
                                </p>
                                <p className="text-sm text-[#00e5ff]">
                                  {formatCurrency(delegatedValue)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <AlertCircle className="w-16 h-16 text-[#666677] mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-white mb-2">No Delegations Found</h3>
                  <p className="text-sm text-[#9999aa] mb-6">
                    You don't have any active delegations for this token.
                  </p>
                  <Button 
                    onClick={() => window.location.href = '/staking'}
                    className="bg-[#00e5ff] hover:bg-[#00b8cc] text-black"
                  >
                    Start Delegating
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Details */}
          {currentStep === "details" && selectedOperator && (
            <div className="space-y-6">
              {/* Selected Operator */}
              <div className="bg-[#1a1a24] border border-[#222233] rounded-xl p-4">
                <div className="flex items-center justify-between">
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
              </div>

              {/* Unbonding Type Selection */}
              <div className="space-y-3">
                <h4 className="text-lg font-medium text-white">Unbonding Type</h4>
                
                {/* Delayed Unbonding */}
                <div 
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    !isInstantUnbond 
                      ? "bg-[#1e3a2e] border-[#4ade80] text-[#4ade80]" 
                      : "bg-[#1a1a24] border-[#333344] text-[#9999aa] hover:border-[#666677]"
                  }`}
                  onClick={() => setIsInstantUnbond(false)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Clock className="w-6 h-6" />
                      <div>
                        <h5 className="font-medium">Delayed Unbonding</h5>
                        <p className="text-sm opacity-80">Wait for the unbonding period</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs bg-[#4ade80] text-black px-3 py-1 rounded-full">
                        No Slash
                      </span>
                      <p className="text-sm mt-1">{unbondPeriod}</p>
                    </div>
                  </div>
                </div>

                {/* Instant Unbonding */}
                <div 
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    isInstantUnbond 
                      ? "bg-[#0d2d1d] border-[#4ade80] text-[#4ade80]" 
                      : "bg-[#1a1a24] border-[#333344] text-[#9999aa] hover:border-[#666677]"
                  }`}
                  onClick={() => setIsInstantUnbond(true)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Zap className="w-6 h-6" />
                      <div>
                        <h5 className="font-medium">Instant Unbonding</h5>
                        <p className="text-sm opacity-80">Unbond immediately with penalty</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs bg-[#4ade80] text-black px-3 py-1 rounded-full">
                        {INSTANT_UNBOND_SLASH_RATE || 25}% Slash
                      </span>
                      <p className="text-sm mt-1">Immediate</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-white">Amount to Undelegate</h4>
                
                {/* Available amount */}
                <div className="flex justify-between items-center p-3 bg-[#1a1a24] rounded-lg">
                  <span className="text-sm text-[#9999aa]">Available for undelegation</span>
                  <span className="text-sm font-medium text-white">
                    {formatUnits(selectedOperator.delegated, decimals)} {token.symbol}
                  </span>
                </div>

                {/* Amount input */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-white">Amount</label>
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
                    className="w-full px-4 py-4 bg-[#15151c] border border-[#333344] rounded-xl text-white text-lg focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff] transition-all"
                    placeholder="0.0"
                  />

                  {amountError && (
                    <p className="text-sm text-red-500">{amountError}</p>
                  )}
                </div>

                {/* Instant unbonding breakdown */}
                {isInstantUnbond && parsedAmount && parsedAmount > BigInt(0) && (
                  <div className="p-4 bg-[#0d2d1d] rounded-xl border border-[#4ade80]/20 space-y-3">
                    <h5 className="text-sm font-medium text-[#4ade80] flex items-center">
                      <Zap className="w-4 h-4 mr-2" />
                      Instant Unbonding Breakdown
                    </h5>
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
              </div>

              {/* Continue Button */}
              <Button
                className="w-full py-4 bg-[#00e5ff] hover:bg-[#00c8df] text-black font-medium text-lg rounded-xl"
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

          {/* STEP 3: Review */}
          {currentStep === "review" && selectedOperator && (
            <div className="space-y-6">
              {/* Review Summary */}
              <div className="bg-[#1a1a24] border border-[#222233] rounded-xl p-6">
                <h4 className="text-lg font-medium text-white mb-4">Undelegation Summary</h4>
                
                <div className="space-y-4">
                  {/* Operator */}
                  <div className="flex justify-between items-center p-3 bg-[#13131a] rounded-lg">
                    <span className="text-[#9999aa]">Operator</span>
                    <div className="flex items-center space-x-3">
                      <span className="text-white font-medium">
                        {getOperatorInfo(selectedOperator)?.operator_meta_info || "Unknown Operator"}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentStep("overview")}
                        className="text-xs text-[#00e5ff] hover:text-[#00b8cc] p-1"
                      >
                        Change
                      </Button>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="flex justify-between items-center p-3 bg-[#13131a] rounded-lg">
                    <span className="text-[#9999aa]">Amount</span>
                    <div className="flex items-center space-x-3">
                      <span className="text-white font-medium">
                        {amount} {token.symbol}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentStep("details")}
                        className="text-xs text-[#00e5ff] hover:text-[#00b8cc] p-1"
                      >
                        Change
                      </Button>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentStep("details")}
                        className="text-xs text-[#00e5ff] hover:text-[#00b8cc] p-1"
                      >
                        Change
                      </Button>
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
                </div>
              </div>

              {/* Estimated Impact */}
              {getOperatorInfo(selectedOperator) && parsedAmount && parsedAmount > BigInt(0) && (
                <div className="bg-[#0d2d1d] border border-[#4ade80]/20 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-[#4ade80] flex items-center">
                      <Info className="w-4 h-4 mr-2" />
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
                </div>
              )}

              {/* Fee information */}
              <div className="flex items-center text-xs text-[#9999aa] px-1">
                <Info size={12} className="mr-2 flex-shrink-0" />
                <span>No additional fees for this transaction</span>
              </div>

              {/* Action buttons */}
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  className="flex-1 border-[#333344] text-white hover:bg-[#222233] py-4 rounded-xl"
                  onClick={() => setCurrentStep("details")}
                >
                  Back
                </Button>

                <Button
                  className="flex-1 bg-[#00e5ff] hover:bg-[#00c8df] text-black font-medium py-4 rounded-xl"
                  disabled={
                    !!txStatus ||
                    !selectedOperator ||
                    !parsedAmount ||
                    parsedAmount === BigInt(0)
                  }
                  onClick={handleUndelegate}
                >
                  {txStatus === "approving" ? "Approving..." :
                   txStatus === "processing" ? "Processing..." :
                   txStatus === "success" ? "Success!" :
                   txStatus === "error" ? "Failed!" :
                   "Undelegate"}
                </Button>
              </div>

              {txError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-400">{txError}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Progress overlay */}
        {isNativeChainOperation ? (
          <MultiChainOperationProgress
            sourceChain={destinationChain}
            destinationChain={destinationChain}
            operation="undelegate"
            mode="local"
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
          <MultiChainOperationProgress
            sourceChain={sourceChain}
            destinationChain={destinationChain}
            operation="undelegate"
            mode="simplex"
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
    </div>
  );
}
