// components/tabs/VerifyTab.tsx
import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  OperationProgress,
  OperationStep,
  transactionStep,
  confirmationStep,
  completionStep,
} from "@/components/ui/operation-progress";
import { useStakingServiceContext } from "@/contexts/StakingServiceContext";
import { NSTVerifyParams } from "@/types/staking";
import { getShortErrorMessage } from "@/lib/utils";
import { useBootstrapStatus } from "@/hooks/useBootstrapStatus";
import { isValidPublicKey } from "@/utils/nstEthValidation";
import { Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface VerifyTabProps {
  sourceChain: string;
  destinationChain: string;
  onSuccess?: () => void;
}

export function VerifyTab({ sourceChain, destinationChain, onSuccess }: VerifyTabProps) {
  const { bootstrapStatus } = useBootstrapStatus();
  if (!bootstrapStatus?.isBootstrapped) {
    if (sourceChain !== destinationChain) {
      throw new Error("Source and destination chains must be the same during bootstrap phase");
    }
  } else {
    throw new Error("Not supported post bootstrap phase");
  }

  const stakingService = useStakingServiceContext();
  if (!('validatorExplorerUrl' in stakingService.token.network && stakingService.token.network.validatorExplorerUrl)) {
    throw new Error("Validator explorer URL is not set for NST verification");
  }
  if (!('beaconApiUrl' in stakingService.token.network && stakingService.token.network.beaconApiUrl)) {
    throw new Error("Beacon API URL is not set for NST verification");
  }
  if (!stakingService.hasBlockRootForTimestamp) {
    throw new Error("Has block root for timestamp is not set for NST verification");
  }
  if (!stakingService.addBlockRootForTimestamp) {
    throw new Error("Add block root for timestamp is not set for NST verification");
  }
  if (!stakingService.nstVerifyAndDeposit) {
    throw new Error("NST verify and deposit is not set for NST verification");
  }

  // Validator public key state
  const [validatorPublicKey, setValidatorPublicKey] = useState<string>("");
  const [activationSlot, setActivationSlot] = useState<number | null>(null);
  const [validatorIndex, setValidatorIndex] = useState<number | null>(null);
  const [slotsPerEpoch, setSlotsPerEpoch] = useState<number>(32); // Default fallback value
  const [validatorStatus, setValidatorStatus] = useState<{
    status: string | null;
    loading: boolean;
    error: string | null;
    data?: {
      index: string;
      balance: string;
      validator: {
        pubkey: string;
        withdrawal_credentials: string;
        effective_balance: string;
        slashed: boolean;
        activation_eligibility_epoch: string;
        activation_epoch: string;
        exit_epoch: string;
        withdrawable_epoch: string;
      };
    };
  }>({
    status: null,
    loading: false,
    error: null,
  });

  // Proof upload state
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofData, setProofData] = useState<{
    stateRoot: string;
    stateRootProof: string[];
    validatorContainer: string[];
    validatorContainerProof: string[];
    slot: string;
    validatorIndex: string;
    timestamp: string;
  } | null>(null);

  // Operation state
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<OperationStep | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Beacon oracle state
  const [timestampAvailable, setTimestampAvailable] = useState<boolean | null>(null);
  const [isCheckingTimestamp, setIsCheckingTimestamp] = useState(false);
  const [isNewTimestamp, setIsNewTimestamp] = useState(false);

  // Check beacon chain status
  // Extract beaconApiUrl to prevent unnecessary re-renders
  const beaconApiUrl = (stakingService.token.network as { beaconApiUrl: string }).beaconApiUrl;
  // Fetch slots per epoch from beacon chain spec
  const fetchSlotsPerEpoch = useCallback(async () => {
    try {
      const response = await fetch(`${beaconApiUrl}/eth/v1/config/spec`);
      if (response.ok) {
        const data = await response.json();
        const slotsPerEpochValue = parseInt(data.data?.SLOTS_PER_EPOCH || '32');
        setSlotsPerEpoch(slotsPerEpochValue);
      }
    } catch (error) {
      console.warn('Failed to fetch slots per epoch from beacon spec, using default value 32:', error);
    }
  }, [beaconApiUrl]);
  // Fetch slots per epoch on component mount
  useEffect(() => {
    fetchSlotsPerEpoch();
  }, [fetchSlotsPerEpoch]);

  // Check if timestamp is available in beacon oracle
  const checkTimestampAvailability = useCallback(async (timestamp: string) => {
    if (!stakingService.hasBlockRootForTimestamp) return false;
    setIsCheckingTimestamp(true);
    try {
      const isAvailable = await stakingService.hasBlockRootForTimestamp(timestamp);
      setTimestampAvailable(isAvailable);
      return isAvailable;
    } catch (error) {
      console.error("Failed to check timestamp availability:", error);
      setTimestampAvailable(false);
      return false;
    } finally {
      setIsCheckingTimestamp(false);
      setIsNewTimestamp(false);
    }
  }, [stakingService]);



  // Validate proof data structure
  const isValidProofData = (data: unknown): data is {
    stateRoot: string;
    stateRootProof: string[];
    validatorContainer: string[];
    validatorContainerProof: string[];
    slot: string;
    validatorIndex: string;
    timestamp: string;
  } => {
    return (
      data !== null &&
      typeof data === 'object' &&
      'stateRoot' in data &&
      'stateRootProof' in data &&
      'validatorContainer' in data &&
      'validatorContainerProof' in data &&
      'slot' in data &&
      'validatorIndex' in data &&
      'timestamp' in data &&
      typeof (data as Record<string, unknown>).stateRoot === 'string' &&
      Array.isArray((data as Record<string, unknown>).stateRootProof) &&
      Array.isArray((data as Record<string, unknown>).validatorContainer) &&
      Array.isArray((data as Record<string, unknown>).validatorContainerProof) &&
      typeof (data as Record<string, unknown>).slot === 'string' &&
      typeof (data as Record<string, unknown>).validatorIndex === 'string' &&
      typeof (data as Record<string, unknown>).timestamp === 'string' &&
      String((data as Record<string, unknown>).stateRoot).startsWith('0x') &&
      ((data as Record<string, unknown>).stateRootProof as unknown[]).every((item: unknown) => typeof item === 'string' && item.toString().startsWith('0x')) &&
      ((data as Record<string, unknown>).validatorContainer as unknown[]).every((item: unknown) => typeof item === 'string' && item.toString().startsWith('0x')) &&
      ((data as Record<string, unknown>).validatorContainerProof as unknown[]).every((item: unknown) => typeof item === 'string' && item.toString().startsWith('0x'))
    );
  };
  const checkValidatorStatus = useCallback(async () => {
    if (!validatorPublicKey || !isValidPublicKey(validatorPublicKey)) {
      return;
    }
    setValidatorStatus(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch(beaconApiUrl + `/eth/v1/beacon/states/head/validators/${validatorPublicKey}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Validator not found; check the validator public key`);
        }
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      // Extract status and validator data from the API response
      const status = data.data?.status || 'unknown';
      const validatorData = data.data;

      // Calculate activation slot if activation epoch is available
      if (validatorData?.validator?.activation_epoch) {
        const activationEpoch = parseInt(validatorData.validator.activation_epoch);
        const calculatedActivationSlot = activationEpoch * slotsPerEpoch;
        setActivationSlot(calculatedActivationSlot);
      }
      if (validatorData?.index) {
        setValidatorIndex(parseInt(validatorData.index));
      }

      setValidatorStatus({ 
        status, 
        loading: false, 
        error: null,
        data: validatorData
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check validator status';
      setValidatorStatus({ 
        status: null, 
        loading: false, 
        error: errorMessage 
      });
    }
  }, [validatorPublicKey, beaconApiUrl, slotsPerEpoch]);

  // Handle proof file upload
  const handleProofFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset the input value to allow selecting the same file again
    event.target.value = '';

    if (file && file.type === 'application/json') {
      setProofFile(file);
      // Read and parse the JSON file
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const jsonData = JSON.parse(e.target?.result as string);
          if (isValidProofData(jsonData)) {
            // Check if timestamp has changed - if so, reset availability state
            const timestampChanged = proofData?.timestamp !== jsonData.timestamp;
            if (timestampChanged) {
              setTimestampAvailable(null);
              setIsNewTimestamp(true);
            } else {
              setIsNewTimestamp(false);
            }
            setProofData(jsonData);
            setError(null);
            // Check timestamp availability when proof is loaded
            checkTimestampAvailability(jsonData.timestamp);
          } else {
            setError('Invalid proof file format. Expected fields: stateRoot, stateRootProof, validatorContainer, validatorContainerProof, slot, validatorIndex, timestamp');
            setProofData(null);
            setTimestampAvailable(null);
            setIsNewTimestamp(false);
          }
        } catch (error) {
          console.log("JSON parsing failed:", error);
          setError('Invalid JSON file format');
          setProofData(null);
          setTimestampAvailable(null);
          setIsNewTimestamp(false);
        }
      };
      reader.readAsText(file);
    } else {
      setError('Please select a valid JSON file');
      setProofFile(null);
      setProofData(null);
      setTimestampAvailable(null);
      setIsNewTimestamp(false);
    }
  };

  const handleAddTimestamp = async () => {
    if (!proofData || !stakingService.addBlockRootForTimestamp) return;

    try {
      setIsProcessing(true);
      setError(null);
      setTxHash(null);
      setCurrentStep(transactionStep);

      const result = await stakingService.addBlockRootForTimestamp(proofData.timestamp, {
        onPhaseChange: (phase) => {
          switch (phase) {
            case "sendingTx":
              setCurrentStep(transactionStep);
              break;
            case "confirmingTx":
              setCurrentStep(confirmationStep);
              break;
            case "verifyingCompletion":
              setCurrentStep(completionStep);
              break;
          }
        },
      });

      if (result.success) {
        setTxHash(result.hash);
        setCurrentStep({
          ...completionStep,
          status: "success",
          txHash: result.hash,
          explorerUrl: stakingService.token.network.txExplorerUrl,
        });
        // Recheck timestamp availability
        await checkTimestampAvailability(proofData.timestamp);
      } else {
        throw new Error(result.error || "Failed to add timestamp");
      }
    } catch (err) {
      const errorMessage = getShortErrorMessage(err);
      setError(errorMessage);
      setCurrentStep(
        currentStep ? { 
          ...currentStep, 
          status: "error", 
          errorMessage,
          ...(txHash && {
            txHash: txHash,
            explorerUrl: stakingService.token.network.txExplorerUrl,
          }),
        } : {
          ...transactionStep,
          status: "error",
          errorMessage,
          ...(txHash && {
            txHash: txHash,
            explorerUrl: stakingService.token.network.txExplorerUrl,
          }),
        }
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerify = async () => {
    if (!stakingService.nstVerifyAndDeposit) {
      setError("NST verification not available");
      return;
    }

    if (!validatorPublicKey || !isValidPublicKey(validatorPublicKey)) {
      setError("Please enter a valid validator public key");
      return;
    }

    if (validatorStatus.status !== 'active_ongoing') {
      setError("Validator must be active_ongoing to submit proof");
      return;
    }

    if (!proofData) {
      setError("Please upload a valid proof JSON file");
      return;
    }

    // Check if timestamp is available in beacon oracle
    if (timestampAvailable === false) {
      // Add timestamp first
      await handleAddTimestamp();
      return;
    }

    // If timestamp availability is unknown, check it now
    if (timestampAvailable === null) {
      if (!stakingService.hasBlockRootForTimestamp) {
        setError("Timestamp checking not available");
        return;
      }
      const isAvailable = await stakingService.hasBlockRootForTimestamp(proofData.timestamp);
      if (!isAvailable) {
        // Add timestamp first
        await handleAddTimestamp();
        return;
      }
    }

    // Validate that proof data matches the current validator
    if (validatorIndex !== null && parseInt(proofData.validatorIndex) !== validatorIndex) {
      setError(`Proof validator index (${proofData.validatorIndex}) does not match current validator index (${validatorIndex})`);
      return;
    }

    if (activationSlot !== null && parseInt(proofData.slot) !== activationSlot) {
      setError(`Proof slot (${proofData.slot}) does not match expected activation slot (${activationSlot})`);
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      setTxHash(null);
      setCurrentStep(transactionStep);

      // Parse proof data from uploaded JSON
      const parsedProof: NSTVerifyParams['proof'] = {
        beaconBlockTimestamp: BigInt(String(proofData.timestamp || "0")),
        validatorIndex: BigInt(String(proofData.validatorIndex || "0")),
        stateRoot: String(proofData.stateRoot || "0x0") as `0x${string}`,
        stateRootProof: Array.isArray(proofData.stateRootProof) ? proofData.stateRootProof as `0x${string}`[] : [],
        validatorContainerRootProof: Array.isArray(proofData.validatorContainerProof) ? proofData.validatorContainerProof as `0x${string}`[] : [],
      };

      const verifyParams: NSTVerifyParams = {
        validatorContainer: Array.isArray(proofData.validatorContainer) ? proofData.validatorContainer as `0x${string}`[] : [],
        proof: parsedProof,
      };

      // Start verification process
      const result = await stakingService.nstVerifyAndDeposit(verifyParams, {
        onPhaseChange: (phase) => {
          switch (phase) {
            case "sendingTx":
              setCurrentStep(transactionStep);
              break;
            case "confirmingTx":
              setCurrentStep(confirmationStep);
              break;
            case "verifyingCompletion":
              setCurrentStep(completionStep);
              break;
          }
        },
      });

      // Extract transaction hash if available
      if (result.hash) {
        setTxHash(result.hash);
      }

      if (result.success) {
        setCurrentStep({
          ...completionStep,
          status: "success",
          ...(result.hash && {
            txHash: result.hash,
            explorerUrl: stakingService.token.network.txExplorerUrl,
          }),
        });
        onSuccess?.();
      } else {
        throw new Error(result.error || "Verification failed");
      }
    } catch (err) {
      const errorMessage = getShortErrorMessage(err);
      setError(errorMessage);
      // Show error in progress dialog instead of closing it
      setCurrentStep(
        currentStep ? { 
          ...currentStep, 
          status: "error", 
          errorMessage,
          ...(txHash && {
            txHash: txHash,
            explorerUrl: stakingService.token.network.txExplorerUrl,
          }),
        } : {
          ...transactionStep,
          status: "error",
          errorMessage,
          ...(txHash && {
            txHash: txHash,
            explorerUrl: stakingService.token.network.txExplorerUrl,
          }),
        }
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const isFormValid = () => {
    return (
      validatorPublicKey.trim() !== "" &&
      isValidPublicKey(validatorPublicKey) &&
      validatorStatus.status === 'active_ongoing' &&
      proofData !== null
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">
          Verify Native Stake
        </h2>
        <p className="text-gray-400">
          Submit validator public key and proof to complete your NST deposit
        </p>
      </div>

      {/* Validator Public Key Input */}
      <div className="space-y-2">
        <Label htmlFor="validatorPublicKey" className="text-white">
          Validator Public Key (48 bytes)
        </Label>
        <div className="flex gap-2">
          <Input
            id="validatorPublicKey"
            placeholder="0x1234... (48 bytes)"
            value={validatorPublicKey}
            onChange={(e) => setValidatorPublicKey(e.target.value)}
            className={validatorPublicKey && !isValidPublicKey(validatorPublicKey) ? "border-red-500" : ""}
          />
          <Button
            onClick={checkValidatorStatus}
            disabled={!validatorPublicKey || !isValidPublicKey(validatorPublicKey) || validatorStatus.loading}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4"
          >
            {validatorStatus.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check Status"}
          </Button>
        </div>
        {validatorPublicKey && !isValidPublicKey(validatorPublicKey) && (
          <p className="text-red-400 text-sm">
            ⚠️ Public key must be a 48-byte hex string
          </p>
        )}
      </div>

      {/* Validator Status Display */}
      {validatorStatus.status && (
        <div className={`border rounded-lg p-4 ${
          validatorStatus.status === 'active_ongoing' 
            ? 'bg-green-500/10 border-green-500/20' 
            : 'bg-yellow-500/10 border-yellow-500/20'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {validatorStatus.status === 'active_ongoing' ? (
              <CheckCircle className="h-5 w-5 text-green-400" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-400" />
            )}
            <span className={`font-medium ${
              validatorStatus.status === 'active_ongoing' ? 'text-green-400' : 'text-yellow-400'
            }`}>
              Validator Status: {validatorStatus.status}
            </span>
          </div>
          {validatorStatus.data && (
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-400">Index:</span>
                <span className="text-white">{validatorStatus.data.index}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Balance:</span>
                <span className="text-white">{(parseInt(validatorStatus.data.balance) / 1e9).toFixed(4)} ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Effective Balance:</span>
                <span className="text-white">{(parseInt(validatorStatus.data.validator.effective_balance) / 1e9).toFixed(4)} ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Activation Epoch:</span>
                <span className="text-white">{validatorStatus.data.validator.activation_epoch}</span>
              </div>
              {activationSlot !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Activation Slot:</span>
                  <span className="text-white">{activationSlot.toLocaleString()}</span>
                </div>
              )}
              {validatorStatus.data.validator.slashed && (
                <div className="text-red-400 text-center font-medium">
                  ⚠️ This validator has been slashed for double signing.
                </div>
              )}
            </div>
          )}
          {validatorStatus.status !== 'active_ongoing' && (
            <p className="text-yellow-300 text-sm mt-2">
              Only active_ongoing validators can submit proofs
            </p>
          )}
        </div>
      )}

      {validatorStatus.error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400 text-sm">{validatorStatus.error}</p>
        </div>
      )}

      {/* Proof File Upload */}
      <div className="space-y-2">
        <Label htmlFor="proofFile" className="text-white">
          Proof JSON File
        </Label>
        <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
          <input
            type="file"
            id="proofFile"
            accept=".json"
            onChange={handleProofFileUpload}
            className="hidden"
          />
          <label htmlFor="proofFile" className="cursor-pointer">
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-400">
              {proofFile ? proofFile.name : "Click to upload proof JSON file"}
            </p>
          </label>
        </div>
        {proofData && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
            <p className="text-green-400 text-sm mb-2">
              ✅ Proof file loaded successfully
            </p>
            <div className="text-xs text-green-300 space-y-1">
              <div>Validator Index: {proofData.validatorIndex}</div>
              <div>Slot: {proofData.slot}</div>
              <div>Timestamp: {new Date(parseInt(proofData.timestamp) * 1000).toLocaleString()}</div>
              <div>State Root: {proofData.stateRoot.slice(0, 10)}...</div>
              <div>Proof Elements: {proofData.stateRootProof.length + proofData.validatorContainerProof.length}</div>
            </div>
          </div>
        )}

        {/* Timestamp Status */}
        {proofData && (
          <div className="mt-4">
            {isCheckingTimestamp ? (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                  <span className="text-blue-400 text-sm">
                    {isNewTimestamp ? "Checking new timestamp availability..." : "Checking timestamp availability..."}
                  </span>
                </div>
              </div>
            ) : timestampAvailable === true ? (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span className="text-green-400 text-sm">Timestamp available in beacon oracle</span>
                </div>
              </div>
            ) : timestampAvailable === false ? (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-yellow-400" />
                  <span className="text-yellow-400 text-sm">Timestamp not available in beacon oracle - must be added first</span>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Operation Progress */}
      {currentStep && (
        <OperationProgress
          progress={{
            operation: timestampAvailable === false ? "Add Timestamp" : "Verify Native Stake",
            steps: [currentStep],
            overallStatus: {
              currentPhase: currentStep.phase,
              currentPhaseStatus: currentStep.status,
            },
          }}
          open={true}
          onClose={() => setCurrentStep(null)}
        />
      )}

      {/* Action Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleVerify}
          disabled={!isFormValid() || isProcessing}
          className="w-full max-w-md bg-teal-500 hover:bg-teal-600 text-white py-3 px-8 text-lg font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing 
            ? (timestampAvailable === false ? "Adding Timestamp..." : "Verifying...") 
            : (timestampAvailable === false ? "Add Timestamp" : "Verify & Deposit")
          }
        </Button>
      </div>

      {/* Help Text */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <h4 className="text-blue-400 font-medium mb-2">Providing the proof:</h4>
        <ul className="text-blue-300 text-sm space-y-1">
          <li>• Obtain a beacon node API</li>
          <li>• Run the binary at <a href="https://github.com/imua-xyz/proofs-generation" target="_blank" rel="noopener noreferrer">https://github.com/imua-xyz/proofs-generation</a></li>
          <li>• Call the server with the validator index and slot {activationSlot !== null && validatorIndex !== null ? (
            <code>{"{"}slot: {activationSlot}, validator_index: {validatorIndex}{"}"}</code>
          ): ""}</li>
          <li>• Save the result as a JSON file and upload it above</li>
        </ul>
      </div>
    </div>
  );
}