// components/tabs/StakeNSTTab.tsx
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAmountInput } from "@/hooks/useAmountInput";
import { formatUnits } from "viem";
import { isValidPublicKey, isValidSignature, isValidDepositDataRoot } from "@/utils/nstEthValidation";
import {
  OperationProgress,
  OperationStep,
} from "@/components/ui/operation-progress";
import { useStakingServiceContext } from "@/contexts/StakingServiceContext";
import { NSTStakeParams } from "@/types/staking";
import { getShortErrorMessage } from "@/lib/utils";
import { Info, ExternalLink } from "lucide-react";

// Custom step definitions with better UX text
const waitingForApprovalStep: OperationStep = {
  phase: "sendingTx",
  title: "Waiting for Approval",
  description: "Please approve the transaction in your wallet",
  status: "pending",
};

const waitingForConfirmationStep: OperationStep = {
  phase: "confirmingTx",
  title: "Waiting for Confirmation",
  description: "Transaction is being processed on the blockchain",
  status: "pending",
};

const successStep: OperationStep = {
  phase: "verifyingCompletion",
  title: "Success!",
  description: "Operation completed successfully",
  status: "pending",
};

interface StakeNSTTabProps {
  sourceChain: string;
  destinationChain: string;
  onSuccess?: () => void;
}

export function StakeNSTTab({ sourceChain, destinationChain, onSuccess }: StakeNSTTabProps) {
  // these are same and the steps don't make a difference whether we are bootstrapped or not.
  // so we pass these values, but ensure that they are the same.
  if (sourceChain !== destinationChain) {
    throw new Error("Source and destination chains must be the same for NST staking");
  }
  const stakingService = useStakingServiceContext();
  if (!('validatorExplorerUrl' in stakingService.token.network && stakingService.token.network.validatorExplorerUrl)) {
    throw new Error("Validator explorer URL is not set for NST staking");
  }
  const [currentStep, setCurrentStep] = useState<"capsule" | "stake">("capsule");
  const [capsuleAddress, setCapsuleAddress] = useState<string | null>(null);
  const [isCreatingCapsule, setIsCreatingCapsule] = useState(false);
  const [isPectraMode, setIsPectraMode] = useState<boolean | null>(null);
  const [isStaking, setIsStaking] = useState(false);
  const [currentOperationStep, setCurrentOperationStep] = useState<OperationStep | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Stake form data
  const [stakeData, setStakeData] = useState<{
    pubkey: string;
    signature: string;
    depositDataRoot: string;
  }>({
    pubkey: "",
    signature: "",
    depositDataRoot: "",
  });

  // Get wallet balance first
  const walletBalance = stakingService.walletBalance;

  // Amount input for staking (32-2048 ETH)
  const { amount, setAmount, parsedAmount, error: amountError } = useAmountInput({
    decimals: walletBalance?.decimals || 0,
    maxAmount: walletBalance?.value || BigInt(0),
  });

  // Add validation logic - match Bootstrap contract exactly
  const AFTER_PECTRA_MIN_ACTIVATION_BALANCE_ETH_PER_VALIDATOR = BigInt('32000000000000000000'); // 32 ETH
  const AFTER_PECTRA_MAX_EFFECTIVE_BALANCE_ETH_PER_VALIDATOR = BigInt('2048000000000000000000'); // 2048 ETH
  const GWEI_UNIT = BigInt('1000000000'); // 1 gwei in wei
  
  // Check if amount is a multiple of 1 gwei (required by Bootstrap contract)
  const isMultipleOfGwei = parsedAmount === BigInt(0) || parsedAmount % GWEI_UNIT === BigInt(0);
  
  // Bootstrap contract validation logic:
  // - If capsule is NOT in Pectra mode: deposit must be exactly 32 ETH
  // - If capsule IS in Pectra mode: deposit must be between 32 and 2048 ETH (inclusive)
  // - In both cases: must be a multiple of 1 gwei
  let isValidAmount = false;
  if (isMultipleOfGwei && parsedAmount > BigInt(0)) {
    if (isPectraMode) {
      isValidAmount = parsedAmount >= AFTER_PECTRA_MIN_ACTIVATION_BALANCE_ETH_PER_VALIDATOR && 
                     parsedAmount <= AFTER_PECTRA_MAX_EFFECTIVE_BALANCE_ETH_PER_VALIDATOR;
    } else {
      isValidAmount = parsedAmount === AFTER_PECTRA_MIN_ACTIVATION_BALANCE_ETH_PER_VALIDATOR;
    }
  }

  const checkCapsuleExists = useCallback(async () => {
    if (!stakingService.checkCapsuleExists || !stakingService.isPectraMode) return;
    try {
      const existingCapsule = await stakingService.checkCapsuleExists();
      if (existingCapsule) {
        setCapsuleAddress(existingCapsule);
        setIsPectraMode(await stakingService.isPectraMode(existingCapsule));
        // Only change step if we're not in the middle of an operation
        if (!currentOperationStep) {
          setCurrentStep("stake");
        }
      } else {
        setCapsuleAddress(null);
        setIsPectraMode(null);
        // Only change step if we're not in the middle of an operation
        if (!currentOperationStep) {
          setCurrentStep("capsule");
        }
      }
    } catch (err) {
      setCapsuleAddress(null);
      setIsPectraMode(null);
      // Only change step if we're not in the middle of an operation
      if (!currentOperationStep) {
        setCurrentStep("capsule");
      }
      console.log(err);
    }
  }, [stakingService, currentOperationStep]);

  // Check if capsule exists on mount
  useEffect(() => {
    checkCapsuleExists();
  }, [checkCapsuleExists]);

  const handleCreateCapsule = async () => {
    if (!stakingService.createCapsule || !stakingService.isPectraMode) {
      setError("Capsule creation not available");
      return;
    }

    try {
      setIsCreatingCapsule(true);
      setError(null);
      setCurrentOperationStep(waitingForApprovalStep);

      const result = await stakingService.createCapsule({
        onPhaseChange: (phase) => {
          switch (phase) {
            case "sendingTx":
              setCurrentOperationStep(waitingForApprovalStep);
              break;
            case "confirmingTx":
              setCurrentOperationStep(waitingForConfirmationStep);
              break;
            case "verifyingCompletion":
              setCurrentOperationStep(successStep);
              break;
          }
        },
      });

      // Extract the capsule address and transaction hash from the result object
      const success = result?.success || false;
      const error = result?.error || undefined;

      // Set transaction hash if available
      if (success) {
        const capsuleAddress = result?.address || null;
        if (capsuleAddress) {
          setCapsuleAddress(capsuleAddress);
          setIsPectraMode(await stakingService.isPectraMode(capsuleAddress));
        }
        const capsuleTxHash = result?.txHash || undefined;
        // Update the current step to show success with transaction details
        setCurrentOperationStep({
          ...successStep,
          status: "success",
          ...(capsuleTxHash && {
            txHash: capsuleTxHash,
            explorerUrl: stakingService.token.network.txExplorerUrl,
          }),
        });
      } else {
        // Show error in progress dialog instead of closing it
        setCurrentOperationStep({
          ...waitingForApprovalStep,
          status: "error",
          errorMessage: error || "Capsule creation failed"
        });
        setError(error || "Capsule creation failed");
      }
      // Don't change step yet - let user close dialog first
    } catch (err) {
      const errorMessage = getShortErrorMessage(err);
      console.log("handleCreateCapsule error:", err);
      setError(errorMessage);
      setCurrentOperationStep(null);
    } finally {
      setIsCreatingCapsule(false);
    }
  };

  const handleStake = async () => {
    if (!stakingService.nstStake || !parsedAmount) {
      setError("NST staking not available");
      return;
    }

    if (parsedAmount <= BigInt(0)) {
      setError("Please enter a valid amount");
      return;
    }

    if (!isMultipleOfGwei) {
      setError("Amount must be a multiple of 1 gwei (0.000000001 ETH)");
      return;
    }

    if (isPectraMode) {
      if (parsedAmount < AFTER_PECTRA_MIN_ACTIVATION_BALANCE_ETH_PER_VALIDATOR || 
          parsedAmount > AFTER_PECTRA_MAX_EFFECTIVE_BALANCE_ETH_PER_VALIDATOR) {
        setError("Pectra mode requires between 32 and 2048 ETH for validator staking");
        return;
      }
    } else {
      if (parsedAmount !== AFTER_PECTRA_MIN_ACTIVATION_BALANCE_ETH_PER_VALIDATOR) {
        setError("Non-Pectra mode requires exactly 32 ETH for validator staking");
        return;
      }
    }

    try {
      setIsStaking(true);
      setError(null);
      setCurrentOperationStep(waitingForApprovalStep);

      const stakeParams: NSTStakeParams = {
        pubkey: stakeData.pubkey as `0x${string}`,
        signature: stakeData.signature as `0x${string}`,
        depositDataRoot: stakeData.depositDataRoot as `0x${string}`,
      };

      const result = await stakingService.nstStake(stakeParams, parsedAmount, {
        onPhaseChange: (phase) => {
          switch (phase) {
            case "sendingTx":
              setCurrentOperationStep(waitingForApprovalStep);
              break;
            case "confirmingTx":
              setCurrentOperationStep(waitingForConfirmationStep);
              break;
            case "verifyingCompletion":
              setCurrentOperationStep(successStep);
              break;
          }
        },
      });

      // Extract transaction hash if available
      let stakeTxHash: string | undefined = undefined;
      if (result && typeof result === 'object' && 'hash' in result) {
        stakeTxHash = (result as { hash: string }).hash;
        // Update the current step to show transaction hash if we're in verification phase
        if (currentOperationStep?.phase === "verifyingCompletion") {
          setCurrentOperationStep({
            ...currentOperationStep,
            txHash: stakeTxHash,
            explorerUrl: stakingService.token.network.txExplorerUrl,
          });
        }
      }

      if (result.success) {
        setCurrentOperationStep({
          ...successStep,
          status: "success",
          ...(stakeTxHash && {
            txHash: stakeTxHash,
            explorerUrl: stakingService.token.network.txExplorerUrl,
          }),
        });
        onSuccess?.();
      } else {
        throw new Error(result.error || "Staking failed");
      }
    } catch (err) {
      const errorMessage = getShortErrorMessage(err);
      setError(errorMessage);
      setCurrentOperationStep(
        currentOperationStep ? { ...currentOperationStep, status: "error", errorMessage: errorMessage } : null
      );
    } finally {
      setIsStaking(false);
    }
  };

  // Validation functions

  const isStakeFormValid = () => {
    return (
      stakeData.pubkey.trim() !== "" &&
      stakeData.signature.trim() !== "" &&
      stakeData.depositDataRoot.trim() !== "" &&
      isValidPublicKey(stakeData.pubkey) &&
      isValidSignature(stakeData.signature) &&
      isValidDepositDataRoot(stakeData.depositDataRoot) &&
      isValidAmount
    );
  };

  const renderCapsuleStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">
          Create Imua Capsule
        </h2>
        <p className="text-gray-400">
          First, create a capsule contract that represents the validator&apos;s withdrawal credentials
        </p>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <Info className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-blue-300 text-sm">
            <p className="font-medium mb-2">What is an Imua Capsule?</p>
            <ul className="space-y-1 text-blue-200">
              <li>• A smart contract that represents the validator&apos;s withdrawal credentials</li>
              <li>• Required for native staking to the beacon chain</li>
              <li>• Each ETH restaker gets a unique capsule address, which supports multiple validators</li>
              <li>• The capsule receives rewards and withdrawals from the beacon chain</li>
            </ul>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {currentOperationStep && (
        <OperationProgress
          progress={{
            operation: "Capsule Creation",
            steps: [currentOperationStep],
            overallStatus: {
              currentPhase: currentOperationStep.phase,
              currentPhaseStatus: currentOperationStep.status,
            },
          }}
          open={true}
          onClose={() => {
            setCurrentOperationStep(null);
            // Move to stake step after closing capsule creation dialog if capsule was created successfully
            if (capsuleAddress && capsuleAddress !== 'Unknown') {
              setCurrentStep("stake");
            }
          }}
          onViewDetails={currentOperationStep?.txHash ? () => {
            const currentTxHash = currentOperationStep?.txHash;
            if (stakingService.token.network.txExplorerUrl && currentTxHash) {
              window.open(`${stakingService.token.network.txExplorerUrl}${currentTxHash}`, "_blank");
            }
          } : undefined}
        />
      )}

      <div className="flex justify-center">
        <Button
          onClick={handleCreateCapsule}
          disabled={isCreatingCapsule}
          className="w-full max-w-md bg-blue-500 hover:bg-blue-600 text-white py-3 px-8 text-lg font-medium rounded-lg transition-colors"
        >
          {isCreatingCapsule ? "Creating Capsule..." : "Create Capsule"}
        </Button>
      </div>
    </div>
  );

  const renderStakeStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">
          Stake to Beacon Chain
        </h2>
        <p className="text-gray-400">
          Stake ETH to the beacon chain with your capsule as withdrawal credentials{isPectraMode ? ' (32-2048 ETH range)' : ' (exactly 32 ETH)'}
        </p>
      </div>

      {/* Capsule Info */}
      {capsuleAddress && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-400 font-medium">Capsule Exists</p>
              <p className="text-green-300 text-sm font-mono">{capsuleAddress}</p>
            </div>
            <a href={`${stakingService.token.network.accountExplorerUrl}${capsuleAddress}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 text-green-400" />
            </a>
          </div>
        </div>
      )}

      {/* Amount Input */}
      <div className="space-y-2">
        <Label htmlFor="amount" className="text-white">
          Amount to Stake
        </Label>
        <div className="relative">
          <Input
            id="amount"
            type="text"
            placeholder="32.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="pr-16"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            ETH
          </div>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">
            Balance: {walletBalance ? formatUnits(walletBalance.value, 18) : "0"} ETH
          </span>
          <button
            onClick={() => {
              const walletBalanceEth = Number(formatUnits(walletBalance?.value || BigInt(0), 18));
              let maxAmount;
              if (isPectraMode) {
                maxAmount = Math.min(walletBalanceEth, 2048);
              } else {
                maxAmount = Math.min(walletBalanceEth, 32);
              }
              setAmount(maxAmount.toString());
            }}
            className="text-blue-400 hover:text-blue-300"
          >
            MAX
          </button>
        </div>
        {!isValidAmount && parsedAmount > BigInt(0) && (
          <p className="text-yellow-400 text-sm">
            ⚠️ {!isMultipleOfGwei 
              ? "Amount must be a multiple of 1 gwei (0.000000001 ETH)"
              : isPectraMode 
                ? "Pectra mode requires between 32 and 2048 ETH for validator staking"
                : "Non-Pectra mode requires exactly 32 ETH for validator staking"
            }
          </p>
        )}
        {amountError && (
          <p className="text-red-400 text-sm">{amountError}</p>
        )}
      </div>

      {/* Validator Data Inputs */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="pubkey" className="text-white">
            Validator Public Key (48 bytes)
          </Label>
          <Input
            id="pubkey"
            placeholder="0x1234... (48 bytes)"
            value={stakeData.pubkey}
            onChange={(e) =>
              setStakeData((prev) => ({ ...prev, pubkey: e.target.value }))
            }
            className={stakeData.pubkey && !isValidPublicKey(stakeData.pubkey) ? "border-red-500" : ""}
          />
          {stakeData.pubkey && !isValidPublicKey(stakeData.pubkey) && (
            <p className="text-red-400 text-sm">
              ⚠️ Public key must be a 48-byte hex string
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="signature" className="text-white">
            Validator Signature (96 bytes)
          </Label>
          <Input
            id="signature"
            placeholder="0x1234... (96 bytes)"
            value={stakeData.signature}
            onChange={(e) =>
              setStakeData((prev) => ({ ...prev, signature: e.target.value }))
            }
            className={stakeData.signature && !isValidSignature(stakeData.signature) ? "border-red-500" : ""}
          />
          {stakeData.signature && !isValidSignature(stakeData.signature) && (
            <p className="text-red-400 text-sm">
              ⚠️ Signature must be a 96-byte hex string
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="depositDataRoot" className="text-white">
            Deposit Data Root (32 bytes)
          </Label>
          <Input
            id="depositDataRoot"
            placeholder="0x1234... (32 bytes)"
            value={stakeData.depositDataRoot}
            onChange={(e) =>
              setStakeData((prev) => ({ ...prev, depositDataRoot: e.target.value }))
            }
            className={stakeData.depositDataRoot && !isValidDepositDataRoot(stakeData.depositDataRoot) ? "border-red-500" : ""}
          />
          {stakeData.depositDataRoot && !isValidDepositDataRoot(stakeData.depositDataRoot) && (
            <p className="text-red-400 text-sm">
              ⚠️ Deposit data root must be a 32-byte hex string
            </p>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
        <h4 className="text-yellow-400 font-medium mb-2">Instructions</h4>
        <ul className="text-yellow-300 text-sm space-y-1">
          <li>• Use the guide at <a href="https://deposit-cli.ethstaker.cc/landing.html" target="_blank" rel="noopener noreferrer">https://deposit-cli.ethstaker.cc/</a> to generate the validator public key, signature, and deposit data root</li>
          <li>
            • Pass the flags <br></br>
            <code className="bg-yellow-500/20 px-1 rounded command-wrap">
              {amount ? `--amount ${amount} ` : ""}
              --withdrawal_address {capsuleAddress}{' '}
              <span className="no-wrap">
                {isPectraMode ? "--compounding" : "--regular-withdrawal"}
              </span>
            </code>
          </li>
          <li>• After staking, wait for the deposit to be activated on the beacon chain and verify it in the next tab</li>
        </ul>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {currentOperationStep && (
        <OperationProgress
          progress={{
            operation: "Stake to Beacon Chain",
            steps: [currentOperationStep],
            overallStatus: {
              currentPhase: currentOperationStep.phase,
              currentPhaseStatus: currentOperationStep.status,
            },
          }}
          open={true}
          onClose={() => setCurrentOperationStep(null)}
          onViewDetails={stakeData.pubkey ? () => {
            // Open validator explorer
            const validatorExplorerUrl = (stakingService.token.network as { validatorExplorerUrl?: string }).validatorExplorerUrl;
            if (validatorExplorerUrl && stakeData.pubkey) {
              window.open(`${validatorExplorerUrl}${stakeData.pubkey}`, "_blank");
            }
          } : undefined}
          viewDetailsText="View validator"
        />
      )}

      <div className="flex justify-center">
        <Button
          onClick={handleStake}
          disabled={!isStakeFormValid() || isStaking}
          className="w-full max-w-md bg-teal-500 hover:bg-teal-600 text-white py-3 px-8 text-lg font-medium rounded-lg transition-colors"
        >
          {isStaking ? "Staking..." : "Stake ETH"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {currentStep === "capsule" ? renderCapsuleStep() : renderStakeStep()}
    </div>
  );
}