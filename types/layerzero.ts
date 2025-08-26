// Types for LayerZero API responses
export interface MessageResponse {
  data: MessageData[];
}

export interface MessageData {
  pathway: Pathway;
  source: TransactionStatus;
  destination: DestinationStatus;
  verification: Verification;
  guid: string;
  config: Config;
  status: Status;
  created: string;
  updated: string;
}

export interface Pathway {
  srcEid: number;
  dstEid: number;
  sender: AddressInfo;
  receiver: AddressInfo;
  id: string;
  nonce: number;
}

export interface AddressInfo {
  address: string;
  id?: string;
  name?: string;
  chain: string;
}

export interface TransactionStatus {
  status: string;
  tx: Transaction;
  failedTx?: string[];
}

export interface Transaction {
  txHash: string;
  blockHash: string;
  blockNumber: string | number;
  blockTimestamp: number;
  from?: string;
  blockConfirmations?: number;
  payload?: string;
  value?: string;
  readinessTimestamp?: number;
  resolvedPayload?: string;
  adapterParams?: AdapterParams;
  options?: TransactionOptions;
}

export interface AdapterParams {
  version: string;
  dstGasLimit: string;
  dstNativeGasTransferAmount: string;
  dstNativeGasTransferAddress: string;
}

export interface TransactionOptions {
  lzReceive?: LzReceive;
  nativeDrop?: NativeDrop[];
  compose?: Compose[];
  ordered: boolean;
}

export interface LzReceive {
  gas: string;
  value: string;
}

export interface NativeDrop {
  amount: string;
  receiver: string;
}

export interface Compose {
  index: number;
  gas: string;
  value: string;
}

export interface DestinationStatus {
  nativeDrop?: {
    status: string;
  };
  lzCompose?: {
    status: string;
  };
  tx: Transaction;
  status: string;
  payloadStoredTx?: string;
  failedTx?: string[];
}

export interface Verification {
  dvn: DVNVerification;
  sealer: SealerVerification;
}

export interface DVNVerification {
  dvns: Record<string, DVNInfo>;
  status: string;
}

export interface DVNInfo {
  txHash: string;
  blockHash: string;
  blockNumber: number;
  blockTimestamp: number;
  proof: Proof;
  optional: boolean;
  status: string;
}

export interface Proof {
  packetHeader: string;
  payloadHash: string;
}

export interface SealerVerification {
  tx: Transaction;
  failedTx?: FailedTransaction[];
  status: string;
}

export interface FailedTransaction {
  txHash: string;
  txError: string;
}

export interface Config {
  error: boolean;
  errorMessage?: string;
  dvnConfigError?: boolean;
  receiveLibrary: string;
  sendLibrary: string;
  inboundConfig: ChainConfig;
  outboundConfig: ChainConfig;
  ulnSendVersion: string;
  ulnReceiveVersion: string;
}

export interface ChainConfig {
  confirmations: number;
  requiredDVNCount: number;
  optionalDVNCount: number;
  optionalDVNThreshold: number;
  requiredDVNs: string[];
  requiredDVNNames: string[];
  optionalDVNs: string[];
  optionalDVNNames: string[];
  executor?: string;
}

export interface Status {
  name: string;
  message: string;
}

// Status fields are generic strings as we're not sure about all possible values

// Helper type for checking if a message is confirmed
export interface ConfirmationResult {
  confirmed: boolean;
  error?: string;
  destinationTxHash?: string;
}
