import { formatUnits } from "viem";
import { StakingProvider } from "@/types/staking";

interface TokenInfoProps {
  stakingProvider: StakingProvider;
  token: `0x${string}`;
  relayFee: bigint;
}

interface InfoRowProps {
  label: string;
  value: string;
  isLink?: boolean;
  fullAddress?: string;
  tooltip?: string;
}

function InfoRow({ label, value, isLink, fullAddress, tooltip }: InfoRowProps) {
  return (
    <div className="flex justify-between items-center group relative">
      <span className="text-gray-600">{label}:</span>
      {isLink ? (
        <a
          href={`https://sepolia.etherscan.io/token/${fullAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-700 underline"
        >
          {value}
        </a>
      ) : (
        <span>{value}</span>
      )}
      {tooltip && (
        <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-sm rounded">
          {tooltip}
        </div>
      )}
    </div>
  );
}

export function TokenInfo({
  stakingProvider,
  token,
  relayFee,
}: TokenInfoProps) {
  if (!token || !stakingProvider) {
    return null;
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h2 className="text-xl font-semibold mb-4">Token Information</h2>
      <div className="space-y-2">
        <InfoRow label="Token Address" value={token} fullAddress={token} />
        <InfoRow
          label="Vault Address"
          value={stakingProvider.vaultAddress as `0x${string}`}
          fullAddress={stakingProvider.vaultAddress as `0x${string}`}
          tooltip="Token vault contract that holds your deposits"
        />
        {stakingProvider.walletBalance && (
          <>
            <InfoRow
              label="Symbol"
              value={stakingProvider.walletBalance.symbol}
            />
            <InfoRow
              label="Decimals"
              value={String(stakingProvider.walletBalance.decimals)}
            />
            <InfoRow
              label="Balance"
              value={`${formatUnits(stakingProvider.walletBalance.value, stakingProvider.walletBalance.decimals)} ${stakingProvider.walletBalance.symbol}`}
            />
            <InfoRow
              label="Withdrawable"
              value={`${formatUnits(stakingProvider.stakerBalance?.withdrawable || BigInt(0), stakingProvider.walletBalance.decimals)} ${stakingProvider.walletBalance.symbol}`}
            />
          </>
        )}
        {relayFee > 0 && (
          <InfoRow
            label="Relay Fee"
            value={`${formatUnits(relayFee, 18)} ETH`}
            tooltip="LayerZero relay fee for cross-chain message"
          />
        )}
      </div>
    </div>
  );
}
