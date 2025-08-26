import { XrplClientState } from "@/stores/xrplClient";
import { Network } from "@gemwallet/api";
import { PublicClient } from "viem";

export type Phase =
  | "approving"
  | "sendingTx"
  | "confirmingTx"
  | "sendingRequest"
  | "receivingResponse"
  | "verifyingCompletion";

export type PhaseStatus = "pending" | "processing" | "success" | "error";

export interface OverallStatus {
  currentPhase: Phase;
  currentPhaseStatus: PhaseStatus;
}

export type OperationMode = "local" | "simplex" | "duplex";

export type OperationType =
  | "asset"
  | "delegation"
  | "undelegation"
  | "associate"
  | "dissociate";

export interface BaseTxOptions {
  mode: OperationMode;
  spawnTx: () => Promise<any>;

  getStateSnapshot?: () => Promise<any>;
  verifyCompletion?: (
    snapshotBefore: any,
    snapshotAfter: any,
  ) => Promise<boolean>;
  onPhaseChange?: (newPhase: Phase) => void;
  onSuccess?: (result: { hash: string; success: boolean }) => void;
}

export interface EVMTxOptions extends BaseTxOptions {
  publicClient: PublicClient;
  approvingTx?: () => Promise<`0x${string}`>;
}

export interface XrplTxOptions extends BaseTxOptions {
  spawnTx: () => Promise<GemWalletResponse>;
  utxoGateway: any;
  getTransactionStatus: XrplClientState["getTransactionStatus"];
}

export interface StakerBalance {
  clientChainID: number;
  stakerAddress: `0x${string}`;
  tokenID: `0x${string}`;
  totalBalance: bigint;
  claimable?: bigint; // the balance that could be claimed from imuachain(but might not be withdrawable)
  withdrawable: bigint; // the balance that could be withdrawn to user wallet on client chain
  delegated: bigint;
  pendingUndelegated: bigint;
  totalDeposited: bigint;
}

export interface StakerBalanceResponseFromPrecompile {
  clientChainID: number;
  stakerAddress: `0x${string}`;
  tokenID: `0x${string}`;
  balance: bigint;
  withdrawable: bigint; // the balance that could be claimed from imuachain
  delegated: bigint;
  pendingUndelegated: bigint;
  totalDeposited: bigint;
}

export interface WalletBalance {
  customClientChainID: number;
  stakerAddress: string;
  tokenID?: string;
  value: bigint;
  decimals: number;
  symbol: string;
}

export interface GemWalletNetwork {
  chain: string;
  network: Network;
  websocket: string;
}

// Type for the GemWallet response
export interface GemWalletResponse {
  success: boolean;
  error?: string;
  xrpAddress?: string;
  data?: any;
}
