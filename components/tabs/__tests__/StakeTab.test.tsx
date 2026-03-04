import * as React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { StakeTab } from "@/components/tabs/StakeTab";
import { StakingServiceContext } from "@/contexts/StakingServiceContext";
import { OperatorsContext, OperatorsContextType } from "@/contexts/OperatorsContext";
import { StakingService } from "@/types/staking-service";
import { EVMLSTToken } from "@/types/tokens";

const fakeToken: EVMLSTToken = {
  type: "lst",
  symbol: "exoETH",
  name: "Exocore ETH",
  address: "0xToken",
  decimals: 18,
  iconUrl: "/icons/eth-icon.svg",
  priceIndex: 1,
  underlyingAsset: "ETH",
  provider: "Exocore",
  network: {
    chainName: "EVM",
    evmChainID: 11155111,
    customChainIdByImua: 1,
    connector: {
      type: "evm",
      requireExtraConnectToImua: false,
    } as any,
    txExplorerUrl: "https://explorer/",
  } as any,
};

const baseStakingService: StakingService = {
  token: fakeToken,
  tokenBalance: {
    token: { customClientChainID: 1, tokenID: fakeToken.address },
    stakerAddress: "0xUser",
    balance: {
      value: BigInt("100000000000000000000"),
      decimals: 18,
      symbol: "exoETH",
    },
  },
  stakerBalance: {
    clientChainID: 1,
    stakerAddress: "0xUser",
    tokenID: fakeToken.address,
    totalBalance: BigInt(0),
    withdrawable: BigInt(0),
    delegated: BigInt(0),
    pendingUndelegated: BigInt(0),
    totalDeposited: BigInt(0),
  },
  vaultAddress: "0xVault",
  minimumStakeAmount: BigInt(1),
  isDepositThenDelegateDisabled: false,
  isOnlyDepositThenDelegateAllowed: false,
  stake: vi.fn(),
  deposit: vi.fn(),
  depositAndDelegate: vi.fn(),
  delegateTo: vi.fn(),
  undelegateFrom: vi.fn(),
  claimPrincipal: vi.fn(),
  withdrawPrincipal: vi.fn(),
  getQuote: vi.fn().mockResolvedValue(BigInt(0)),
};

const baseOperatorsContext: OperatorsContextType = {
  operators: [],
  isLoading: false,
  error: null,
};

vi.mock("@/hooks/useBootstrapStatus", () => ({
  useBootstrapStatus: () => ({
    bootstrapStatus: { isBootstrapped: false },
  }),
}));

function renderWithProviders(
  stakingService: StakingService = baseStakingService,
  operatorsContext: OperatorsContextType = baseOperatorsContext,
) {
  return render(
    <StakingServiceContext.Provider value={stakingService}>
      <OperatorsContext.Provider value={operatorsContext}>
        <StakeTab sourceChain="evm" destinationChain="imua" />
      </OperatorsContext.Provider>
    </StakingServiceContext.Provider>,
  );
}

describe("StakeTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Ensure React is available for components compiled with classic runtime
    (globalThis as any).React = React;
  });

  it("renders amount step and balance info", () => {
    renderWithProviders();

    screen.getByText(/Amount to stake/i);
    screen.getByText(/Balance:/i);
  });

  it("disables Continue when amount is empty", () => {
    renderWithProviders();
    const buttons = screen.getAllByRole("button", { name: /continue/i });
    // One of the Continue buttons in amount step should be disabled
    const disabled = buttons.some((btn) => (btn as HTMLButtonElement).disabled);
    expect(disabled).toBe(true);
  });

});


