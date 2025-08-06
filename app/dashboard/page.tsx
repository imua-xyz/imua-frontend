// app/dashboard/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  ChevronDown,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { WalletConnectorProvider } from "@/components/providers/WalletConnectorProvider";
import { validTokens } from "@/types/tokens";
import { TokenIcon } from "@/components/ui/token-icon";
import { ProgressBar } from "@/components/ui/progress-bar";
import { PieChart } from "@/components/ui/pie-chart";
import { formatCurrency, formatPercentage } from "@/lib/format";
import { useStakingPositions } from "@/hooks/useStakingPositions";
import { useAllRewards } from "@/hooks/useRewards";
import { useTokenPrices } from "@/hooks/useTokenPrices";
import { useDelegations } from "@/hooks/useDelegations";
import { useOperators, useOperatorsWithOptInAVS } from "@/hooks/useOperators";
import { useSyncAllWalletsToStore } from "@/hooks/useSyncAllWalletsToStore";
import { validRewardTokens, Token } from "@/types/tokens";
import { RewardsWithValues, RewardsByAVS } from "@/types/rewards";
import { StakingPosition } from "@/types/position";
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

const mockNetworkStats = {
  totalTvl: 1250000000,
  activeStakers: 45678,
  averageApy: 7.8,
  totalTokensStaked: {
    ETH: 125000,
    XRP: 850000000,
    USDT: 350000000,
  },
};

export default function DashboardPage() {
  const [expandedPosition, setExpandedPosition] = useState<string | null>(null);
  const [expandedReward, setExpandedReward] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Sync wallet state
  useSyncAllWalletsToStore();

  // Always call hooks, but handle logic conditionally
  const {
    positions,
    isLoading: positionsLoading,
    error: positionsError,
  } = useStakingPositions();
  const {
    rewardsByAvs,
    rewardsByToken,
    isLoading: rewardsLoading,
    error: rewardsError,
  } = useAllRewards();
  const {
    prices,
    isLoading: pricesLoading,
    error: pricesError,
  } = useTokenPrices([...validTokens, ...validRewardTokens]);
  const {
    data: operators,
    isLoading: operatorsLoading,
    error: operatorsError,
  } = useOperators();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate totals from real data with memoization - MUST be called before any conditional returns
  const totalValueDeposited = useMemo(() => {
    return positions.reduce((sum, pos) => {
      if (pos.position) {
        const price =
          prices.find((p) => p.data?.token.symbol === pos.position?.token.symbol)
            ?.data?.data || 0;
        const priceDecimals =
          prices.find((p) => p.data?.token.symbol === pos.position?.token.symbol)
            ?.data?.decimals || 0;
        const priceValue = Number(price) / Math.pow(10, priceDecimals);
        const value =
          (Number(pos.position.data.totalDeposited) /
            Math.pow(10, pos.position.token.decimals)) *
          priceValue;
        return sum + value;
      }
      return sum;
    }, 0);
  }, [positions, prices]);

  const totalRewardsValue = useMemo(() => {
    return rewardsByToken.reduce((sum, reward) => {
      const price =
        prices.find((p) => p.data?.token.symbol === reward.token.symbol)?.data
          ?.data || 0;
      const priceDecimals =
        prices.find((p) => p.data?.token.symbol === reward.token.symbol)?.data
          ?.decimals || 0;
      const priceValue = Number(price) / Math.pow(10, priceDecimals);
      const value =
        (Number(reward.totalAmount) / Math.pow(10, reward.token.decimals)) *
        priceValue;
      return sum + value;
    }, 0);
  }, [rewardsByToken, prices]);

  // Calculate totalValue for each reward token with memoization
  const rewardsWithValues: RewardsWithValues[] = useMemo(() => {
    return rewardsByToken.map((reward) => {
      const price =
        prices.find((p) => p.data?.token.symbol === reward.token.symbol)?.data
          ?.data || 0;
      const priceDecimals =
        prices.find((p) => p.data?.token.symbol === reward.token.symbol)?.data
          ?.decimals || 0;
      const priceValue = Number(price) / Math.pow(10, priceDecimals);
      const totalValue =
        (Number(reward.totalAmount) / Math.pow(10, reward.token.decimals)) *
        priceValue;
      const sourcesWithValues = reward.sources.map((source) => {
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
    positionsLoading || rewardsLoading || pricesLoading || operatorsLoading;
  const hasError =
    positionsError || rewardsError || pricesError || operatorsError;

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <WalletConnectorProvider token={validTokens[0]}>
        <Header token={validTokens[0]} />

        <main className="max-w-6xl mx-auto px-6 py-12">
          {isLoading && (
            <div className="space-y-6">
              {/* Summary Section Skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                <SkeletonCard />
                <SkeletonCard />
              </div>
              
              {/* Positions Section Skeleton */}
              <h2 className="text-xl font-bold text-white mb-6">Your Positions</h2>
              <div className="space-y-6 mb-10">
                {[1, 2, 3].map((i) => (
                  <SkeletonPositionCard key={i} />
                ))}
              </div>
              
              {/* Rewards Section Skeleton */}
              <h2 className="text-xl font-bold text-white mb-6">Your Rewards</h2>
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
              <Button 
                onClick={() => window.location.reload()} 
                className="bg-[#00e5ff] hover:bg-[#00b8cc] text-black"
              >
                Refresh Dashboard
              </Button>
            </div>
          )}

          {!isLoading && !hasError && (
            <>
              {/* Quick Actions */}
              <div className="mb-6">
                <div className="flex flex-wrap gap-3">
                  <Button 
                    className="bg-[#00e5ff] hover:bg-[#00b8cc] text-black"
                    onClick={() => window.location.href = '/staking'}
                  >
                    Start Staking
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-[#00e5ff] text-[#00e5ff] hover:bg-[#00e5ff] hover:text-black"
                  >
                    View All Operators
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-[#00e5ff] text-[#00e5ff] hover:bg-[#00e5ff] hover:text-black"
                  >
                    Claim All Rewards
                  </Button>
                </div>
              </div>

              {/* Summary Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
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
                            data={positions
                              .filter((pos) => pos.position)
                              .map((pos, idx) => {
                                const position = pos.position!;
                                const price =
                                  prices.find(
                                    (p) =>
                                      p.data?.token.symbol ===
                                      position.token.symbol,
                                  )?.data?.data || 0;
                                const priceDecimals =
                                  prices.find(
                                    (p) =>
                                      p.data?.token.symbol ===
                                      position.token.symbol,
                                  )?.data?.decimals || 0;
                                const priceValue =
                                  Number(price) / Math.pow(10, priceDecimals);
                                const value =
                                  (Number(position.data.totalDeposited) /
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
                        {positions
                          .filter((pos) => pos.position)
                          .map((pos, idx) => {
                            const position = pos.position!;
                            const price =
                              prices.find(
                                (p) =>
                                  p.data?.token.symbol ===
                                  position.token.symbol,
                              )?.data?.data || 0;
                            const priceDecimals =
                              prices.find(
                                (p) =>
                                  p.data?.token.symbol ===
                                  position.token.symbol,
                              )?.data?.decimals || 0;
                            const priceValue =
                              Number(price) / Math.pow(10, priceDecimals);
                            const value =
                              (Number(position.data.totalDeposited) /
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
                                ? (reward.totalValue / totalRewardsValue) * 100
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
              </div>

              {/* Positions Section */}
              <h2 className="text-xl font-bold text-white mb-6">
                Your Positions
              </h2>
              <div className="space-y-6 mb-10">
                {positions.filter((pos) => pos.position).length === 0 ? (
                  <Card className="bg-[#13131a] border-[#222233] text-white">
                    <div className="p-8 text-center">
                      <div className="w-20 h-20 bg-[#1a1a24] rounded-full flex items-center justify-center mx-auto mb-4">
                        <TokenIcon src="/eth-logo.svg" alt="ETH" size={32} />
                      </div>
                      <h3 className="text-lg font-medium mb-2">No Staking Positions</h3>
                      <p className="text-sm text-[#9999aa] mb-4">
                        Start staking your assets to earn rewards from AVS services
                      </p>
                      <Button className="bg-[#00e5ff] hover:bg-[#00b8cc] text-black">
                        Start Staking
                      </Button>
                    </div>
                  </Card>
                ) : (
                  positions
                    .filter((pos) => pos.position)
                    .map((pos, index) => {
                    const position = pos.position!;
                    const price =
                      prices.find(
                        (p) => p.data?.token.symbol === position.token.symbol,
                      )?.data?.data || 0;
                    const priceDecimals =
                      prices.find(
                        (p) => p.data?.token.symbol === position.token.symbol,
                      )?.data?.decimals || 0;
                    const priceValue =
                      Number(price) / Math.pow(10, priceDecimals);
                    const totalValue =
                      (Number(position.data.totalDeposited) /
                        Math.pow(10, position.token.decimals)) *
                      priceValue;
                    const delegatedValue =
                      (Number(position.data.delegated) /
                        Math.pow(10, position.token.decimals)) *
                      priceValue;
                    const delegatedAmount =
                      Number(position.data.delegated) /
                      Math.pow(10, position.token.decimals);
                    const totalAmount =
                      Number(position.data.totalDeposited) /
                      Math.pow(10, position.token.decimals);

                    return {
                      position,
                      totalValue,
                      delegatedValue,
                      delegatedAmount,
                      totalAmount,
                      priceValue,
                      index,
                    };
                  })
                  .sort((a, b) => b.totalValue - a.totalValue) // Sort by total value descending
                  .map((item) => (
                    <div key={`${item.position.token.symbol}-${item.index}`}>
                      <Card className="bg-[#13131a] border-[#222233] text-white overflow-hidden">
                        <div
                          className="flex items-center justify-between p-6 cursor-pointer"
                          onClick={() =>
                            toggleExpand(
                              `${item.position.token.symbol}-${item.index}`,
                            )
                          }
                        >
                          <div className="flex items-center flex-1">
                            <TokenIcon
                              src={item.position.token.iconUrl}
                              alt={item.position.token.symbol}
                              size={36}
                            />
                            <div className="ml-4">
                              <h3 className="text-lg font-medium">
                                {item.position.token.symbol}
                              </h3>
                              <p className="text-sm text-[#9999aa]">
                                {item.position.token.name}
                              </p>
                            </div>
                          </div>

                          <div className="hidden md:flex items-center gap-8 flex-1 justify-center">
                            <div className="text-center min-w-[120px]">
                              <p className="text-sm text-[#9999aa]">
                                Total Deposited
                              </p>
                              <p className="text-base font-medium">
                                {formatCurrency(item.totalValue)}
                              </p>
                              <p className="text-xs text-[#9999aa]">
                                {item.totalAmount.toFixed(4)}{" "}
                                {item.position.token.symbol}
                              </p>
                            </div>

                            <div className="text-center min-w-[120px]">
                              <p className="text-sm text-[#9999aa]">
                                Delegated
                              </p>
                              <p className="text-base font-medium">
                                {formatCurrency(item.delegatedValue)}
                              </p>
                              <p className="text-xs text-[#9999aa]">
                                {item.delegatedAmount.toFixed(4)}{" "}
                                {item.position.token.symbol}
                              </p>
                            </div>

                            <div className="text-center min-w-[120px]">
                              <p className="text-sm text-[#9999aa]">
                                Active AVS
                              </p>
                              <p className="text-base font-medium text-[#00e5ff]">
                                {rewardsByAvs.length}
                              </p>
                            </div>
                          </div>

                          <div className="md:hidden flex flex-col items-end flex-1">
                            <p className="font-medium">
                              {formatCurrency(item.totalValue)}
                            </p>
                            <p className="text-xs text-[#9999aa]">
                              {item.delegatedAmount.toFixed(4)}{" "}
                              {item.position.token.symbol} delegated
                            </p>
                          </div>

                          <button className="ml-4 text-[#9999aa] flex-shrink-0">
                            {expandedPosition ===
                            `${item.position.token.symbol}-${item.index}` ? (
                              <ChevronDown size={20} />
                            ) : (
                              <ChevronRight size={20} />
                            )}
                          </button>
                        </div>

                        {/* Expanded View */}
                        {expandedPosition ===
                          `${item.position.token.symbol}-${item.index}` && (
                          <ExpandedPositionView
                            position={item.position}
                            priceValue={item.priceValue}
                            rewardsByAvs={rewardsByAvs}
                          />
                        )}
                      </Card>
                    </div>
                  ))
                )}
              </div>

              {/* Rewards Section */}
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
                              <p className="text-sm text-[#9999aa]">Sources</p>
                              <p className="text-base font-medium text-[#00e5ff]">
                                {rewardPosition.sources.length}
                              </p>
                              <p className="text-xs text-[#9999aa]">
                                AVS services
                              </p>
                            </div>

                            <div className="text-center min-w-[120px]">
                              <p className="text-sm text-[#9999aa]">Avg APY</p>
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
                            {expandedReward === rewardPosition.token.symbol ? (
                              <ChevronDown size={20} />
                            ) : (
                              <ChevronRight size={20} />
                            )}
                          </button>
                        </div>

                        {/* Expanded View */}
                        {expandedReward === rewardPosition.token.symbol && (
                          <ExpandedRewardView rewardPosition={rewardPosition} />
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

              {/* Top Operators Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                <Card className="bg-[#13131a] border-[#222233] text-white">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Top Operators</CardTitle>
                    <Button variant="link" className="text-[#00e5ff]">
                      View All
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {operators?.slice(0, 5).map((operator, idx) => (
                        <div
                          key={operator.address}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-[#1a1a24] rounded-full flex items-center justify-center mr-3">
                              <span className="text-sm font-medium">
                                {idx + 1}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">
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
                          <div className="text-right">
                            <p className="text-[#00e5ff] font-medium">
                              {formatPercentage(Number(operator.apr))}
                            </p>
                            <p className="text-xs text-[#9999aa]">APR</p>
                          </div>
                        </div>
                      ))}
                      {(!operators || operators.length === 0) && (
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
                          {formatCurrency(mockNetworkStats.totalTvl)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[#9999aa] text-sm mb-1">
                          Active Stakers
                        </p>
                        <p className="text-xl font-medium">
                          {mockNetworkStats.activeStakers.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-[#9999aa] text-sm mb-1">
                          Average APY
                        </p>
                        <p className="text-xl font-medium text-[#00e5ff]">
                          {formatPercentage(mockNetworkStats.averageApy)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[#9999aa] text-sm mb-1">
                          Top Token by TVL
                        </p>
                        <div className="flex items-center">
                          <TokenIcon src="/eth-logo.svg" alt="ETH" size={20} />
                          <p className="text-xl font-medium ml-2">ETH</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </main>
      </WalletConnectorProvider>
    </div>
  );
}

// Component for expanded position view with dynamic delegation data
function ExpandedPositionView({
  position,
  priceValue,
  rewardsByAvs,
}: {
  position: StakingPosition;
  priceValue: number;
  rewardsByAvs: RewardsByAVS[];
}) {
  const { data: delegationsData, isLoading: delegationsLoading } =
    useDelegations(position.token);

  // Extract operator addresses from delegations for AVS lookup
  const operatorAddresses =
    delegationsData?.delegations?.map(
      (delegation: DelegationPerOperator) => delegation.operatorAddress,
    ) || [];

  // Get AVS data for these operators
  const { data: operatorsWithAVS } =
    useOperatorsWithOptInAVS(operatorAddresses);

  // Get related AVS based on actual operator opt-ins
  const actualRelatedAVS = (() => {
    if (
      !delegationsData?.delegations ||
      delegationsData.delegations.length === 0 ||
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
    return rewardsByAvs.filter((avsReward: RewardsByAVS) =>
      allAVSAddresses.has(avsReward.avs.address.toLowerCase()),
    );
  })();

  const delegatedAmount =
    Number(position.data.delegated) / Math.pow(10, position.token.decimals);
  const totalAmount =
    Number(position.data.totalDeposited) /
    Math.pow(10, position.token.decimals);
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
              ) : delegationsData?.delegations &&
                delegationsData.delegations.length > 0 ? (
                <>
                  <div className="h-40 flex justify-center">
                    <PieChart
                      data={delegationsData.delegations
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
                    {delegationsData.delegations
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
                {actualRelatedAVS.map((avsReward: RewardsByAVS) => (
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
                        {avsReward.tokens
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
                <Button variant="outline" className="w-full mb-2">
                  Delegate More
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline">Undelegate</Button>
                  <Button variant="outline">Withdraw</Button>
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
  rewardPosition: RewardsWithValues;
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
