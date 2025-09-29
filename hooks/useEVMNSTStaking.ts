import { useCallback, useMemo } from "react";
import { useBalance } from "wagmi";
import { BaseTxOptions, StakerBalance, NSTStakeParams, NSTVerifyParams } from "@/types/staking";
import { StakingService } from "@/types/staking-service";
import { EVMNSTToken } from "@/types/tokens";
import { usePortalContract } from "./usePortalContract";
import { useAccount } from "wagmi";
import { OperationType } from "@/types/staking";
import { handleEVMTxWithStatus } from "@/lib/txUtils";
import { useBootstrapStatus } from "./useBootstrapStatus";
import { useStakerBalances } from "./useStakerBalances";
import { useDelegations } from "./useDelegations";
import { getContract } from "viem";
import ImuaCapsuleContract from "@/out/ImuaCapsule.sol/ImuaCapsule.json";
import EigenLayerBeaconOracle from "@/out/EigenLayerBeaconOracle.sol/EigenLayerBeaconOracle.json";

export function useEVMNSTStaking(token: EVMNSTToken): StakingService {
  const { address: userAddress } = useAccount();
  const { readonlyContract, writeableContract, publicClient, walletClient } =
    usePortalContract(token.network);
  const delegations = useDelegations(token);

  // Helper function to simulate transaction before sending
  const simulateTransaction = useCallback(async (
    contract: { address: `0x${string}`; abi: readonly unknown[] },
    functionName: string,
    args: readonly unknown[],
    options?: Record<string, unknown>
  ) => {
    if (!publicClient || !userAddress) {
      throw new Error("Client or user address not available");
    }
    try {
      // Simulate the contract call
      await publicClient.simulateContract({
        address: contract.address,
        abi: contract.abi,
        functionName: functionName,
        args: args,
        account: userAddress as `0x${string}`,
        ...options,
      });
      return true;
    } catch (error) {
      throw new Error(`Transaction simulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [publicClient, userAddress]);

  // For NST, we use ETH balance instead of token balance
  const balance = useBalance({
    address: userAddress,
  });

  const lzEndpointIdOrCustomChainId = token.network.customChainIdByImua;
  const { bootstrapStatus } = useBootstrapStatus();

  const [stakerBalanceFromHook] = useStakerBalances([token]);

  const stakerBalance = useMemo<StakerBalance | undefined>(() => {
    const s = stakerBalanceFromHook.data;
    if (!s) return undefined;
    return {
      clientChainID: s.clientChainID,
      stakerAddress: s.stakerAddress,
      tokenID: s.tokenID,
      totalBalance: s.balance,
      claimable: s.withdrawable,
      withdrawable: s.withdrawable, // For NST, withdrawable is directly from staker balance
      delegated: s.delegated,
      pendingUndelegated: s.pendingUndelegated,
      totalDeposited: s.totalDeposited,
    };
  }, [stakerBalanceFromHook.data]);

  const walletBalance = {
    customClientChainID: lzEndpointIdOrCustomChainId || 0,
    stakerAddress: userAddress as `0x${string}`,
    tokenID: token.address,
    value: balance?.data?.value || BigInt(0),
    decimals: 18, // ETH has 18 decimals
    symbol: "ETH",
  };

  // Get quote for relaying a message to imua chain, and relaying fee is needed only after bootstrap
  const getQuote = useCallback(
    async (operation: OperationType): Promise<bigint> => {
      if (!readonlyContract) return BigInt(0);

      const lengths = {
        asset: 97,
        delegation: 138,
        undelegation: 139,
        associate: 74,
        dissociate: 33,
      };

      if (bootstrapStatus?.isBootstrapped) {
        const message = "0x" + "00".repeat(lengths[operation]);
        const fee = await readonlyContract.read.quote([message]);
        return fee as bigint;
      } else {
        return BigInt(0);
      }
    },
    [readonlyContract, bootstrapStatus?.isBootstrapped],
  );

  // NST Step 1: Stake ETH to beacon chain
  const handleNSTStake = useCallback(
    async (
      stakeParams: NSTStakeParams,
      amount: bigint | undefined,
      options?: Pick<BaseTxOptions, "onPhaseChange">,
    ) => {
      if (!writeableContract || !amount) throw new Error("Invalid parameters");

      // Simulate the transaction first
      try {
        await simulateTransaction(
          writeableContract,
          "stake",
          [stakeParams.pubkey, stakeParams.signature, stakeParams.depositDataRoot],
          { value: amount }
        );
      } catch (error) {
        return {
          hash: "",
          success: false,
          error: error instanceof Error ? error.message : "Simulation failed",
        };
      }

      // For NST, we call the stake function directly on the contract
      const spawnTx = () =>
        writeableContract.write.stake([
          stakeParams.pubkey,
          stakeParams.signature,
          stakeParams.depositDataRoot
        ], {
          value: amount, // 32 ETH for validator stake
        });

      const getBalanceSnapshot = async () => {
        // Return some state we can verify later
        return { staked: true };
      };

      const verifyCompletion = async () => {
        // For stake step, we just verify the transaction was successful
        return true;
      };

      return handleEVMTxWithStatus({
        spawnTx: spawnTx,
        mode: "local", // NST stake is local transaction
        publicClient: publicClient,
        verifyCompletion: verifyCompletion,
        getStateSnapshot: getBalanceSnapshot,
        onPhaseChange: options?.onPhaseChange,
        onSuccess: (result: { hash: string; success: boolean }) => {
          if (result.success) {
            console.log("NST stake succeeded");
          }
        },
      });
    },
    [writeableContract, publicClient, simulateTransaction]
  );

  // NST Step 2: Verify and deposit native stake
  const handleNSTVerifyAndDeposit = useCallback(
    async (
      verifyParams: NSTVerifyParams,
      options?: Pick<BaseTxOptions, "onPhaseChange">,
    ) => {
      if (!writeableContract) throw new Error("Invalid parameters");
      
      const fee = await getQuote("asset");
      
      // Simulate the transaction first
      try {
        await simulateTransaction(
          writeableContract,
          "verifyAndDepositNativeStake",
          [verifyParams.validatorContainer, verifyParams.proof],
          { value: fee }
        );
      } catch (error) {
        return {
          hash: "",
          success: false,
          error: error instanceof Error ? error.message : "Simulation failed",
        };
      }
      
      const spawnTx = () =>
        writeableContract.write.verifyAndDepositNativeStake([
          verifyParams.validatorContainer,
          verifyParams.proof
        ], {
          value: fee,
        });

      const getBalanceSnapshot = async () => {
        const freshStaker = await stakerBalanceFromHook.refetch();
        return freshStaker.data?.totalDeposited || BigInt(0);
      };

      const verifyCompletion = async (
        totalDepositedBefore: bigint,
        totalDepositedAfter: bigint,
      ) => {
        return totalDepositedAfter > totalDepositedBefore;
      };

      return handleEVMTxWithStatus({
        spawnTx: spawnTx,
        mode: bootstrapStatus?.isBootstrapped ? "simplex" : "local",
        publicClient: publicClient,
        verifyCompletion: verifyCompletion,
        getStateSnapshot: getBalanceSnapshot,
        onPhaseChange: options?.onPhaseChange,
        onSuccess: (result: { hash: string; success: boolean }) => {
          if (result.success) {
            console.log("NST verify and deposit succeeded, updating cached balances...");
            stakerBalanceFromHook.refetch();
          }
        },
      });
    },
    [writeableContract, getQuote, bootstrapStatus?.isBootstrapped, publicClient, stakerBalanceFromHook, simulateTransaction]
  );

  // Delegate NST to operator
  const handleDelegateTo = useCallback(
    async (
      operator: string,
      amount: bigint,
      options?: Pick<BaseTxOptions, "onPhaseChange">,
    ) => {
      if (!writeableContract || !amount || !operator)
        throw new Error("Invalid parameters");
      const fee = await getQuote("delegation");
      
      // Simulate the transaction first
      try {
        await simulateTransaction(
          writeableContract,
          "delegateTo",
          [operator, token.address, amount],
          { value: fee }
        );
      } catch (error) {
        return {
          hash: "",
          success: false,
          error: error instanceof Error ? error.message : "Simulation failed",
        };
      }
      
      const spawnTx = () =>
        writeableContract.write.delegateTo([operator, token.address, amount], {
          value: fee,
        });
      const getBalanceSnapshot = async () => {
        const freshStaker = await stakerBalanceFromHook.refetch();
        return freshStaker.data?.delegated || BigInt(0);
      };
      const verifyCompletion = async (
        delegatedBefore: bigint,
        delegatedAfter: bigint,
      ) => {
        return delegatedAfter === delegatedBefore + amount;
      };

      return handleEVMTxWithStatus({
        spawnTx: spawnTx,
        mode: bootstrapStatus?.isBootstrapped ? "simplex" : "local",
        publicClient: publicClient,
        verifyCompletion: verifyCompletion,
        getStateSnapshot: getBalanceSnapshot,
        onPhaseChange: options?.onPhaseChange,
        onSuccess: (result: { hash: string; success: boolean }) => {
          if (result.success) {
            console.log("Delegate succeeded, updating cached balances...");
            stakerBalanceFromHook.refetch();
            delegations.refetch();
          }
        },
      });
    },
    [writeableContract, token.address, getQuote, bootstrapStatus?.isBootstrapped, publicClient, stakerBalanceFromHook, delegations, simulateTransaction]
  );

  // Undelegate NST from operator
  const handleUndelegateFrom = useCallback(
    async (
      operator: string,
      amount: bigint,
      instantUnbond: boolean,
      options?: Pick<BaseTxOptions, "onPhaseChange">,
    ) => {
      if (!writeableContract || !amount || !operator)
        throw new Error("Invalid parameters");
      if (!bootstrapStatus?.isBootstrapped && !instantUnbond) {
        throw new Error(
          "Only instant undelegation is supported before bootstrap",
        );
      }

      const fee = await getQuote("undelegation");
      
      // Simulate the transaction first
      try {
        await simulateTransaction(
          writeableContract,
          "undelegateFrom",
          [operator, token.address, amount, instantUnbond],
          { value: fee }
        );
      } catch (error) {
        return {
          hash: "",
          success: false,
          error: error instanceof Error ? error.message : "Simulation failed",
        };
      }
      
      const spawnTx = () =>
        writeableContract.write.undelegateFrom(
          [operator, token.address, amount, instantUnbond],
          {
            value: fee,
          },
        );
      const getBalanceSnapshot = async () => {
        const freshStaker = await stakerBalanceFromHook.refetch();
        return instantUnbond
          ? freshStaker.data?.withdrawable || BigInt(0)
          : freshStaker.data?.pendingUndelegated || BigInt(0);
      };

      const verifyCompletion = async (
        balanceBefore: bigint,
        balanceAfter: bigint,
      ) => {
        return instantUnbond
          ? balanceAfter > balanceBefore
          : balanceAfter === balanceBefore + amount;
      };

      return handleEVMTxWithStatus({
        spawnTx: spawnTx,
        mode: bootstrapStatus?.isBootstrapped ? "simplex" : "local",
        publicClient: publicClient,
        verifyCompletion: verifyCompletion,
        getStateSnapshot: getBalanceSnapshot,
        onPhaseChange: options?.onPhaseChange,
        onSuccess: (result: { hash: string; success: boolean }) => {
          if (result.success) {
            console.log("Undelegate succeeded, updating cached balances...");
            stakerBalanceFromHook.refetch();
            delegations.refetch();
          }
        },
      });
    },
    [writeableContract, token.address, getQuote, bootstrapStatus?.isBootstrapped, publicClient, stakerBalanceFromHook, delegations, simulateTransaction]
  );

  // Withdraw NST principal (only after bootstrap)
  const handleWithdrawPrincipal = useCallback(
    async (
      amount: bigint,
      recipient?: `0x${string}`,
      options?: Pick<BaseTxOptions, "onPhaseChange">,
    ) => {
      if (!writeableContract || !amount || !recipient)
        throw new Error("Invalid parameters");

      // Check if bootstrap is complete
      if (!bootstrapStatus?.isBootstrapped) {
        throw new Error("Withdrawal not supported before bootstrap");
      }

      // Simulate the transaction first
      try {
        await simulateTransaction(
          writeableContract,
          "withdrawPrincipal",
          [token.address, amount, recipient]
        );
      } catch (error) {
        return {
          hash: "",
          success: false,
          error: error instanceof Error ? error.message : "Simulation failed",
        };
      }

      const spawnTx = () =>
        writeableContract.write.withdrawPrincipal([
          token.address,
          amount,
          recipient,
        ]);

      const getBalanceSnapshot = async () => {
        const freshStaker = await stakerBalanceFromHook.refetch();
        return freshStaker.data?.totalDeposited || BigInt(0);
      };

      const verifyCompletion = async (
        totalDepositedBefore: bigint,
        totalDepositedAfter: bigint,
      ) => {
        return totalDepositedAfter + amount === totalDepositedBefore;
      };

      return handleEVMTxWithStatus({
        spawnTx: spawnTx,
        mode: "local",
        publicClient: publicClient,
        verifyCompletion: verifyCompletion,
        getStateSnapshot: getBalanceSnapshot,
        onPhaseChange: options?.onPhaseChange,
        onSuccess: (result: { hash: string; success: boolean }) => {
          if (result.success) {
            console.log("Withdraw succeeded, updating cached balances...");
            balance?.refetch();
            stakerBalanceFromHook.refetch();
          }
        },
      });
    },
    [writeableContract, token.address, bootstrapStatus?.isBootstrapped, publicClient, stakerBalanceFromHook, balance, simulateTransaction]
  );

  // For NST, we don't have traditional deposit or depositAndDelegate
  // Instead we have the two-step NST process
  const handleDeposit = useCallback(
    async () => {
      throw new Error("Use nstStake and nstVerifyAndDeposit instead of deposit for NST");
    },
    []
  );

  const handleDepositAndDelegate = useCallback(
    async () => {
      throw new Error("Use nstStake and nstVerifyAndDeposit instead of depositAndDelegate for NST");
    },
    []
  );

  // Check if capsule exists (read-only)
  const checkCapsuleExists = useCallback(
    async (): Promise<string | null> => {
      if (!readonlyContract) return null;

      try {
        const existingCapsule = await readonlyContract.read.ownerToCapsule([userAddress]);
        if (existingCapsule && existingCapsule !== "0x0000000000000000000000000000000000000000") {
          return existingCapsule as string;
        }
        return null;
      } catch (error) {
        console.error("Error checking capsule existence:", error);
        return null;
      }
    },
    [readonlyContract, userAddress]
  );

  // Capsule creation function
  const handleCreateCapsule = useCallback(
    async (): Promise<{ address: string; txHash: string; success: boolean; error?: string }> => {
      if (!writeableContract || !readonlyContract) {
        return {
          address: "",
          txHash: "",
          success: false,
          error: "Contract not available"
        };
      }
      if (!userAddress) {
        return {
          address: "",
          txHash: "",
          success: false,
          error: "User address not available"
        };
      }
      // Check if VIRTUAL_NST_ADDRESS is whitelisted (required for native restaking)
      const VIRTUAL_NST_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
      const isWhitelisted = await readonlyContract.read.isWhitelistedToken([VIRTUAL_NST_ADDRESS]);
      if (!isWhitelisted) {
        return {
          address: "",
          txHash: "",
          success: false,
          error: "Native restaking is not enabled - VIRTUAL_NST_ADDRESS is not whitelisted"
        };
      }
      // Check if the contract is paused
      try {
        const isPaused = await readonlyContract.read.paused([]);
        if (isPaused) {
          return {
            address: "",
            txHash: "",
            success: false,
            error: "Contract is paused"
          };
        }
      } catch (pauseError) {
        console.error("Error checking pause status:", pauseError);
        return {
          address: "",
          txHash: "",
          success: false,
          error: "Error checking pause status"
        };
      }
      try {
        // Simulate the transaction first
        try {
          await simulateTransaction(
            writeableContract,
            "createImuaCapsule",
            []
          );
        } catch (simError) {
          return {
            address: "",
            txHash: "",
            success: false,
            error: simError instanceof Error ? simError.message : "Simulation failed",
          };
        }

        const result = await handleEVMTxWithStatus({
          spawnTx: () => writeableContract.write.createImuaCapsule([], {
            account: userAddress as `0x${string}`,
            // No gas parameters - let wagmi handle everything
          }),
          mode: "local",
          publicClient: publicClient,
          verifyCompletion: async () => true,
          getStateSnapshot: async () => ({}),
        });
        if (!result.success) {
          return {
            address: "",
            txHash: "",
            success: false,
            error: `Transaction failed: ${result.error}`
          };
        }
        const capsuleAddress = await readonlyContract.read.ownerToCapsule([userAddress]);
        if (capsuleAddress !== "0x0000000000000000000000000000000000000000") {
          return {
            address: capsuleAddress as string,
            txHash: result.hash,
            success: true
          };
        }
        return {
          address: "",
          txHash: result.hash,
          success: false,
          error: "Capsule creation succeeded but no capsule address found"
        };
      } catch (directError) {
        const errorMessage = directError instanceof Error ? directError.message : String(directError);
        if (errorMessage.includes("CapsuleAlreadyCreated") || errorMessage.includes("capsule already exists")) {
          const existingCapsule = await readonlyContract.read.ownerToCapsule([userAddress]);
          if (existingCapsule && existingCapsule !== "0x0000000000000000000000000000000000000000") {
            return {
              address: existingCapsule as string,
              txHash: "", // No transaction needed
              success: true
            };
          } else {
            return {
              address: "",
              txHash: "",
              success: false,
              error: "Capsule already exists but no capsule address found"
            }
          }
        }
        // Handle RPC errors specifically
        if (errorMessage.includes("Internal JSON-RPC error") || errorMessage.includes("-32603")) {
          return {
            address: "",
            txHash: "",
            success: false,
            error: "Transaction failed due to RPC error. This might be due to insufficient gas or network issues. Please try again or increase gas limit."
          }
        }
        return {
          address: "",
          txHash: "",
          success: false,
          error: `Transaction failed: ${directError}`
        };
      }
    },
    [writeableContract, readonlyContract, userAddress, publicClient, simulateTransaction]
  );

  const handleClaimPrincipal = useCallback(
    async () => {
      throw new Error("Claim principal not supported for NST");
    },
    []
  );

  const handleStake = useCallback(
    async () => {
      throw new Error("Use nstStake and nstVerifyAndDeposit for NST staking");
    },
    []
  );

  const handleIsPectraMode = useCallback(
    async (capsuleAddress: string): Promise<boolean> => {
      if (!readonlyContract || !publicClient) throw new Error("Contract not available");
      // first, get the capsule contract
      const capsuleContract = getContract({
        address: capsuleAddress as `0x${string}`,
        abi: ImuaCapsuleContract.abi,
        client: publicClient,
      });
      if (!capsuleContract) throw new Error("Capsule contract not available");
      return (await capsuleContract.read.isPectraMode([]) as boolean);
    },
    [readonlyContract, publicClient]
  );

  // Add timestamp to beacon oracle
  const handleAddBlockRootForTimestamp = useCallback(
    async (
      timestamp: string,
      options?: Pick<BaseTxOptions, "onPhaseChange">,
    ) => {
      if (!writeableContract || !publicClient || !walletClient) {
        throw new Error("Contract not available");
      }
      // Get beacon oracle address
      const beaconOracleAddress = await writeableContract.read.BEACON_ORACLE_ADDRESS([]);
      const beaconOracleContract = getContract({
        address: beaconOracleAddress as `0x${string}`,
        abi: EigenLayerBeaconOracle.abi,
        client: {
          public: publicClient,
          wallet: walletClient,
        },
      });
      
      // Simulate the transaction first
      try {
        await simulateTransaction(
          beaconOracleContract,
          "addTimestamp",
          [BigInt(timestamp)]
        );
      } catch (error) {
        return {
          hash: "",
          success: false,
          error: error instanceof Error ? error.message : "Simulation failed",
        };
      }
      
      const result = await handleEVMTxWithStatus({
        spawnTx: () => beaconOracleContract.write.addTimestamp([BigInt(timestamp)], {
          account: userAddress as `0x${string}`,
        }),
        mode: "local",
        publicClient: publicClient,
        verifyCompletion: async () => true,
        getStateSnapshot: async () => ({}),
        onPhaseChange: options?.onPhaseChange,
        onSuccess: (result: { hash: string; success: boolean }) => {
          if (result.success) {
            console.log("Add block root for timestamp succeeded");
          }
        },
      });
      return {
        hash: result.hash,
        success: result.success,
        error: result.error,
      };
    },
    [writeableContract, publicClient, walletClient, userAddress, simulateTransaction]
  );

  const handleHasBlockRootForTimestamp = useCallback(
    async (timestamp: string): Promise<boolean> => {
      if (!publicClient || !writeableContract) {
        throw new Error("Contract not available");
      }
      const beaconOracleAddress = await writeableContract.read.BEACON_ORACLE_ADDRESS([]);
      const beaconOracleContract = getContract({
        address: beaconOracleAddress as `0x${string}`,
        abi: EigenLayerBeaconOracle.abi,
        client: publicClient,
      });
      return (await beaconOracleContract.read.timestampToBlockRoot([BigInt(timestamp)]) as `0x${string}`) !== "0x0000000000000000000000000000000000000000000000000000000000000000";
    },
    [writeableContract, publicClient]
  );

  return {
    token: token,
    stakerBalance: stakerBalance,
    walletBalance: walletBalance,
    vaultAddress: undefined,
    // NST-specific functions
    nstStake: handleNSTStake,
    nstVerifyAndDeposit: handleNSTVerifyAndDeposit,
    createCapsule: handleCreateCapsule,
    checkCapsuleExists: checkCapsuleExists,
    isPectraMode: handleIsPectraMode,
    addBlockRootForTimestamp: handleAddBlockRootForTimestamp,
    hasBlockRootForTimestamp: handleHasBlockRootForTimestamp,
    // Standard functions (some throw errors for NST)
    deposit: handleDeposit,
    depositAndDelegate: handleDepositAndDelegate,
    delegateTo: handleDelegateTo,
    undelegateFrom: handleUndelegateFrom,
    claimPrincipal: handleClaimPrincipal,
    withdrawPrincipal: handleWithdrawPrincipal,
    stake: handleStake,
    getQuote: getQuote,
  };
}