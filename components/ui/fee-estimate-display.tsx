"use client";

import { ActionButton } from "./action-button";
import { useFeeRates, type FeeStrategy } from "@/hooks/useFeeRate";

interface FeeEstimateDisplayProps {
  strategy?: FeeStrategy;
  onStrategyChange?: (strategy: FeeStrategy) => void;
  className?: string;
}

export function FeeEstimateDisplay({
  strategy = "balanced",
  onStrategyChange,
  className,
}: FeeEstimateDisplayProps) {
  const { data, isLoading, error } = useFeeRates();

  if (isLoading) {
    return (
      <div
        className={`p-4 bg-[#1a1a24] rounded-lg border border-[#333344] ${className}`}
      >
        <div className="animate-pulse">
          <div className="h-4 bg-[#333344] rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-[#333344] rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className={`p-4 bg-red-900/20 border border-red-500/50 rounded-lg ${className}`}
      >
        <p className="text-red-400 text-sm">Failed to load fee estimates</p>
      </div>
    );
  }

  const strategies: { key: FeeStrategy; label: string; description: string }[] =
    [
      { key: "fast", label: "Fast", description: "~2 blocks" },
      { key: "balanced", label: "Balanced", description: "~6 blocks" },
      { key: "economical", label: "Economical", description: "~12 blocks" },
    ];

  const recommended = data[strategy];
  const allEstimates = [data.fast, data.balanced, data.economical];

  return (
    <div
      className={`p-4 bg-[#1a1a24] rounded-lg border border-[#333344] ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-white">Network Fee</h3>
        <div className="text-xs text-[#9999aa]">
          {recommended.blocks} block{recommended.blocks !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="mb-3">
        <div className="text-lg font-semibold text-[#00e5ff]">
          {recommended.feeRate} sat/vB
        </div>
        <div className="text-xs text-[#9999aa]">Recommended fee rate</div>
      </div>

      {onStrategyChange && (
        <div className="space-y-2">
          <div className="text-xs text-[#9999aa] mb-2">Fee Strategy:</div>
          <div className="flex gap-1">
            {strategies.map((strat) => (
              <ActionButton
                key={strat.key}
                variant={strategy === strat.key ? "primary" : "ghost"}
                size="sm"
                onClick={() => onStrategyChange(strat.key)}
                className="text-xs px-2 py-1 h-7"
              >
                {strat.label}
              </ActionButton>
            ))}
          </div>
        </div>
      )}

      {allEstimates.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#333344]">
          <div className="text-xs text-[#9999aa] mb-2">All Estimates:</div>
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {allEstimates.map((estimate) => (
              <div
                key={`${estimate.blocks}-${estimate.feeRate}`}
                className={`flex justify-between text-xs ${
                  estimate.blocks === recommended.blocks &&
                  estimate.feeRate === recommended.feeRate
                    ? "text-[#00e5ff] font-medium"
                    : "text-[#9999aa]"
                }`}
              >
                <span>{estimate.blocks} blocks</span>
                <span>{estimate.feeRate} sat/vB</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
