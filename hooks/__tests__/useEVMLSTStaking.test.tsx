import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEVMLSTStaking } from "@/hooks/useEVMLSTStaking";
import { EVMLSTToken } from "@/types/tokens";
import { storePendingTransaction } from "@/lib/optimistic-helpers";

// Minimal fake token
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

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: "0xUser", isConnected: true }),
}));

const mockWriteableContract = {
  write: {
    deposit: vi.fn(),
    delegateTo: vi.fn(),
    undelegateFrom: vi.fn(),
    depositThenDelegateTo: vi.fn(),
    claimPrincipalFromImuachain: vi.fn(),
    withdrawPrincipal: vi.fn(),
  },
};

const mockReadonlyContract = {
  read: {
    quote: vi.fn().mockResolvedValue(BigInt(0)),
  },
};

vi.mock("@/hooks/usePortalContract", () => ({
  usePortalContract: () => ({
    readonlyContract: mockReadonlyContract,
    writeableContract: mockWriteableContract,
    publicClient: {},
  }),
}));

const mockVault = {
  read: {
    getWithdrawableBalance: vi.fn().mockResolvedValue(BigInt(0)),
  },
};

vi.mock("@/hooks/useVault", () => ({
  useEVMVault: () => ({
    vault: mockVault,
    vaultAddress: "0xVault",
  }),
}));

const mockErc20 = {
  read: {
    allowance: vi.fn().mockResolvedValue(BigInt(0)),
  },
  write: {
    approve: vi.fn().mockResolvedValue("0xApproveTx"),
  },
};

vi.mock("@/hooks/useERC20Token", () => ({
  useERC20Token: () => ({ contract: mockErc20 }),
}));

vi.mock("@/hooks/useDelegations", () => ({
  useDelegations: () => ({ refetch: vi.fn() }),
}));

vi.mock("@/hooks/useTokenBalance", () => ({
  useTokenBalance: () => ({
    data: { value: BigInt(1000), decimals: 18, symbol: "exoETH" },
    refetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/useBootstrapStatus", () => ({
  useBootstrapStatus: () => ({
    bootstrapStatus: { isBootstrapped: false },
  }),
}));

vi.mock("@/hooks/useStakerBalances", () => ({
  useStakerBalances: () => [
    {
      data: {
        balance: BigInt(0),
        withdrawable: BigInt(0),
        delegated: BigInt(0),
        pendingUndelegated: BigInt(0),
        totalDeposited: BigInt(0),
      },
      refetch: vi.fn(),
    },
  ],
}));

vi.mock("@/lib/txUtils", () => ({
  handleEVMTxWithStatus: vi.fn(
    async ({ approvingTx, spawnTx, onSuccess }) => {
      if (approvingTx) {
        await approvingTx();
      }
      const tx = await spawnTx();
      // simulate success with fake hash and block height
      onSuccess({
        hash: (tx as any)?.hash ?? "0xTxHash",
        success: true,
        blockHeight: 123,
      });
      return { hash: "0xTxHash", success: true };
    },
  ),
}));

vi.mock("@/lib/optimistic-helpers", () => ({
  storePendingTransaction: vi.fn(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useEVMLSTStaking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes basic token and balance shape", () => {
    const { result } = renderHook(() => useEVMLSTStaking(fakeToken), {
      wrapper: createWrapper(),
    });
    expect(result.current.token.symbol).toBe("exoETH");
    expect(result.current.tokenBalance.balance.value).toBe(BigInt(1000));
  });

  it("runs deposit and stores optimistic transaction", async () => {
    const { result } = renderHook(() => useEVMLSTStaking(fakeToken), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      const current = result.current!;
      await (current.deposit as (amount: bigint) => Promise<unknown>)(BigInt(10));
    });

    expect(mockWriteableContract.write!.deposit).toHaveBeenCalledWith(
      [fakeToken.address, BigInt(10)],
      expect.objectContaining({ value: expect.anything() }),
    );
    expect(storePendingTransaction).toHaveBeenCalledWith(
      "0xTxHash",
      "deposit",
      fakeToken,
      "0xUser",
      123,
      BigInt(10),
    );
  });

  it("runs depositAndDelegate and stores stake optimistic transaction", async () => {
    const { result } = renderHook(() => useEVMLSTStaking(fakeToken), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      const current = result.current!;
      await (current.depositAndDelegate as (amount: bigint, operator: string) => Promise<unknown>)(BigInt(20), "imOperator");
    });

    expect(mockWriteableContract.write!.depositThenDelegateTo).toHaveBeenCalled();
    expect(storePendingTransaction).toHaveBeenCalledWith(
      "0xTxHash",
      "stake",
      fakeToken,
      "0xUser",
      123,
      BigInt(20),
      "imOperator",
    );
  });

  it("runs delegateTo and stores delegate optimistic transaction", async () => {
    const { result } = renderHook(() => useEVMLSTStaking(fakeToken), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current!.delegateTo("imOperator", BigInt(5));
    });

    expect(mockWriteableContract.write!.delegateTo).toHaveBeenCalled();
    expect(storePendingTransaction).toHaveBeenCalledWith(
      "0xTxHash",
      "delegate",
      fakeToken,
      "0xUser",
      123,
      BigInt(5),
      "imOperator",
    );
  });

  it("runs undelegateFrom and stores undelegate optimistic transaction", async () => {
    const { result } = renderHook(() => useEVMLSTStaking(fakeToken), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current!.undelegateFrom("imOperator", BigInt(7), true);
    });

    expect(mockWriteableContract.write!.undelegateFrom).toHaveBeenCalled();
    expect(storePendingTransaction).toHaveBeenCalledWith(
      "0xTxHash",
      "undelegate",
      fakeToken,
      "0xUser",
      123,
      BigInt(7),
      "imOperator",
    );
  });

  it("runs claimPrincipal and stores claim optimistic transaction", async () => {
    const { result } = renderHook(() => useEVMLSTStaking(fakeToken), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      const current = result.current!;
      await (current.claimPrincipal as (amount: bigint) => Promise<unknown>)(BigInt(30));
    });

    expect(mockWriteableContract.write!.claimPrincipalFromImuachain).toHaveBeenCalled();
    expect(storePendingTransaction).toHaveBeenCalledWith(
      "0xTxHash",
      "claim",
      fakeToken,
      "0xUser",
      123,
      BigInt(30),
    );
  });

  it("runs stake with approval when allowance is insufficient", async () => {
    const { result } = renderHook(() => useEVMLSTStaking(fakeToken), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.stake(BigInt(50));
    });

    expect(mockErc20.read.allowance).toHaveBeenCalled();
    expect(mockErc20.write.approve).toHaveBeenCalled();
    expect(mockWriteableContract.write.deposit).toHaveBeenCalled();
  });
});

