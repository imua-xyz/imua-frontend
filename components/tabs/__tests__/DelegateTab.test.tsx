import * as React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DelegateTab } from "@/components/tabs/DelegateTab";
import { StakingServiceContext } from "@/contexts/StakingServiceContext";
import { OperatorsContext, OperatorsContextType } from "@/contexts/OperatorsContext";
import { StakingService } from "@/types/staking-service";
import { EVMLSTToken, validTokens } from "@/types/tokens";
import { OperatorInfo } from "@/types/operator";

const fakeToken = validTokens.find(
  (t): t is EVMLSTToken => t.type === "lst",
)!;

const baseStakingService: StakingService = {
  token: fakeToken,
  tokenBalance: {
    token: { customClientChainID: fakeToken.network.customChainIdByImua, tokenID: fakeToken.address },
    stakerAddress: "0xUser",
    balance: {
      value: BigInt(0),
      decimals: fakeToken.decimals,
      symbol: fakeToken.symbol,
    },
  },
  stakerBalance: {
    clientChainID: fakeToken.network.customChainIdByImua,
    stakerAddress: "0xUser",
    tokenID: fakeToken.address,
    totalBalance: BigInt(0),
    withdrawable: BigInt(0),
    delegated: BigInt(0),
    pendingUndelegated: BigInt(0),
    totalDeposited: BigInt(0),
    claimable: BigInt(500000000000000000n),
  } as any,
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

const operator: OperatorInfo = {
  address: "im1operator",
  commission: {
    commission_rates: {
      rate: "0.1",
      max_rate: "1",
      max_change_rate: "0.1",
    },
    update_time: "2024-01-01T00:00:00Z",
  },
  earnings_addr: "earn",
  approve_addr: "approve",
  operator_meta_info: "Test Operator",
  client_chain_earnings_addr: {
    earning_info_list: [],
  },
  apr: 10,
};

const baseOperatorsContext: OperatorsContextType = {
  operators: [operator],
  isLoading: false,
  error: null,
};

const operatorModalPropsMock = vi.fn();

vi.mock("@/hooks/useBootstrapStatus", () => ({
  useBootstrapStatus: () => ({
    bootstrapStatus: { isBootstrapped: false },
  }),
}));

vi.mock("@/components/modals/OperatorSelectionModal", () => ({
  OperatorSelectionModal: (props: any) => {
    operatorModalPropsMock(props);
    return null;
  },
}));

function renderWithProviders(
  stakingService: StakingService = baseStakingService,
  operatorsContext: OperatorsContextType = baseOperatorsContext,
) {
  return render(
    <StakingServiceContext.Provider value={stakingService}>
      <OperatorsContext.Provider value={operatorsContext}>
        <DelegateTab sourceChain="evm" destinationChain="imua" />
      </OperatorsContext.Provider>
    </StakingServiceContext.Provider>,
  );
}

describe("DelegateTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (globalThis as any).React = React;
  });

  it("shows available for delegation from stakerBalance.claimable", () => {
    renderWithProviders();
    screen.getByText(/Available for delegation/i);
    screen.getByText(/imETH/i);
  });

  it("disables Continue when amount is empty", () => {
    renderWithProviders();

    const continueButton = screen.getAllByRole("button", {
      name: /continue/i,
    })[0];
    // Initially disabled due to empty amount
    expect((continueButton as HTMLButtonElement).disabled).toBe(true);

    // Interaction tests for opening the operator modal are skipped here
    // because multiple layered dialogs make role-based selection fragile.
  });
});

