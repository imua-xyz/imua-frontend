// app/dashboard/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ChevronDown,
  TrendingUp,
  ArrowRight,
  ChevronRight,
  AlertCircle,
  Wallet,
  Info,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { validTokens, Token, getTokenKey } from "@/types/tokens";
import { useAllWalletsStore } from "@/stores/allWalletsStore";
import { useSyncAllWalletsToStore } from "@/hooks/useSyncAllWalletsToStore";
import { WalletConnectorProvider } from "@/components/providers/WalletConnectorProvider";
import { WalletConnectionModal } from "@/components/modals/WalletConnectionModal";
import { Header } from "@/components/layout/header";
import { TokenIcon } from "@/components/ui/token-icon";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/action-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ProgressBar } from "@/components/ui/progress-bar";
import { PieChart } from "@/components/ui/pie-chart";
import { formatCurrency, formatPercentage } from "@/lib/format";
import { useStakingPositions } from "@/hooks/useStakingPositions";
import { useAllRewards } from "@/hooks/useRewards";
import { useTokenPrices } from "@/hooks/useTokenPrices";
import { useDelegations } from "@/hooks/useDelegations";
import { useOperators, useOperatorsWithOptInAVS } from "@/hooks/useOperators";
import { validRewardTokens } from "@/types/tokens";
import { useBootstrapNetworkStatistics } from "@/hooks/useBootstrapGraphQL";
import { useBootstrapStatus } from "@/hooks/useBootstrapStatus";
import {
  RewardsPerToken,
  RewardsPerAVS,
  RewardsPerTokenWithValues,
} from "@/types/rewards";
import { StakingPositionPerToken } from "@/types/position";
import { DelegationPerOperator } from "@/types/delegations";
import { AVS } from "@/types/avs";

// Add skeleton loading components at the top of the file
function SkeletonCard() {
  return (
    <Card className="bg-[#13131a] border-[#222233] text-white animate-pulse">
      <CardHeader>
        <div className="h-4 bg-[#222233] rounded w-1/3"></div>
      </CardHeader>
      <CardContent>
        <div className="h-8 bg-[#222233] rounded w-1/2 mb-4"></div>
        <div className="h-32 bg-[#222233] rounded mb-4"></div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between">
              <div className="h-3 bg-[#222233] rounded w-1/3"></div>
              <div className="h-3 bg-[#222233] rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SkeletonPositionCard() {
  return (
    <Card className="bg-[#13131a] border-[#222233] text-white animate-pulse">
      <div className="p-6">
        <div className="flex items-center">
          <div className="w-9 h-9 bg-[#222233] rounded-full mr-4"></div>
          <div className="flex-1">
            <div className="h-5 bg-[#222233] rounded w-20 mb-2"></div>
            <div className="h-3 bg-[#222233] rounded w-32"></div>
          </div>
          <div className="hidden md:flex gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center">
                <div className="h-3 bg-[#222233] rounded w-16 mb-1"></div>
                <div className="h-4 bg-[#222233] rounded w-20 mb-1"></div>
                <div className="h-3 bg-[#222233] rounded w-12"></div>
              </div>
            ))}
          </div>
          <div className="w-5 h-5 bg-[#222233] rounded ml-4"></div>
        </div>
      </div>
    </Card>
  );
}

// Mock APY data (not available in indexer schema yet)
const mockAverageApy = 7.8;

export default function DashboardPage() {
  const router = useRouter();
  const [expandedPosition, setExpandedPosition] = useState<string | null>(null);
  const [expandedReward, setExpandedReward] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [walletModalToken, setWalletModalToken] = useState<Token | null>(null);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [providerToken, setProviderToken] = useState<Token>(validTokens[0]);
  const [operatorSortMetric, setOperatorSortMetric] = useState<
    "self_staked_pct" | "total_staked" | "commission"
  >("self_staked_pct");
  const [selectedOperatorToken, setSelectedOperatorToken] =
    useState<Token | null>(null);

  // Sync wallet state
  useSyncAllWalletsToStore();

  // Get wallet connection status
  const { wallets } = useAllWalletsStore();

  // Helper function to check if wallet is connected for a token
  const isWalletConnectedForToken = (token: Token) => {
    const chainId = token.network.customChainIdByImua;
    const walletState = wallets[chainId];
    return (walletState?.isConnected && !!walletState?.address) || false;
  };

  // Helper function to open wallet connection modal for a specific token
  const openWalletConnectionModal = (token: Token) => {
    setProviderToken(token); // Switch provider to the correct token
    setWalletModalToken(token);
    setIsWalletModalOpen(true);
  };

  // Navigation functions to staking page with correct token and tab
  const navigateToStaking = (
    token: Token,
    tab: "stake" | "delegate" | "undelegate" | "withdraw" = "stake",
  ) => {
    // Store the selected token and tab in localStorage for the staking page to read
    localStorage.setItem("selectedStakingToken", JSON.stringify(token));
    localStorage.setItem("selectedStakingTab", tab);
    router.push("/staking");
  };

  // Always call hooks, but handle logic conditionally
  const {
    data: positionsData,
    isLoading: positionsLoading,
    error: positionsError,
  } = useStakingPositions();
  const {
    data: rewardsData,
    isLoading: rewardsLoading,
    error: rewardsError,
  } = useAllRewards();
  const {
    data: pricesData,
    isLoading: pricesLoading,
    error: pricesError,
  } = useTokenPrices([...validTokens, ...validRewardTokens]);
  // Use selected token or default to first token
  // Operators can have positions for any valid token (EVM, BTC, XRP, etc.)
  const dashboardToken = selectedOperatorToken || validTokens[0];

  const {
    data: operators,
    isLoading: operatorsLoading,
    error: operatorsError,
  } = useOperators({ token: dashboardToken });
  const {
    data: networkStats,
    loading: networkStatsLoading,
    error: networkStatsError,
  } = useBootstrapNetworkStatistics();
  const { bootstrapStatus } = useBootstrapStatus();

  // Extract data from Maps for easier access
  const positions = positionsData;
  const rewardsByAvs = rewardsData?.rewardsByAvs;
  const rewardsByToken = rewardsData?.rewardsByToken;
  const prices = pricesData;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate totals from real data with memoization - MUST be called before any conditional returns
  const totalValueDeposited = useMemo(() => {
    return Array.from(positions?.values() || []).reduce((sum, pos) => {
      if (pos.data) {
        const price = prices?.get(getTokenKey(pos.data.token))?.data?.data || 0;
        const priceDecimals =
          prices?.get(getTokenKey(pos.data.token))?.data?.decimals || 0;
        const priceValue = Number(price) / Math.pow(10, priceDecimals);
        const value =
          (Number(pos.data.totalDeposited) /
            Math.pow(10, pos.data.token.decimals)) *
          priceValue;
        return sum + value;
      }
      return sum;
    }, 0);
  }, [positions, prices]);

  const totalRewardsValue = useMemo(() => {
    return Array.from(rewardsByToken?.values() || []).reduce((sum, reward) => {
      if (!reward) return sum;
      const price = prices?.get(getTokenKey(reward.token))?.data?.data || 0;
      const priceDecimals =
        prices?.get(getTokenKey(reward.token))?.data?.decimals || 0;
      const priceValue = Number(price) / Math.pow(10, priceDecimals);
      const value =
        (Number(reward.totalAmount) / Math.pow(10, reward.token.decimals)) *
        priceValue;
      return sum + value;
    }, 0);
  }, [rewardsByToken, prices]);

  // Calculate totalValue for each reward token with memoization
  const rewardsWithValues: RewardsPerTokenWithValues[] = useMemo(() => {
    return Array.from(rewardsByToken?.values() || [])
      .filter((reward): reward is RewardsPerToken => reward !== undefined)
      .map((reward) => {
        const price = prices?.get(getTokenKey(reward.token))?.data?.data || 0;
        const priceDecimals =
          prices?.get(getTokenKey(reward.token))?.data?.decimals || 0;
        const priceValue = Number(price) / Math.pow(10, priceDecimals);
        const totalValue =
          (Number(reward.totalAmount) / Math.pow(10, reward.token.decimals)) *
          priceValue;

        // Convert sources Map to array with values
        const sourcesArray = Array.from(reward.sources.values());
        const sourcesWithValues = sourcesArray.map((source) => {
          const sourceValue =
            (Number(source.amount) / Math.pow(10, reward.token.decimals)) *
            priceValue;
          return {
            ...source,
            value: sourceValue,
          };
        });

        return {
          ...reward,
          totalValue,
          sources: sourcesWithValues,
        };
      });
  }, [rewardsByToken, prices]);

  const toggleExpand = (id: string) => {
    setExpandedPosition(expandedPosition === id ? null : id);
  };

  const toggleRewardExpand = (tokenSymbol: string) => {
    setExpandedReward(expandedReward === tokenSymbol ? null : tokenSymbol);
  };

  // Sort operators based on selected metric
  const sortedOperators = useMemo(() => {
    if (!operators) return [];

    const operatorsArray = [...operators];

    switch (operatorSortMetric) {
      case "self_staked_pct":
        return operatorsArray.sort((a, b) => {
          const aTotal = a.position?.total_amount || 0;
          const aSelf = a.position?.self_amount || 0;
          const bTotal = b.position?.total_amount || 0;
          const bSelf = b.position?.self_amount || 0;

          const aPct = aTotal > 0 ? (aSelf / aTotal) * 100 : 0;
          const bPct = bTotal > 0 ? (bSelf / bTotal) * 100 : 0;

          return bPct - aPct; // Descending
        });

      case "total_staked":
        return operatorsArray.sort((a, b) => {
          const aTotal = a.position?.total_amount || 0;
          const bTotal = b.position?.total_amount || 0;
          return bTotal - aTotal; // Descending
        });

      case "commission":
        return operatorsArray.sort((a, b) => {
          const aRate = Number(a.commission.commission_rates.rate);
          const bRate = Number(b.commission.commission_rates.rate);
          return aRate - bRate; // Ascending (lower commission is better)
        });

      default:
        return operatorsArray;
    }
  }, [operators, operatorSortMetric]);

  // Format token amount helper
  const formatTokenAmount = (amount: number, decimals: number = 18): string => {
    try {
      const num = amount / Math.pow(10, decimals);
      if (num >= 1000000) {
        return `${(num / 1000000).toFixed(2)}M`;
      } else if (num >= 1000) {
        return `${(num / 1000).toFixed(2)}K`;
      } else if (num >= 1) {
        return num.toFixed(2);
      } else {
        return num.toFixed(4);
      }
    } catch {
      return amount.toLocaleString();
    }
  };

  // Don't render anything until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#0a0a0f]">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00e5ff] mx-auto"></div>
          <p className="text-white mt-4">Initializing...</p>
        </div>
      </div>
    );
  }

  const isLoading =
    positionsLoading ||
    rewardsLoading ||
    pricesLoading ||
    operatorsLoading ||
    networkStatsLoading;
  const hasError =
    positionsError ||
    rewardsError ||
    pricesError ||
    operatorsError ||
    networkStatsError;

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <WalletConnectorProvider token={providerToken}>
        <Header token={providerToken} />

        <main className="max-w-6xl mx-auto px-6 py-12">
          {isLoading && (
            <div className="space-y-6">
              {/* Summary Section Skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                <SkeletonCard />
                <SkeletonCard />
              </div>

              {/* Positions Section Skeleton */}
              <h2 className="text-xl font-bold text-white mb-6">
                Your Positions
              </h2>
              <div className="space-y-6 mb-10">
                {[1, 2, 3].map((i) => (
                  <SkeletonPositionCard key={i} />
                ))}
              </div>

              {/* Rewards Section Skeleton */}
              <h2 className="text-xl font-bold text-white mb-6">
                Your Rewards
              </h2>
              <div className="space-y-4 mb-10">
                {[1, 2].map((i) => (
                  <SkeletonPositionCard key={i} />
                ))}
              </div>
            </div>
          )}

          {hasError && (
            <div className="text-center py-12">
              <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
              <p className="text-white">Error loading dashboard data</p>
              <p className="text-[#9999aa] text-sm mt-2 mb-4">
                Please try refreshing the page
              </p>
              <ActionButton
                onClick={() => window.location.reload()}
                variant="primary"
                size="md"
              >
                Refresh Dashboard
              </ActionButton>
            </div>
          )}

          {!isLoading && !hasError && (
            <>
              {/* Summary Section */}
              <div
                className={`grid ${bootstrapStatus?.isBootstrapped ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"} gap-6 mb-10`}
              >
                <Card className="bg-[#13131a] border-[#222233] text-white">
                  <CardHeader>
                    <CardTitle className="text-[#9999aa] text-sm font-normal">
                      Total Value Staked
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline">
                      <span className="text-3xl font-bold">
                        {formatCurrency(totalValueDeposited)}
                      </span>
                      <span className="ml-2 text-green-400 text-sm">
                        +5.2% <TrendingUp size={14} className="inline" />
                      </span>
                    </div>
                    <div className="mt-6">
                      {totalValueDeposited > 0 ? (
                        <div className="h-40 flex justify-center">
                          <PieChart
                            data={Array.from(positions?.values() || [])
                              .filter((pos) => pos.data)
                              .map((pos, idx) => {
                                const position = pos.data!;
                                const price =
                                  prices?.get(getTokenKey(position.token))?.data
                                    ?.data || 0;
                                const priceDecimals =
                                  prices?.get(getTokenKey(position.token))?.data
                                    ?.decimals || 0;
                                const priceValue =
                                  Number(price) / Math.pow(10, priceDecimals);
                                const value =
                                  (Number(position.totalDeposited) /
                                    Math.pow(10, position.token.decimals)) *
                                  priceValue;
                                return {
                                  name: position.token.symbol,
                                  value: value,
                                  color: [
                                    "#00e5ff",
                                    "#e631dc",
                                    "#f7931a",
                                    "#ff6b6b",
                                    "#4ecdc4",
                                  ][idx % 5],
                                  token: position.token,
                                };
                              })
                              .sort((a, b) => b.value - a.value) // Sort by value descending
                              .map((item, idx) => ({
                                ...item,
                                color: [
                                  "#00e5ff",
                                  "#e631dc",
                                  "#f7931a",
                                  "#ff6b6b",
                                  "#4ecdc4",
                                ][idx % 5],
                              }))}
                          />
                        </div>
                      ) : (
                        <div className="h-40 flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-24 h-24 border-2 border-[#333344] rounded-full flex items-center justify-center mx-auto mb-3">
                              <span className="text-[#9999aa] text-sm">
                                No stakes
                              </span>
                            </div>
                            <p className="text-sm text-[#9999aa]">
                              No positions staked yet
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="mt-4 space-y-2">
                        {Array.from(positions?.values() || [])
                          .filter((pos) => pos.data)
                          .map((pos, idx) => {
                            const position = pos.data!;
                            const price =
                              prices?.get(getTokenKey(position.token))?.data
                                ?.data || 0;
                            const priceDecimals =
                              prices?.get(getTokenKey(position.token))?.data
                                ?.decimals || 0;
                            const priceValue =
                              Number(price) / Math.pow(10, priceDecimals);
                            const value =
                              (Number(position.totalDeposited) /
                                Math.pow(10, position.token.decimals)) *
                              priceValue;
                            const percentage =
                              totalValueDeposited > 0
                                ? (value / totalValueDeposited) * 100
                                : 0;

                            return {
                              token: position.token,
                              value,
                              percentage,
                              color: [
                                "#00e5ff",
                                "#e631dc",
                                "#f7931a",
                                "#ff6b6b",
                                "#4ecdc4",
                              ][idx % 5],
                            };
                          })
                          .sort((a, b) => b.value - a.value) // Sort by value descending
                          .map((item, idx) => (
                            <div
                              key={item.token.symbol}
                              className="flex items-center justify-between"
                            >
                              <div className="flex items-center">
                                <div
                                  className="w-3 h-3 rounded-full mr-2"
                                  style={{
                                    backgroundColor: [
                                      "#00e5ff",
                                      "#e631dc",
                                      "#f7931a",
                                      "#ff6b6b",
                                      "#4ecdc4",
                                    ][idx % 5],
                                  }}
                                ></div>
                                <TokenIcon
                                  src={item.token.iconUrl}
                                  alt={item.token.symbol}
                                  size={16}
                                />
                                <span className="ml-2 text-sm">
                                  {item.token.symbol}
                                </span>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium">
                                  {formatCurrency(item.value)}
                                </p>
                                <p className="text-xs text-[#9999aa]">
                                  {item.percentage.toFixed(1)}%
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {bootstrapStatus?.isBootstrapped && (
                  <Card className="bg-[#13131a] border-[#222233] text-white">
                    <CardHeader>
                      <CardTitle className="text-[#9999aa] text-sm font-normal">
                        Total Rewards Earned
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-baseline">
                        <span className="text-3xl font-bold">
                          {formatCurrency(totalRewardsValue)}
                        </span>
                        <span className="ml-2 text-green-400 text-sm">
                          +3.8% <TrendingUp size={14} className="inline" />
                        </span>
                      </div>
                      <div className="mt-6">
                        {totalRewardsValue > 0 ? (
                          <div className="h-40 flex justify-center">
                            <PieChart
                              data={rewardsWithValues
                                .map((reward, idx) => ({
                                  name: reward.token.symbol,
                                  value: reward.totalValue,
                                  color: [
                                    "#00e5ff",
                                    "#e631dc",
                                    "#f7931a",
                                    "#ff6b6b",
                                    "#4ecdc4",
                                  ][idx % 5],
                                  token: reward.token,
                                }))
                                .sort((a, b) => b.value - a.value) // Sort by value descending
                                .map((item, idx) => ({
                                  ...item,
                                  color: [
                                    "#00e5ff",
                                    "#e631dc",
                                    "#f7931a",
                                    "#ff6b6b",
                                    "#4ecdc4",
                                  ][idx % 5],
                                }))}
                            />
                          </div>
                        ) : (
                          <div className="h-40 flex items-center justify-center">
                            <div className="text-center">
                              <div className="w-24 h-24 border-2 border-[#333344] rounded-full flex items-center justify-center mx-auto mb-3">
                                <span className="text-[#9999aa] text-sm">
                                  No rewards
                                </span>
                              </div>
                              <p className="text-sm text-[#9999aa]">
                                No rewards earned yet
                              </p>
                            </div>
                          </div>
                        )}
                        <div className="mt-4 space-y-2">
                          {rewardsWithValues
                            .map((reward, idx) => {
                              const percentage =
                                totalRewardsValue > 0
                                  ? (reward.totalValue / totalRewardsValue) *
                                    100
                                  : 0;

                              return {
                                token: reward.token,
                                totalValue: reward.totalValue,
                                percentage,
                                color: [
                                  "#00e5ff",
                                  "#e631dc",
                                  "#f7931a",
                                  "#ff6b6b",
                                  "#4ecdc4",
                                ][idx % 5],
                              };
                            })
                            .sort((a, b) => b.totalValue - a.totalValue) // Sort by value descending
                            .map((item, idx) => (
                              <div
                                key={item.token.symbol}
                                className="flex items-center justify-between"
                              >
                                <div className="flex items-center">
                                  <div
                                    className="w-3 h-3 rounded-full mr-2"
                                    style={{
                                      backgroundColor: [
                                        "#00e5ff",
                                        "#e631dc",
                                        "#f7931a",
                                        "#ff6b6b",
                                        "#4ecdc4",
                                      ][idx % 5],
                                    }}
                                  ></div>
                                  <TokenIcon
                                    src={item.token.iconUrl}
                                    alt={item.token.symbol}
                                    size={16}
                                  />
                                  <span className="ml-2 text-sm">
                                    {item.token.symbol}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-green-400">
                                    {formatCurrency(item.totalValue)}
                                  </p>
                                  <p className="text-xs text-[#9999aa]">
                                    {item.percentage.toFixed(1)}%
                                  </p>
                                </div>
                              </div>
                            ))}
                          {rewardsWithValues.length === 0 && (
                            <div className="text-center py-2">
                              <p className="text-sm text-[#9999aa]">
                                Start staking to earn rewards
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Positions Section */}
              <h2 className="text-xl font-bold text-white mb-6">
                Your Positions
              </h2>
              <div className="space-y-6 mb-10">
                {validTokens.map((token) => {
                  // Check if wallet is connected for this token
                  const isWalletConnected = isWalletConnectedForToken(token);

                  // Find position data for this token using Map lookup
                  const positionData = positions?.get(getTokenKey(token));

                  // If wallet is not connected, show connect wallet card
                  if (!isWalletConnected) {
                    return (
                      <Card
                        key={token.symbol}
                        className="bg-[#13131a] border-[#222233] text-white overflow-hidden"
                      >
                        <div className="flex items-center justify-between p-6">
                          <div className="flex items-center flex-1">
                            <TokenIcon
                              src={token.iconUrl}
                              alt={token.symbol}
                              size={36}
                            />
                            <div className="ml-4">
                              <h3 className="text-lg font-medium">
                                {token.symbol}
                              </h3>
                              <p className="text-sm text-[#9999aa]">
                                {token.name}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <p className="text-sm text-[#9999aa]">
                                Connect your {token.network.chainName} wallet to
                                view positions
                              </p>
                            </div>
                            <ActionButton
                              onClick={() => openWalletConnectionModal(token)}
                              variant="primary"
                              size="md"
                              className="flex items-center gap-2 min-w-[140px]"
                            >
                              <Wallet size={16} />
                              Connect
                            </ActionButton>
                          </div>
                        </div>
                      </Card>
                    );
                  }

                  // If wallet is connected but no position data or zero position, show empty state with Start Staking button
                  const position = positionData?.data;
                  const hasNoPosition =
                    !position || Number(position.totalDeposited) === 0;

                  if (hasNoPosition) {
                    return (
                      <Card
                        key={token.symbol}
                        className="bg-[#13131a] border-[#222233] text-white overflow-hidden"
                      >
                        <div className="flex items-center justify-between p-6">
                          <div className="flex items-center flex-1">
                            <TokenIcon
                              src={token.iconUrl}
                              alt={token.symbol}
                              size={36}
                            />
                            <div className="ml-4">
                              <h3 className="text-lg font-medium">
                                {token.symbol}
                              </h3>
                              <p className="text-sm text-[#9999aa]">
                                {token.name}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <p className="text-sm text-[#9999aa]">
                                No staking positions found
                              </p>
                            </div>
                            <ActionButton
                              onClick={() => {
                                localStorage.setItem(
                                  "selectedStakingToken",
                                  JSON.stringify(token),
                                );
                                localStorage.setItem(
                                  "selectedStakingTab",
                                  "stake",
                                );
                                router.push("/staking");
                              }}
                              variant="primary"
                              size="md"
                              className="min-w-[140px]"
                            >
                              Start Staking
                            </ActionButton>
                          </div>
                        </div>
                      </Card>
                    );
                  }

                  // If wallet is connected and has position data, show normal position card

                  // At this point, position is guaranteed to be defined
                  const safePosition = position as StakingPositionPerToken;

                  const price =
                    prices?.get(getTokenKey(safePosition.token))?.data?.data ||
                    0;
                  const priceDecimals =
                    prices?.get(getTokenKey(safePosition.token))?.data
                      ?.decimals || 0;
                  const priceValue =
                    Number(price) / Math.pow(10, priceDecimals);
                  const totalValue =
                    (Number(safePosition.totalDeposited) /
                      Math.pow(10, safePosition.token.decimals)) *
                    priceValue;
                  const delegatedValue =
                    (Number(safePosition.delegated) /
                      Math.pow(10, safePosition.token.decimals)) *
                    priceValue;
                  const delegatedAmount =
                    Number(safePosition.delegated) /
                    Math.pow(10, safePosition.token.decimals);
                  const totalAmount =
                    Number(safePosition.totalDeposited) /
                    Math.pow(10, safePosition.token.decimals);

                  return (
                    <div key={`${safePosition.token.symbol}-${token.symbol}`}>
                      <Card className="bg-[#13131a] border-[#222233] text-white overflow-hidden">
                        <div
                          className="flex items-center justify-between p-6 cursor-pointer"
                          onClick={() =>
                            toggleExpand(
                              `${safePosition.token.symbol}-${token.symbol}`,
                            )
                          }
                        >
                          <div className="flex items-center flex-1">
                            <TokenIcon
                              src={safePosition.token.iconUrl}
                              alt={safePosition.token.symbol}
                              size={36}
                            />
                            <div className="ml-4">
                              <h3 className="text-lg font-medium">
                                {safePosition.token.symbol}
                              </h3>
                              <p className="text-sm text-[#9999aa]">
                                {safePosition.token.name}
                              </p>
                            </div>
                          </div>

                          <div className="hidden md:flex items-center gap-6 flex-1 justify-center">
                            <div className="text-center min-w-[100px]">
                              <p className="text-sm text-[#9999aa]">
                                Total Deposited
                              </p>
                              <p className="text-base font-medium">
                                {formatCurrency(totalValue)}
                              </p>
                              <p className="text-xs text-[#9999aa]">
                                {totalAmount.toFixed(4)}{" "}
                                {safePosition.token.symbol}
                              </p>
                            </div>

                            <div className="text-center min-w-[100px]">
                              <p className="text-sm text-[#9999aa]">
                                Delegated
                              </p>
                              <p className="text-base font-medium">
                                {formatCurrency(delegatedValue)}
                              </p>
                              <p className="text-xs text-[#9999aa]">
                                {delegatedAmount.toFixed(4)}{" "}
                                {safePosition.token.symbol}
                              </p>
                            </div>

                            <div className="text-center min-w-[100px]">
                              <p className="text-sm text-[#9999aa]">
                                Active AVS
                              </p>
                              <p className="text-base font-medium text-[#00e5ff]">
                                {
                                  Array.from(
                                    rewardsByAvs?.values() || [],
                                  ).filter((avs) => avs !== undefined).length
                                }
                              </p>
                            </div>
                          </div>

                          <div className="md:hidden flex flex-col items-end flex-1">
                            <p className="font-medium">
                              {formatCurrency(totalValue)}
                            </p>
                            <p className="text-xs text-[#9999aa]">
                              {delegatedAmount.toFixed(4)}{" "}
                              {safePosition.token.symbol} delegated
                            </p>
                          </div>

                          <button className="ml-4 text-[#9999aa] flex-shrink-0">
                            {expandedPosition ===
                            `${safePosition.token.symbol}-${token.symbol}` ? (
                              <ChevronDown size={20} />
                            ) : (
                              <ChevronRight size={20} />
                            )}
                          </button>
                        </div>

                        {/* Expanded View */}
                        {expandedPosition ===
                          `${safePosition.token.symbol}-${token.symbol}` && (
                          <ExpandedPositionView
                            position={safePosition}
                            priceValue={priceValue}
                            rewardsByAvs={Array.from(
                              rewardsByAvs?.values() || [],
                            ).filter((avs) => avs !== undefined)}
                            onNavigateToStaking={navigateToStaking}
                          />
                        )}
                      </Card>
                    </div>
                  );
                })}
              </div>

              {/* Rewards Section */}
              {bootstrapStatus?.isBootstrapped && (
                <>
                  <h2 className="text-xl font-bold text-white mb-6">
                    Your Rewards
                  </h2>
                  <div className="space-y-4 mb-10">
                    {rewardsWithValues
                      .sort((a, b) => b.totalValue - a.totalValue) // Sort by total value descending
                      .map((rewardPosition) => (
                        <div key={rewardPosition.token.symbol}>
                          <Card className="bg-[#13131a] border-[#222233] text-white overflow-hidden">
                            <div
                              className="flex items-center justify-between p-6 cursor-pointer"
                              onClick={() =>
                                toggleRewardExpand(rewardPosition.token.symbol)
                              }
                            >
                              <div className="flex items-center flex-1">
                                <TokenIcon
                                  src={rewardPosition.token.iconUrl}
                                  alt={rewardPosition.token.symbol}
                                  size={36}
                                />
                                <div className="ml-4">
                                  <h3 className="text-lg font-medium">
                                    {rewardPosition.token.symbol}
                                  </h3>
                                  <p className="text-sm text-[#9999aa]">
                                    {rewardPosition.token.name}
                                  </p>
                                </div>
                              </div>

                              <div className="hidden md:flex items-center gap-8 flex-1 justify-center">
                                <div className="text-center min-w-[120px]">
                                  <p className="text-sm text-[#9999aa]">
                                    Total Value
                                  </p>
                                  <p className="text-base font-medium text-green-400">
                                    {formatCurrency(rewardPosition.totalValue)}
                                  </p>
                                  <p className="text-xs text-[#9999aa]">
                                    {Number(rewardPosition.totalAmount) /
                                      Math.pow(
                                        10,
                                        rewardPosition.token.decimals,
                                      )}{" "}
                                    {rewardPosition.token.symbol}
                                  </p>
                                </div>

                                <div className="text-center min-w-[120px]">
                                  <p className="text-sm text-[#9999aa]">
                                    Sources
                                  </p>
                                  <p className="text-base font-medium text-[#00e5ff]">
                                    {rewardPosition.sources.length}
                                  </p>
                                  <p className="text-xs text-[#9999aa]">
                                    AVS services
                                  </p>
                                </div>

                                <div className="text-center min-w-[120px]">
                                  <p className="text-sm text-[#9999aa]">
                                    Avg APY
                                  </p>
                                  <p className="text-base font-medium text-[#00e5ff]">
                                    {formatPercentage(
                                      rewardPosition.sources.reduce(
                                        (
                                          sum: number,
                                          s: {
                                            avs: AVS;
                                            amount: bigint;
                                            value: number;
                                          },
                                        ) => sum + s.avs.apy,
                                        0,
                                      ) / rewardPosition.sources.length,
                                    )}
                                  </p>
                                </div>
                              </div>

                              <div className="md:hidden flex flex-col items-end flex-1">
                                <p className="font-medium text-green-400">
                                  {formatCurrency(rewardPosition.totalValue)}
                                </p>
                                <p className="text-xs text-[#9999aa]">
                                  {Number(rewardPosition.totalAmount) /
                                    Math.pow(
                                      10,
                                      rewardPosition.token.decimals,
                                    )}{" "}
                                  {rewardPosition.token.symbol}
                                </p>
                              </div>

                              <button className="ml-4 text-[#9999aa] flex-shrink-0">
                                {expandedReward ===
                                rewardPosition.token.symbol ? (
                                  <ChevronDown size={20} />
                                ) : (
                                  <ChevronRight size={20} />
                                )}
                              </button>
                            </div>

                            {/* Expanded View */}
                            {expandedReward === rewardPosition.token.symbol && (
                              <ExpandedRewardView
                                rewardPosition={rewardPosition}
                              />
                            )}
                          </Card>
                        </div>
                      ))}

                    {rewardsWithValues.length === 0 && (
                      <Card className="bg-[#13131a] border-[#222233] text-white">
                        <div className="p-8 text-center">
                          <div className="text-[#9999aa] mb-2">
                            <AlertCircle size={48} className="mx-auto mb-4" />
                          </div>
                          <h3 className="text-lg font-medium mb-2">
                            No Rewards Available
                          </h3>
                          <p className="text-sm text-[#9999aa]">
                            Start staking to earn rewards from AVS services
                          </p>
                        </div>
                      </Card>
                    )}
                  </div>
                </>
              )}

              {/* Top Operators Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                <Card className="bg-[#13131a] border-[#222233] text-white">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle>Top Operators</CardTitle>
                    {/* Token Selector */}
                    <Select
                      value={dashboardToken?.symbol || validTokens[0]?.symbol}
                      onValueChange={(symbol: string) => {
                        const token = validTokens.find(
                          (t) => t.symbol === symbol,
                        );
                        setSelectedOperatorToken(token || null);
                      }}
                    >
                      <SelectTrigger className="w-[140px] bg-[#1a1a24] border-[#333344] text-white text-sm h-9">
                        <SelectValue placeholder="Select token" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#21212f] border-[#333344] text-white">
                        {validTokens.map((token) => (
                          <SelectItem key={token.symbol} value={token.symbol}>
                            <div className="flex items-center gap-2">
                              <TokenIcon
                                src={token.iconUrl}
                                alt={token.symbol}
                                size={16}
                              />
                              <span>{token.symbol}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardHeader>
                  <CardContent>
                    {/* Bootstrap Phase Notice & Sort Selector */}
                    {bootstrapStatus?.isBootstrapped === false && (
                      <div className="bg-[#1a1a24] border border-[#444455] rounded-lg p-3 mb-3 flex items-start gap-2">
                        <Info
                          size={14}
                          className="text-[#00e5ff] mt-0.5 flex-shrink-0"
                        />
                        <div className="text-xs text-[#9999aa] flex-1">
                          <span className="font-medium text-white">
                            Bootstrap Phase:
                          </span>{" "}
                          APR data unavailable. Showing {dashboardToken?.symbol}{" "}
                          operators by{" "}
                          {operatorSortMetric === "self_staked_pct"
                            ? "self-staked %"
                            : operatorSortMetric === "total_staked"
                              ? "total staked"
                              : "commission"}
                          .
                        </div>
                      </div>
                    )}

                    {/* Sort Metric Selector */}
                    <div className="mb-4">
                      <Select
                        value={operatorSortMetric}
                        onValueChange={(
                          value:
                            | "self_staked_pct"
                            | "total_staked"
                            | "commission",
                        ) => setOperatorSortMetric(value)}
                      >
                        <SelectTrigger className="w-full bg-[#1a1a24] border-[#333344] text-white text-sm">
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#21212f] border-[#333344] text-white">
                          <SelectItem value="self_staked_pct">
                            Sort by Self Staked %
                          </SelectItem>
                          <SelectItem value="total_staked">
                            Sort by Total Staked
                          </SelectItem>
                          <SelectItem value="commission">
                            Sort by Commission
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-4">
                      {sortedOperators?.slice(0, 5).map((operator, idx) => {
                        const totalAmount =
                          operator.position?.total_amount || 0;
                        const selfAmount = operator.position?.self_amount || 0;
                        const selfStakedPct =
                          totalAmount > 0
                            ? (selfAmount / totalAmount) * 100
                            : 0;

                        return (
                          <div
                            key={operator.address}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center flex-1">
                              <div className="w-8 h-8 bg-[#1a1a24] rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                                <span className="text-sm font-medium">
                                  {idx + 1}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium truncate">
                                  {operator.operator_meta_info ||
                                    operator.address.slice(0, 8)}
                                </p>
                                <p className="text-xs text-[#9999aa]">
                                  Commission:{" "}
                                  {formatPercentage(
                                    Number(
                                      operator.commission.commission_rates.rate,
                                    ) * 100,
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="text-right ml-3 flex-shrink-0">
                              {bootstrapStatus?.isBootstrapped ? (
                                <>
                                  <p className="text-[#00e5ff] font-medium">
                                    {formatPercentage(Number(operator.apr))}
                                  </p>
                                  <p className="text-xs text-[#9999aa]">APR</p>
                                </>
                              ) : (
                                <>
                                  {operatorSortMetric === "self_staked_pct" && (
                                    <>
                                      <p className="text-[#00e5ff] font-medium">
                                        {selfStakedPct > 0
                                          ? `${selfStakedPct.toFixed(1)}%`
                                          : "N/A"}
                                      </p>
                                      <p className="text-xs text-[#9999aa]">
                                        Self Staked
                                      </p>
                                    </>
                                  )}
                                  {operatorSortMetric === "total_staked" &&
                                    dashboardToken && (
                                      <>
                                        <p className="text-[#00e5ff] font-medium">
                                          {totalAmount > 0
                                            ? formatTokenAmount(
                                                totalAmount,
                                                dashboardToken.decimals,
                                              )
                                            : "N/A"}
                                        </p>
                                        <p className="text-xs text-[#9999aa]">
                                          {dashboardToken.symbol}
                                        </p>
                                      </>
                                    )}
                                  {operatorSortMetric === "commission" && (
                                    <>
                                      <p className="text-[#00e5ff] font-medium">
                                        {formatPercentage(
                                          Number(
                                            operator.commission.commission_rates
                                              .rate,
                                          ) * 100,
                                        )}
                                      </p>
                                      <p className="text-xs text-[#9999aa]">
                                        Commission
                                      </p>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {(!sortedOperators || sortedOperators.length === 0) && (
                        <div className="text-center py-4">
                          <p className="text-sm text-[#9999aa]">
                            No operators available
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#13131a] border-[#222233] text-white">
                  <CardHeader>
                    <CardTitle>Network Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-[#9999aa] text-sm mb-1">
                          Total Value Locked
                        </p>
                        <p className="text-xl font-medium">
                          {formatCurrency(networkStats.totalTvl)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[#9999aa] text-sm mb-1">
                          Active Stakers
                        </p>
                        <p className="text-xl font-medium">
                          {networkStats.activeStakers.toLocaleString()}
                        </p>
                      </div>
                      {bootstrapStatus?.isBootstrapped ? (
                        <div>
                          <p className="text-[#9999aa] text-sm mb-1">
                            Average APY
                          </p>
                          <p className="text-xl font-medium text-[#00e5ff]">
                            {formatPercentage(mockAverageApy)}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-[#9999aa] text-sm mb-1">
                            Total Operators
                          </p>
                          <p className="text-xl font-medium text-[#00e5ff]">
                            {operators?.length || 0}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-[#9999aa] text-sm mb-1">
                          Top Token by TVL
                        </p>
                        {(() => {
                          // Find top token by total_usd_value
                          const topToken = networkStats.tokens?.reduce(
                            (max, token) =>
                              token.total_usd_value >
                              (max?.total_usd_value || 0)
                                ? token
                                : max,
                          );

                          // Find matching token from validTokens for icon
                          const matchingToken = topToken
                            ? validTokens.find(
                                (t) =>
                                  t.symbol.toLowerCase() ===
                                  topToken.symbol.toLowerCase(),
                              )
                            : null;

                          return (
                            <div className="flex items-center">
                              <TokenIcon
                                src={matchingToken?.iconUrl || "/eth-logo.svg"}
                                alt={topToken?.symbol || "ETH"}
                                size={20}
                              />
                              <p className="text-xl font-medium ml-2">
                                {topToken?.symbol || "ETH"}
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </main>

        {/* Wallet Connection Modal - Inside provider context */}
        {walletModalToken && (
          <WalletConnectionModal
            token={walletModalToken}
            isOpen={isWalletModalOpen}
            onClose={() => {
              setIsWalletModalOpen(false);
              setWalletModalToken(null);
              setProviderToken(validTokens[0]); // Reset to default token
            }}
            onSuccess={() => {
              setIsWalletModalOpen(false);
              setWalletModalToken(null);
              setProviderToken(validTokens[0]); // Reset to default token
            }}
            onReopen={() => setIsWalletModalOpen(true)}
          />
        )}
      </WalletConnectorProvider>
    </div>
  );
}

// Component for expanded position view with dynamic delegation data
function ExpandedPositionView({
  position,
  priceValue,
  rewardsByAvs,
  onNavigateToStaking,
}: {
  position: StakingPositionPerToken;
  priceValue: number;
  rewardsByAvs: RewardsPerAVS[];
  onNavigateToStaking: (
    token: Token,
    tab: "stake" | "delegate" | "undelegate" | "withdraw",
  ) => void;
}) {
  const { data: delegationsData, isLoading: delegationsLoading } =
    useDelegations(position.token);

  // Extract operator addresses from delegations for AVS lookup
  const operatorAddresses =
    Array.from(delegationsData?.delegationsByOperator?.values() || []).map(
      (delegation: DelegationPerOperator) => delegation.operatorAddress,
    ) || [];

  // Get AVS data for these operators
  const { data: operatorsWithAVS } =
    useOperatorsWithOptInAVS(operatorAddresses);

  // Get related AVS based on actual operator opt-ins
  const actualRelatedAVS = (() => {
    if (
      !delegationsData?.delegationsByOperator ||
      delegationsData.delegationsByOperator.size === 0 ||
      !operatorsWithAVS
    ) {
      return [];
    }

    // Collect all unique AVS addresses from the operators
    const allAVSAddresses = new Set<string>();
    operatorsWithAVS.forEach((operator) => {
      operator.optInAVS.forEach((avsAddress: string) => {
        allAVSAddresses.add(avsAddress.toLowerCase());
      });
    });

    // Filter rewardsByAvs to only include AVS that the position's operators have opted into
    return rewardsByAvs.filter((avsReward: RewardsPerAVS) =>
      allAVSAddresses.has(avsReward.avs.address.toLowerCase()),
    );
  })();

  const delegatedAmount =
    Number(position.delegated) / Math.pow(10, position.token.decimals);
  const totalAmount =
    Number(position.totalDeposited) / Math.pow(10, position.token.decimals);
  const delegationPercentage =
    totalAmount > 0 ? (delegatedAmount / totalAmount) * 100 : 0;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="px-6 pb-6 border-t border-[#222233] pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Delegation Distribution */}
          <Card className="bg-[#1a1a24] border-[#222233]">
            <CardHeader>
              <CardTitle className="text-sm font-normal">
                Delegation Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {delegationsLoading ? (
                <div className="h-40 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00e5ff]"></div>
                </div>
              ) : delegationsData?.delegationsByOperator &&
                delegationsData.delegationsByOperator.size > 0 ? (
                <>
                  <div className="h-40 flex justify-center">
                    <PieChart
                      data={Array.from(
                        delegationsData.delegationsByOperator.values(),
                      )
                        .map((delegation, idx) => {
                          const value =
                            (Number(delegation.delegated) /
                              Math.pow(10, position.token.decimals)) *
                            priceValue;
                          return {
                            name:
                              delegation.operatorName ||
                              delegation.operatorAddress.slice(0, 8),
                            value: value,
                            color: ["#00e5ff", "#e631dc", "#f7931a"][idx % 3],
                            delegation: delegation,
                          };
                        })
                        .sort((a, b) => b.value - a.value) // Sort by value descending
                        .map((item, idx) => ({
                          ...item,
                          color: ["#00e5ff", "#e631dc", "#f7931a"][idx % 3],
                        }))}
                    />
                  </div>
                  <div className="mt-4 space-y-3">
                    {Array.from(delegationsData.delegationsByOperator.values())
                      .map((delegation, idx) => {
                        const value =
                          (Number(delegation.delegated) /
                            Math.pow(10, position.token.decimals)) *
                          priceValue;
                        return {
                          delegation: delegation,
                          value: value,
                          originalIndex: idx,
                        };
                      })
                      .sort((a, b) => b.value - a.value) // Sort by value descending
                      .map((item, sortedIdx) => (
                        <div
                          key={item.originalIndex}
                          className="flex justify-between items-center"
                        >
                          <div className="flex items-center">
                            <div
                              className="w-3 h-3 rounded-full mr-2"
                              style={{
                                backgroundColor: [
                                  "#00e5ff",
                                  "#e631dc",
                                  "#f7931a",
                                ][sortedIdx % 3],
                              }}
                            ></div>
                            <span className="text-sm">
                              {item.delegation.operatorName ||
                                item.delegation.operatorAddress.slice(0, 8)}
                            </span>
                          </div>
                          <span className="text-sm">
                            {formatCurrency(item.value)}
                          </span>
                        </div>
                      ))}
                  </div>
                </>
              ) : (
                <div className="h-40 flex items-center justify-center text-[#9999aa]">
                  <p className="text-sm">No delegations found</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Related AVS Services */}
          <Card className="bg-[#1a1a24] border-[#222233]">
            <CardHeader>
              <CardTitle className="text-sm font-normal">
                Participating AVS Services
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {actualRelatedAVS.map((avsReward: RewardsPerAVS) => (
                  <div
                    key={avsReward.avs.address}
                    className="flex items-center justify-between p-2 bg-[#13131a] rounded"
                  >
                    <div className="flex items-center">
                      <TokenIcon
                        src={avsReward.avs.iconUrl}
                        alt={avsReward.avs.name}
                        size={24}
                      />
                      <div className="ml-3">
                        <p className="text-sm font-medium">
                          {avsReward.avs.name}
                        </p>
                        <p className="text-xs text-[#9999aa]">
                          {formatPercentage(avsReward.avs.apy)} APY
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#9999aa]">
                        {Array.from(avsReward.tokens.values())
                          .map(
                            (t: { token: Token; amount: bigint }) =>
                              t.token.symbol,
                          )
                          .join(", ")}{" "}
                        rewards
                      </p>
                    </div>
                  </div>
                ))}
                {actualRelatedAVS.length === 0 && (
                  <p className="text-sm text-[#9999aa] text-center py-4">
                    No active AVS services for this position
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Delegation Details */}
          <Card className="bg-[#1a1a24] border-[#222233]">
            <CardHeader>
              <CardTitle className="text-sm font-normal">
                Position Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-[#9999aa] mb-1">Delegation Status</p>
                <div className="flex items-center">
                  <ProgressBar
                    value={delegationPercentage}
                    className="flex-1 mr-3"
                  />
                  <span className="text-sm">
                    {formatPercentage(delegationPercentage)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-[#9999aa] mt-1">
                  <span>
                    Delegated: {delegatedAmount.toFixed(4)}{" "}
                    {position.token.symbol}
                  </span>
                  <span>
                    Deposited: {totalAmount.toFixed(4)} {position.token.symbol}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  className="w-full mb-2 hover:bg-[#00e5ff] hover:text-black transition-colors"
                  onClick={() =>
                    onNavigateToStaking(position.token, "delegate")
                  }
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Delegate More
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="hover:bg-[#00e5ff] hover:text-black transition-colors"
                    onClick={() =>
                      onNavigateToStaking(position.token, "undelegate")
                    }
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Undelegate
                  </Button>
                  <Button
                    variant="outline"
                    className="hover:bg-[#00e5ff] hover:text-black transition-colors"
                    onClick={() =>
                      onNavigateToStaking(position.token, "withdraw")
                    }
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Withdraw
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}

// Component for expanded reward view
function ExpandedRewardView({
  rewardPosition,
}: {
  rewardPosition: RewardsPerTokenWithValues;
}) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="px-6 pb-6 border-t border-[#222233] pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Reward Distribution */}
          <Card className="bg-[#1a1a24] border-[#222233]">
            <CardHeader>
              <CardTitle className="text-sm font-normal">
                Reward Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-40 flex justify-center">
                <PieChart
                  data={rewardPosition.sources.map(
                    (
                      source: { avs: AVS; amount: bigint; value: number },
                      idx: number,
                    ) => ({
                      name: source.avs.name,
                      value: source.value,
                      color: ["#00e5ff", "#e631dc", "#f7931a"][idx % 3],
                    }),
                  )}
                />
              </div>
              <div className="mt-4 space-y-3">
                {rewardPosition.sources.map(
                  (
                    source: { avs: AVS; amount: bigint; value: number },
                    idx: number,
                  ) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center"
                    >
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{
                            backgroundColor: ["#00e5ff", "#e631dc", "#f7931a"][
                              idx % 3
                            ],
                          }}
                        ></div>
                        <span className="text-sm">{source.avs.name}</span>
                      </div>
                      <span className="text-sm">
                        {formatCurrency(source.value)}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </CardContent>
          </Card>

          {/* Reward pie chart */}
          <Card className="bg-[#1a1a24] border-[#222233]">
            <CardHeader>
              <CardTitle className="text-sm font-normal">
                Reward Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-40 flex justify-center">
                <PieChart
                  data={rewardPosition.sources.map(
                    (
                      source: { avs: AVS; amount: bigint; value: number },
                      idx: number,
                    ) => ({
                      name: source.avs.name,
                      value: Number(source.amount),
                      color: ["#00e5ff", "#e631dc", "#f7931a"][idx % 3],
                    }),
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Reward Details */}
          <Card className="bg-[#1a1a24] border-[#222233]">
            <CardHeader>
              <CardTitle className="text-sm font-normal">
                Reward Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-[#9999aa] mb-1">Total Accumulated</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm">
                    {(
                      Number(rewardPosition.totalAmount) /
                      Math.pow(10, rewardPosition.token.decimals)
                    ).toFixed(4)}{" "}
                    {rewardPosition.token.symbol}
                  </span>
                  <span className="text-sm text-green-400">
                    {formatCurrency(rewardPosition.totalValue)}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs text-[#9999aa] mb-1">Average APY</p>
                <p className="text-sm text-[#00e5ff]">
                  {formatPercentage(
                    rewardPosition.sources.reduce(
                      (
                        sum: number,
                        s: { avs: AVS; amount: bigint; value: number },
                      ) => sum + s.avs.apy,
                      0,
                    ) / rewardPosition.sources.length,
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-[#9999aa] mb-1">Reward Sources</p>
                <div className="space-y-2">
                  {rewardPosition.sources.map(
                    (
                      source: { avs: AVS; amount: bigint; value: number },
                      idx: number,
                    ) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-[#13131a] p-2 rounded"
                      >
                        <div className="flex items-center">
                          <TokenIcon
                            src={source.avs.iconUrl}
                            alt={source.avs.name}
                            size={16}
                          />
                          <span className="text-sm ml-2">
                            {source.avs.name}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-green-400">
                            {formatCurrency(source.value)}
                          </p>
                          <p className="text-xs text-[#9999aa]">
                            {formatPercentage(source.avs.apy)} APY
                          </p>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>

              <div className="pt-2">
                <Button variant="outline" className="w-full mb-2">
                  Claim All Rewards
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline">View on Explorer</Button>
                  <Button variant="outline">Export Data</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
