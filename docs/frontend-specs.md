# Exocore Frontend Technical Specification

## 1. Application Architecture

### 1.1 Key Technologies

- **Framework**: Next.js with App Router
- **State Management**: React Query for server state, React hooks for local state
- **UI Library**: Shadcn/UI components with Tailwind CSS
- **Wallet Integration**: Wagmi, ConnectKit
- **Data Fetching**: React Query, Viem for contract interactions

### 1.2 Project Structure

- **`/app`**: Next.js pages and layouts
- **`/components`**: Reusable UI components
- **`/hooks`**: Custom React hooks for state management and contract interactions
- **`/config`**: Configuration files for contracts, tokens, and network settings
- **`/lib`**: Utility functions and helper libraries

## 2. Core Components & Layouts

### 2.1 Application Layout

- **`RootLayout`**: Base layout with:
  - Providers wrapper (Wagmi, React Query, ConnectKit)
  - Navbar for navigation
  - Content area
  - Footer

### 2.2 Page Layouts

- **`DashboardLayout`**: Private layout for authenticated users
  - Sidebar navigation
  - Authentication protection (redirects to home if not connected)
  - Main content area

### 2.3 Key Pages

- **`Home`**: Landing page with:

  - Hero section
  - Features overview
  - Asset listing preview
  - Community information

- **`Dashboard`**: User's staking overview with:

  - StakingOverview component (summary cards)
  - YourPositions component (detailed position table)

- **`Staking`**: Asset listing page with:
  - TokenList component (available assets to stake)
- **`Stake/[token]`**: Individual token staking page with:

  - Token information display
  - StakeTokenForm component

- **`Delegate/[token]`**: Delegation management page with:

  - DelegateForm component
  - Current delegations display
  - Operator selection

- **`Withdraw/[token]`**: Two-step withdrawal management page with:
  - ClaimForm component (Step 1)
  - WithdrawForm component (Step 2)
  - Transaction status tracking

### 2.4 Critical Components by Page

#### Dashboard Page Components

- **`StakingOverview`**: Displays aggregate metrics

  - Total staked value
  - Claimable balance (withdrawable balance)
  - Delegated amount
  - Pending undelegated amount
  - Loading states with skeletons

- **`YourPositions`**: Tabular view of staked assets
  - Asset information (symbol, name)
  - Balance information (staked, claimable/withdrawable, delegated)
  - Action buttons (delegation, withdrawal, stake more)
  - Loading/empty/error states

#### Staking Page Components

- **`TokenList`**: Grid of available tokens for staking
  - Token card with:
    - Icon and basic information
    - Current staking metrics
    - Total staked in protocol
    - "Stake" action button
  - Filtering options by:
    - Token type (LST, native)
    - Chain

#### Stake Token Page Components

- **`StakeTokenForm`**: Multi-step form for staking
  - Amount input with validation
  - Max button for convenience
  - Balance display
  - Operator selection dropdown (optional)
  - Delegation toggle
  - Transaction status indicators with Steps component
  - Error handling
  - Success confirmation

#### Delegate Page Components

- **`DelegateForm`**: Form for delegation management

  - Current delegations overview
  - Available balance display
  - Operator selection with:
    - Basic operator information
    - Commission rates
  - Amount input with validation
  - Transaction status tracking
  - Network fee information (for cross-chain message)

- **`UndelegateForm`**: Form for undelegation
  - Current delegations by operator
  - Amount input with validation
  - Undelegation period information
  - Confirmation step
  - Transaction status tracking
  - Network fee information (for cross-chain message)

#### Withdraw Page Components

- **`ClaimForm`**: First step of withdrawal process (Step 1)

  - Available balance display
  - Amount input
  - Network fee information (for cross-chain message)
  - Cross-chain messaging status indicators
  - Explanation that this step only requests permission from Imuachain
  - Indication that a second step will be required

- **`WithdrawForm`**: Second step of withdrawal process (Step 2)

  - Withdrawable balance display (after successful claim)
  - Amount input
  - Recipient address input (default to connected wallet)
  - Transaction status tracking
  - Explanation that this step directly transfers from vault
  - Indication that no cross-chain message is required

- **`DelegationActions`**: Dropdown menu component used across pages
  - Context-aware actions based on asset state
  - Delegate option
  - Undelegate option
  - Withdraw option (links to the withdrawal process)
  - Quick links to dedicated forms

## 3. Core Hooks & State Management

### 3.1 Contract Interaction Hooks

#### `useClientChainGateway`

**Purpose**: Provides interaction with the ClientChainGateway contract
**Key Functionality**:

- Instantiates contract using current network
- Provides contract instance, public client, and wallet client
- Manages user address context

**Returns**:

```typescript
{
  contract: Contract | null,
  publicClient: PublicClient,
  walletClient: WalletClient,
  contractAddress: Address,
  userAddress: Address
}
```

#### `useAssetsPrecompile`

**Purpose**: Interacts with the Assets precompile contract on Imua
**Key Functionality**:

- Provides methods to read staker balance information
- Interfaces with the IAssets precompile at 0x0000000000000000000000000000000000000804

**Returns**:

```typescript
{
  contract: Contract | null,
  publicClient: PublicClient,
  walletClient: WalletClient,
  getStakerBalanceByToken: Function
}
```

#### `useLSTOperations`

**Purpose**: Manages LST (Liquid Staking Token) operations
**Key Functionality**:

- Deposit tokens
- Delegate tokens to operators
- Undelegate tokens
- Claim principal from Imuachain (first step of withdrawal)
- Withdraw principal (second step of withdrawal)
- Approval and staking combined workflow

**Returns**:

```typescript
{
  deposit: Function,
  delegateTo: Function,
  undelegateFrom: Function,
  depositAndDelegate: Function,
  claimPrincipal: Function,
  withdrawPrincipal: Function,
  stakeWithApproval: Function,
  getQuote: Function
}
```

### 3.2 Data Fetching Hooks

#### `useStakingPosition`

**Purpose**: Retrieves user's staking positions
**Key Functionality**:

- Fetches asset information from Cosmos API
- Fetches staker balances from Assets precompile
- Combines and formats data
- Tracks loading/error states

**Returns**: React Query result with:

```typescript
{
  data: StakingPosition[],
  isLoading: boolean,
  error: Error | null,
  // ... other React Query properties
}
```

#### `useBalances`

**Purpose**: Retrieves token balances
**Key Functionality**:

- Gets ERC20 token balance for specified address
- Tracks loading/error states

**Returns**:

```typescript
{
  balance: bigint | undefined,
  isLoading: boolean
}
```

#### `useOperators`

**Purpose**: Fetches available operators for delegation
**Key Functionality**:

- Retrieves operator list from API
- Formats data for UI presentation

**Returns**:

```typescript
{
  operators: Operator[],
  isLoading: boolean,
  error: Error | null
}
```

### 3.3 Utility Hooks

#### `useContractUtils`

**Purpose**: Provides common contract utilities
**Key Functionality**:

- Transaction handling with status updates
- Fee quote retrieval
- Error handling

**Returns**:

```typescript
{
  handleTxWithStatus: Function,
  getQuote: Function
}
```

#### `useToast`

**Purpose**: Provides toast notification system
**Key Functionality**:

- Shows success, error, and info notifications
- Manages toast queue

**Returns**:

```typescript
{
  toast: Function;
}
```

## 4. Business Workflows

### 4.1 LST Staking Workflow

#### User Journey

1. User navigates to Staking page
2. User selects a token to stake
3. User enters amount and optional operator for delegation
4. User initiates transaction
5. User confirms two transactions (approval and staking)
6. User is redirected to Dashboard on success

#### State Changes

1. **Initial**:

   - Token balance in user's wallet
   - No staked position

2. **During Transaction**:

   - `txStatus` changes from null → 'approving' → 'processing' → 'success'
   - UI shows appropriate step indicators and alerts

3. **After Success**:
   - Token balance decreased in user's wallet
   - New staking position appears in Dashboard
   - If delegated, delegated balance increases
   - Cross-chain message sent to Imuachain (assumed to always succeed)

#### Hook Interactions

1. `useBalances`: Checks token balance
2. `useOperators`: Fetches operator list (if delegating)
3. `useLSTOperations.stakeWithApproval`: Handles transaction
4. `useToast`: Shows success notification
5. `useStakingPosition`: Fetches updated positions (on Dashboard)

### 4.2 Delegation Workflow

#### User Journey

1. User navigates to Dashboard or Delegation page
2. User finds position and clicks "Delegate" in action menu
3. User selects operator and amount
4. User confirms transaction
5. Position updates to show delegated amount

#### State Changes

1. **Initial**:

   - Position shows undelegated balance
   - Delegated amount is zero or partial

2. **After Transaction**:
   - Cross-chain message sent to Imuachain (no response required)
   - No immediate state change on client chain
   - Later, when data refreshes, delegated amount increases (reflected in staker balance data)
   - Undelegated amount decreases

#### Hook Interactions

1. `useStakingPosition`: Gets current position data
2. `useOperators`: Fetches available operators
3. `useLSTOperations.delegateTo`: Handles delegation transaction
4. `useToast`: Shows success notification

### 4.3 Undelegation Workflow

#### User Journey

1. User navigates to Dashboard or Delegation page
2. User finds position and clicks "Undelegate" in action menu
3. User selects amount to undelegate from an operator
4. User confirms transaction, acknowledging unbonding period
5. Position updates to show pending undelegated amount

#### State Changes

1. **Initial**:
   - Position shows delegated balance
2. **After Transaction**:
   - Cross-chain message sent to Imuachain (no response required)
   - No immediate state change on client chain
   - Later, when data refreshes, delegated amount decreases (reflected in staker balance data)
   - Pending undelegated amount increases
   - Unbonding period timer starts (managed by Imuachain)

#### Hook Interactions

1. `useStakingPosition`: Gets current position data
2. `useLSTOperations.undelegateFrom`: Handles undelegation transaction
3. `useToast`: Shows success notification

### 4.4 Withdrawal Workflow (Two-step process)

#### User Journey

1. **Step 1: Claim - Request permission from Imuachain**

   - User clicks "Withdraw" in Dashboard or navigates to Withdraw page
   - User enters amount to withdraw
   - User confirms transaction (`claimPrincipalFromImuachain`)
   - UI shows cross-chain messaging status
   - User waits for Imuachain response

2. **Step 2: Withdraw - Transfer from Vault**
   - After successful response from Imuachain
   - User confirms second transaction (`withdrawPrincipal`)
   - Tokens return to user's wallet

#### State Changes

1. **Initial**:

   - Position shows claimable balance

2. **After First Transaction (Claim)**:

   - Cross-chain message sent to Imuachain
   - UI tracks cross-chain message progress
   - Waiting for response from Imuachain

3. **After Imuachain Response (if successful)**:

   - Vault updates withdrawable balance for user
   - UI indicates funds are available for withdrawal

4. **After Second Transaction (Withdraw)**:
   - Withdrawable balance in Vault decreases
   - User wallet balance increases
   - No cross-chain message required

#### Hook Interactions

1. `useStakingPosition`: Gets current position data
2. `useLSTOperations.claimPrincipal`: Initiates withdrawal (requests permission)
3. `useLSTOperations.withdrawPrincipal`: Completes withdrawal (transfers tokens)
4. `useToast`: Shows success notifications
5. `useBalances`: Shows updated token balance

## 5. Data Flow

### 5.1 User Data Retrieval Flow

1. User connects wallet → `useAccount` provides address
2. `useStakingPosition` hook:
   - Constructs stakerId from address and chainId
   - Fetches asset_infos from Cosmos API
   - For each asset, fetches:
     - Staker balance from Assets precompile
     - Asset metadata from Cosmos API
   - Combines data into StakingPosition[] structure
   - Updates every 30 seconds automatically

### 5.2 Transaction Flow

1. User initiates action → component calls appropriate hook
2. Hook (e.g., `useLSTOperations`) prepares transaction with:
   - Contract method
   - Arguments
   - Fee calculation for cross-chain messages (if needed)
3. Transaction submitted via `handleTxWithStatus`
4. Status updates flow to UI
5. Success/failure handled with appropriate notifications
6. For cross-chain operations:
   - UI indicates message is being sent
   - For operations requiring responses (claim), UI indicates waiting for response
   - For operations not requiring responses (deposit, delegate, undelegate), UI indicates success after message sent

## 6. Cross-Chain Communication Model

Based on the Imua contract design:

### 6.1 Request Types and Message Handling

All cross-chain messages must be successfully consumed by Imuachain contracts to maintain protocol functionality. The key difference is in how execution errors are handled:

- **Deposit Operations**:

  - Must always succeed on Imuachain
  - Execution is NOT wrapped in try/catch or low-level calls
  - Any failure is considered a protocol exception and reverts the transaction
  - Message failure blocks subsequent messages (critical to protocol operation)
  - This design ensures deposits always succeed when properly validated

- **Delegate/Undelegate Operations**:

  - Message execution IS wrapped in try/catch or low-level calls
  - Messages are always successfully consumed even if the operation itself fails
  - If Imuachain native modules reject the request, it's silently consumed
  - No response is sent back to client chain
  - Failures don't affect protocol state but the operation may need to be retried

- **Claim Principal Operations**:
  - Message execution IS wrapped in try/catch or low-level calls
  - Messages are always successfully consumed even if the operation itself fails
  - Returns a response to the client chain indicating success or failure
  - On success, increases withdrawable balance in Vault
  - On failure, no state changes occur in Vault but message is marked as consumed

### 6.2 Communication Flow

1. Client sends request to Imuachain via LayerZero message
2. Imuachain processes request:
   - For deposit: Executes without error handling (must succeed)
   - For delegate/undelegate: Executes with error handling (silently consumes on failure)
   - For claim: Executes with error handling and returns result
3. For claim operations, Imuachain sends response back to client chain
4. Client chain updates Vault state based on response

### 6.3 Message Ordering

- Messages use nonce mechanism to ensure ordered execution
- Each message must be consumed (successfully processed or acknowledged) to maintain sequence
- This design ensures protocol resilience while allowing for operation-specific error handling

## 7. Error Handling & Edge Cases

### 7.1 Connection States

- Dashboard redirects to home if wallet not connected
- Wallet connection promoted on home page
- Transaction buttons disabled when not connected

### 7.2 Loading States

- Skeleton loaders for dashboard components
- Disabled buttons during loading
- Loading indicators in forms

### 7.3 Error States

- Form validation errors with clear messages
- Transaction errors displayed in alerts
- API fetch errors shown in components
- Fallback content for empty states

### 7.4 Cross-Chain Message States

- Pending cross-chain message indicators
- Estimated time displays for cross-chain operations
- Clear indication of which operations require waiting for response

## 8. Security Considerations

### 8.1 Transaction Safety

- Amount validation before transactions
- Balance checks before submitting
- Clear transaction status indicators
- Proper approval flow for tokens

### 8.2 Input Validation

- zod schema validation for forms
- BigInt handling for token amounts
- Decimal input restrictions

## 9. Performance Optimizations

### 9.1 Data Fetching

- React Query for caching and background updates
- Appropriate refetch intervals (30s for positions)
- Reuse of wallet connections across hooks

### 9.2 Rendering

- Conditional rendering based on state
- Skeleton loaders to prevent layout shifts
- Efficient list rendering with virtualization potential
