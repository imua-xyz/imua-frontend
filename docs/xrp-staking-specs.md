# XRP Staking Technical Specification

## 1. Overview

This document outlines the technical specifications for implementing XRP staking functionality in the Exocore frontend. Unlike EVM-compatible tokens, XRP staking follows a distinct workflow due to XRPL's native architecture. The implementation leverages XUMM wallet for initial staking transactions and MetaMask (or other EVM wallets) for delegation and withdrawal operations via the UTXOGateway contract.

## 2. Architecture

### 2.1 Technical Stack

- **XRP Wallet**: XUMM wallet (browser extension or mobile app)
- **EVM Wallet**: MetaMask or other EVM-compatible wallets
- **XRPL SDK**: xrpl.js
- **Smart Contract Integration**: UTXOGateway contract
- **State Management**: React Query, React hooks
- **UI Framework**: Consistent with existing Exocore frontend

### 2.2 Page Structure

- **Route**: `/xrp-staking`
- **Layout**: Similar to existing LST staking pages with tabs
- **Components**: 
  - XRP wallet connection
  - EVM wallet connection (for delegation and withdrawal)
  - Tab-based interface for different staking operations
  - Staking positions overview

### 2.3 Integration Points

- **XRPL Network**: For submitting and tracking initial XRP staking transactions
- **Imua Network**: For delegation and withdrawal operations via UTXOGateway contract
- **Bridge Service**: For processing XRP deposits and withdrawals
- **Cosmos API**: For tracking staking positions

## 3. XRP Staking Process Model

### 3.1 Staking Flow

1. **Connect XUMM Wallet**: User connects to their XRP wallet
2. **Initial Staking**: User sends XRP payment to vault address with destination tag
3. **Bridge Processing**: Bridge relays deposit to Imuachain
4. **Position Created**: XRP staking position appears on dashboard
5. **Address Association**: XRP address automatically mapped to EVM address in UTXOGateway contract

### 3.2 Delegation Flow

1. **Connect EVM Wallet**: User connects MetaMask or other EVM wallet
2. **Delegate Operation**: User delegates staked XRP via UTXOGateway.delegateTo()
3. **EVM Transaction**: Transaction is signed with EVM wallet
4. **State Update**: Delegation state updated on Imuachain

### 3.3 Undelegation Flow

1. **Connect EVM Wallet**: User connects MetaMask or other EVM wallet
2. **Undelegate Operation**: User undelegates via UTXOGateway.undelegateFrom()
3. **EVM Transaction**: Transaction is signed with EVM wallet
4. **State Update**: Undelegation state updated on Imuachain with unbonding period

### 3.4 Withdrawal Flow (Two-step)

1. **Step 1 - Claim**: 
   - User connects EVM wallet
   - User initiates withdrawal via UTXOGateway.withdrawPrincipal()
   - Claim transaction is processed on Imuachain
   - Peg-out request is created

2. **Step 2 - Automated Processing**:
   - Bridge monitors peg-out requests
   - Bridge automatically processes withdrawal
   - XRP is sent from vault to user's XRP address
   - No additional user action required

## 4. UI Components

### 4.1 XRP Staking Page Layout

The layout follows the existing LST staking page design:

```
+----------------------------------------------------+
| HEADER + NAVIGATION                                |
+----------------------------------------------------+
| WALLET CONNECTION SECTION                          |
| +------------------------------------------------+ |
| | XUMM Wallet: [Connect/Connected]               | |
| | EVM Wallet: [Connect/Connected]                | |
| +------------------------------------------------+ |
|                                                    |
| STAKING POSITION OVERVIEW                          |
| +------------------------------------------------+ |
| | Total Staked | Delegated | Withdrawable        | |
| | Amount       | Amount    | Amount              | |
| +------------------------------------------------+ |
|                                                    |
| OPERATIONS TABS                                    |
| +------------------------------------------------+ |
| | [Stake] [Delegate] [Undelegate] [Withdraw]     | |
| +------------------------------------------------+ |
|                                                    |
| TAB CONTENT                                        |
| +------------------------------------------------+ |
| |                                                | |
| | [Content based on selected tab]                | |
| |                                                | |
| +------------------------------------------------+ |
+----------------------------------------------------+
| FOOTER                                             |
+----------------------------------------------------+
```

### 4.2 Component Specifications

#### 4.2.1 WalletConnector

- **Purpose**: Manages wallet connections for both XUMM and EVM
- **Display**:
  - XUMM connection status with address and XRP balance
  - EVM wallet connection status with address and Imua balance
  - Connection buttons for each wallet
- **Behavior**:
  - Both wallets can be connected independently
  - XUMM required for staking, EVM required for delegation/withdrawal
  - Displays appropriate prompts based on selected operation

#### 4.2.2 StakingPositionOverview

- **Purpose**: Displays comprehensive overview of user's XRP staking position
- **Data Display**:
  - Total staked XRP amount
  - Total delegated amount
  - Withdrawable amount
  - Pending undelegated amount (if any)
- **Format**:
  - Card layout with prominent metrics
  - Conditional rendering based on position status
  - Visual indicators for changes in position

#### 4.2.3 OperationTabs

- **Purpose**: Navigation between different staking operations
- **Tabs**:
  - Stake: Initial XRP staking
  - Delegate: Delegation management
  - Undelegate: Undelegation process
  - Withdraw: Withdrawal process
- **Behavior**:
  - Active tab highlighted
  - Tabs disabled if prerequisites not met
  - Context-specific validation for each tab

#### 4.2.4 StakeTab

- **Purpose**: Interface for staking XRP
- **Prerequisites**:
  - XUMM wallet connected
- **Components**:
  - Amount input with validation
  - Available XRP balance display
  - Network fee estimation
  - Destination tag explanation (auto-generated)
  - Payment instructions
- **Actions**:
  - Stake button: Initiates XUMM payment flow
  - Transaction monitoring UI

#### 4.2.5 DelegateTab

- **Purpose**: Interface for delegation operations via UTXOGateway contract
- **Prerequisites**:
  - EVM wallet connected
  - Active XRP staking position
- **Components**:
  - Available balance for delegation
  - Operator selection dropdown
  - Amount input with validation
  - Gas fee estimation
- **Actions**:
  - Delegate button: Calls UTXOGateway.delegateTo()
  - Transaction status tracking

#### 4.2.6 UndelegateTab

- **Purpose**: Interface for undelegation via UTXOGateway contract
- **Prerequisites**:
  - EVM wallet connected
  - Active delegation position
- **Components**:
  - Current delegations by operator
  - Operator selection dropdown
  - Amount input for undelegation
  - Gas fee estimation
  - Unbonding period information
- **Actions**:
  - Undelegate button: Calls UTXOGateway.undelegateFrom()
  - Transaction status tracking

#### 4.2.7 WithdrawTab

- **Purpose**: Interface for withdrawal via UTXOGateway contract
- **Prerequisites**:
  - EVM wallet connected
  - Withdrawable balance available
- **Components**:
  - Withdrawable amount display
  - Amount input with validation
  - Destination XRP address display (read-only, uses connected XUMM address)
  - Gas fee estimation
  - Explanation of two-step automated process
- **Actions**:
  - Withdraw button: Calls UTXOGateway.withdrawPrincipal()
  - Transaction status tracking
  - Withdrawal request monitoring UI

## 5. Key Hooks and Logic

### 5.1 Core Hooks

#### 5.1.1 useXummWallet

**Purpose**: Manages XUMM wallet connection and session

**Returns**:
```typescript
{
  xumm: XummSdk | null;
  isConnected: boolean;
  userAddress: string | null;
  xrplClient: XrplClient | null;
  balance: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}
```

#### 5.1.2 useEvmWallet

**Purpose**: Manages EVM wallet connection for UTXOGateway interaction

**Returns**:
```typescript
{
  address: `0x${string}` | undefined;
  isConnected: boolean;
  chainId: number | undefined;
  connect: () => Promise<void>;
  disconnect: () => void;
}
```

#### 5.1.3 useXrpStaking

**Purpose**: Manages XRP staking operations

**Key Functions**:
- `stakeXrp(amount: string)`: Creates and signs XRP payment transaction
- `trackTransaction(txid: string)`: Monitors transaction status

**Returns**:
```typescript
{
  stakeXrp: (amount: string) => Promise<TxResult>;
  trackTransaction: (txid: string) => Promise<TxStatus>;
  getStakingFee: () => Promise<string>;
  transactionStatus: 'idle' | 'pending' | 'success' | 'error';
}
```

#### 5.1.4 useUTXOGateway

**Purpose**: Interacts with UTXOGateway contract for delegation and withdrawal

**Key Functions**:
- `delegateTo(operator: string, amount: string)`: Delegates XRP to operator
- `undelegateFrom(operator: string, amount: string)`: Undelegates XRP from operator
- `withdrawPrincipal(amount: string)`: Initiates withdrawal process

**Returns**:
```typescript
{
  contract: Contract | null;
  delegateTo: (operator: string, amount: string) => Promise<TxResult>;
  undelegateFrom: (operator: string, amount: string) => Promise<TxResult>;
  withdrawPrincipal: (amount: string) => Promise<TxResult>;
  isLoading: boolean;
  error: Error | null;
}
```

#### 5.1.5 useXrpStakingPosition

**Purpose**: Fetches and manages user's XRP staking positions

**Returns**:
```typescript
{
  data: XrpStakingPosition | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
```

### 5.2 Interface with UTXOGateway Contract

```typescript
// Implementation of useUTXOGateway hook
import { useContractWrite, useContractRead, useAccount } from 'wagmi';
import { parseUnits } from 'viem';
import { UTXO_GATEWAY_ABI, UTXO_GATEWAY_ADDRESS } from '@/config/contracts';

export function useUTXOGateway() {
  const { address } = useAccount();
  
  // Token enum value for XRP in the contract
  const XRP_TOKEN_ENUM = 2; // Assuming XRP is enum value 2 in the contract
  
  // Delegate to an operator
  const { 
    writeAsync: delegateToAsync,
    isLoading: isDelegateLoading,
    error: delegateError 
  } = useContractWrite({
    address: UTXO_GATEWAY_ADDRESS,
    abi: UTXO_GATEWAY_ABI,
    functionName: 'delegateTo',
  });
  
  // Undelegate from an operator
  const { 
    writeAsync: undelegateFromAsync,
    isLoading: isUndelegateLoading,
    error: undelegateError 
  } = useContractWrite({
    address: UTXO_GATEWAY_ADDRESS,
    abi: UTXO_GATEWAY_ABI,
    functionName: 'undelegateFrom',
  });
  
  // Withdraw principal
  const { 
    writeAsync: withdrawPrincipalAsync,
    isLoading: isWithdrawLoading,
    error: withdrawError 
  } = useContractWrite({
    address: UTXO_GATEWAY_ADDRESS,
    abi: UTXO_GATEWAY_ABI,
    functionName: 'withdrawPrincipal',
  });
  
  // Delegate XRP to an operator
  const delegateTo = async (operator: string, amount: string) => {
    if (!address) throw new Error('Wallet not connected');
    
    const amountInSmallestUnit = parseUnits(amount, 6); // XRP has 6 decimals
    
    try {
      const tx = await delegateToAsync({
        args: [XRP_TOKEN_ENUM, operator, amountInSmallestUnit]
      });
      
      return {
        success: true,
        txHash: tx.hash
      };
    } catch (error) {
      console.error('Delegation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };
  
  // Undelegate XRP from an operator
  const undelegateFrom = async (operator: string, amount: string) => {
    if (!address) throw new Error('Wallet not connected');
    
    const amountInSmallestUnit = parseUnits(amount, 6);
    
    try {
      const tx = await undelegateFromAsync({
        args: [XRP_TOKEN_ENUM, operator, amountInSmallestUnit]
      });
      
      return {
        success: true,
        txHash: tx.hash
      };
    } catch (error) {
      console.error('Undelegation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };
  
  // Withdraw XRP principal
  const withdrawPrincipal = async (amount: string) => {
    if (!address) throw new Error('Wallet not connected');
    
    const amountInSmallestUnit = parseUnits(amount, 6);
    
    try {
      const tx = await withdrawPrincipalAsync({
        args: [XRP_TOKEN_ENUM, amountInSmallestUnit]
      });
      
      return {
        success: true,
        txHash: tx.hash
      };
    } catch (error) {
      console.error('Withdrawal failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };
  
  return {
    delegateTo,
    undelegateFrom,
    withdrawPrincipal,
    isLoading: isDelegateLoading || isUndelegateLoading || isWithdrawLoading,
    error: delegateError || undelegateError || withdrawError
  };
}
```

## 6. User Workflows

### 6.1 First-Time XRP Staking Workflow

1. User navigates to XRP staking page
2. User connects XUMM wallet
3. User selects Stake tab
4. User enters amount to stake
5. System validates amount against minimum requirements
6. User initiates staking transaction
7. XUMM displays payment request for signing
8. User approves transaction in XUMM
9. System tracks transaction confirmation
10. UI updates to reflect successful staking

### 6.2 Delegation Workflow

1. User navigates to XRP staking page
2. User connects EVM wallet
3. User selects Delegate tab
4. User selects operator from dropdown
5. User enters amount to delegate
6. System validates delegation amount
7. User clicks "Delegate" button
8. MetaMask opens for transaction signing
9. User confirms transaction in MetaMask
10. UI displays transaction status and updates position data

### 6.3 Undelegation Workflow

1. User navigates to XRP staking page
2. User connects EVM wallet
3. User selects Undelegate tab
4. User selects operator from their active delegations
5. User enters amount to undelegate
6. System validates undelegation amount
7. User clicks "Undelegate" button
8. MetaMask opens for transaction signing
9. User confirms transaction in MetaMask
10. UI displays transaction status and updates position with pending undelegation

### 6.4 Withdrawal Workflow

1. User navigates to XRP staking page
2. User connects EVM wallet
3. User selects Withdraw tab
4. User enters amount to withdraw
5. System validates withdrawal amount
6. User clicks "Withdraw" button
7. MetaMask opens for transaction signing
8. User confirms transaction in MetaMask
9. UI displays withdrawal request status
10. System automatically updates when bridge processes the withdrawal

## 7. Error Handling & Edge Cases

### 7.1 Wallet Connection Issues

- **XUMM Not Installed**: Provide link to install XUMM
- **EVM Wallet Connection Failure**: Clear instructions to connect correct network
- **Wrong Network**: Prompt to switch to correct EVM network

### 7.2 Transaction Failures

- **Insufficient Balance**: Clear error with required balance
- **Transaction Rejected**: User-friendly error with retry option
- **Contract Errors**: Parsed and displayed in user-friendly format

### 7.3 XRP-Specific Considerations

- **Reserve Requirement**: Ensure 20 XRP reserve is maintained
- **Destination Tag Handling**: Auto-generated based on user's EVM address
- **Transaction Confirmation**: Clear indication of when XRP transaction is confirmed

### 7.4 Cross-Chain Communication Issues

- **Delayed Processing**: Status indicators with estimated processing times
- **Failed Peg-out Requests**: Monitoring and notification system
- **State Synchronization**: Regular polling to keep UI in sync with blockchain state

## 8. Integration with UTXOGateway Contract

### 8.1 Contract Configuration

```typescript
// contracts.ts
export const UTXO_GATEWAY_ADDRESS = '0x1234567890123456789012345678901234567890'; // Replace with actual address

export const UTXO_GATEWAY_ABI = [
  // Functions used for XRP staking
  {
    "inputs": [
      {
        "internalType": "enum Token",
        "name": "token",
        "type": "uint8"
      },
      {
        "internalType": "string",
        "name": "operator",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "delegateTo",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "enum Token",
        "name": "token",
        "type": "uint8"
      },
      {
        "internalType": "string",
        "name": "operator",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "undelegateFrom",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "enum Token",
        "name": "token",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "withdrawPrincipal",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Read functions
  {
    "inputs": [
      {
        "internalType": "enum ClientChainID",
        "name": "clientChainId",
        "type": "uint8"
      },
      {
        "internalType": "address",
        "name": "imuachainAddress",
        "type": "address"
      }
    ],
    "name": "getClientAddress",
    "outputs": [
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
```

### 8.2 Token Enumeration

The application needs to use the correct token enum value when interacting with the UTXOGateway contract:

```typescript
// config/tokens.ts
export enum Token {
  NONE = 0,
  BTC = 1,
  XRP = 2  // Assuming XRP is enum value 2 in the contract
}

export enum ClientChainID {
  NONE = 0,
  BITCOIN = 1,
  XRP = 2  // Assuming XRP is enum value 2 in the contract
}
```

## 9. API Integration

### 9.1 XRPL API Integration

- **Endpoint**: Public XRPL nodes or dedicated service
- **Methods**: 
  - `account_info`: Get XRP account details and balance
  - `tx`: Get transaction details and confirmation status

### 9.2 Cosmos API Endpoints

- **XRP Staking Positions**: `GET /api/staking/xrp/{evmAddress}`
- **Operators List**: `GET /api/operators`
- **Transaction Status**: `GET /api/transactions/{txHash}`

### 9.3 Bridge Service Monitoring

- **Transaction Monitoring**: Polling for transaction status updates
- **Withdrawal Request Status**: Tracking peg-out requests

## 10. Implementation Plan

### 10.1 Phase A: Core Infrastructure & Staking

- Set up XUMM integration
- Implement wallet connections (XUMM and EVM)
- Create basic UI components
- Implement XRP staking transaction flow

### 10.2 Phase B: UTXOGateway Integration

- Implement UTXOGateway contract integration
- Set up delegation and undelegation functionality
- Implement position tracking and display

### 10.3 Phase C: Withdrawal Flow

- Implement withdrawal process
- Add withdrawal request monitoring
- Build status tracking UI

### 10.4 Phase D: Testing & Refinement

- End-to-end testing
- Performance optimization
- UX refinements
- Documentation and deployment

## 11. Technical Requirements

### 11.1 Dependencies

```json
{
  "xrpl": "^2.7.0",
  "xumm-sdk": "^1.5.0",
  "wagmi": "^1.4.1",
  "viem": "^1.6.0",
  "@tanstack/react-query": "^4.29.5"
}
```

### 11.2 Environment Variables

```
NEXT_PUBLIC_XUMM_API_KEY=your_xumm_api_key
NEXT_PUBLIC_XRP_VAULT_ADDRESS=xrp_vault_address
NEXT_PUBLIC_XRPL_NETWORK=mainnet|testnet|devnet
NEXT_PUBLIC_UTXO_GATEWAY_ADDRESS=contract_address
NEXT_PUBLIC_EVM_NETWORK_ID=network_id
NEXT_PUBLIC_COSMOS_API_ENDPOINT=cosmos_api_url
```

## 12. Conclusion

This specification outlines the implementation of XRP staking within the Exocore frontend, following the same structure and design patterns as the existing LST staking pages. By integrating XUMM wallet for initial staking and EVM wallets for delegation and withdrawal operations via the UTXOGateway contract, we create a seamless user experience that leverages the best of both XRPL and EVM ecosystems.

The design maintains consistency with the existing Exocore frontend while accommodating the different technical requirements of XRP staking and its integration with the Imua network. This approach allows XRP holders to participate in the Imua staking ecosystem with a familiar and intuitive user interface. 