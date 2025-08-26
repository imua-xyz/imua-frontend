# Imua Chain Staking: State Changes & Operations

## 1. Staker Balance Components

The staker's balance on Imua Chain consists of three key components:

1. **Claimable Balance** (`withdrawable` in Imuachain RPC): Tokens locked in client chain contracts (vaults) but not delegated to operators (no yield generation)
2. **Delegated Balance**: Tokens actively delegated to operators and generating yield
3. **Pending Undelegated Balance**: Tokens in unbonding period that will eventually return to claimable balance

**Important Note**: All these balances are accounting states recorded by Imuachain. The actual tokens are physically locked in client chain vault contracts.

## 1.1 Client Chain Withdrawable Balance

There is an important distinction between Imuachain's claimable balance and the client chain's withdrawable balance:

- **Imuachain Claimable Balance**: Represents tokens that Imuachain still tracks and can be delegated or claimed
- **Client Chain Withdrawable Balance**: Represents the actual unlocked amount in vault contracts that can be withdrawn to user wallets

**Two-Step Withdrawal Process**:
1. **Claim**: Decreases Imuachain claimable balance, increases client chain withdrawable balance (unlocks tokens in vault)
2. **Withdraw**: Decreases client chain withdrawable balance, increases user wallet balance (transfers tokens from vault to wallet)

## 2. Staking Operations & State Changes

### 2.1 Deposit

- **Action**: User sends tokens to client chain contracts without delegating
- **State Change**:
  - ↑ Claimable Balance (on Imuachain)
  - ↓ Wallet Balance (on Client Chain)
- **User Experience**:
  - Tokens are locked in vault contracts but not generating yield
  - Tokens available for delegation or claim operations

### 2.2 Stake

- **Action**: User deposits tokens AND delegates to an operator in one operation
- **State Change on Success**:
  - ↑ Delegated Balance (on Imua Chain)
  - ↓ Wallet Balance (on Client Chain)
  - Claimable Balance unchanged
- **State Change on Failure**:
  - ↑ Claimable Balance (deposit succeeds but delegation fails)
  - ↓ Wallet Balance (on Client Chain)
  - Delegated Balance unchanged
- **User Experience**:
  - Tokens begin generating yield immediately
  - Single transaction for complete staking operation

### 2.3 Delegate

- **Action**: User delegates tokens from claimable balance to an operator
- **State Change**:
  - ↑ Delegated Balance
  - ↓ Claimable Balance
  - Total Balance unchanged
- **User Experience**:
  - Previously deposited tokens begin generating yield
  - No additional tokens taken from wallet

### 2.4 Undelegate

- **Action**: User requests to undelegate tokens from an operator
- **State Change Options**:

#### 2.4.1 Delayed Unbonding (Traditional)
- **State Change** (on Imuachain only):
  - ↓ Delegated Balance
  - ↑ Pending Undelegated Balance
  - Claimable Balance unchanged
- **Future State Change** (after unbonding period, on Imuachain):
  - ↓ Pending Undelegated Balance
  - ↑ Claimable Balance (may be less than initial amount if slashing occurred)
- **User Experience**:
  - Tokens stop generating yield immediately
  - Tokens unavailable during unbonding period
  - Tokens potentially subject to slashing during unbonding
  - No additional fee for standard processing
  - **No client chain state changes**: Unlocked balance and wallet balance remain unchanged

#### 2.4.2 Instant Unbonding
- **State Change** (on Imuachain only):
  - ↓ Delegated Balance
  - ↑ Claimable Balance (immediately, bypassing unbonding period)
  - **Slashing penalty applied**: A percentage of the unbonding amount is deducted
- **User Experience**:
  - Tokens stop generating yield immediately
  - Tokens immediately available for delegation or claim operations
  - No unbonding period required
  - Higher fee due to immediate processing
  - **Slashing penalty incurred** for bypassing the unbonding period
  - **No client chain state changes**: Unlocked balance and wallet balance remain unchanged

### 2.5 Claim Principal

- **Action**: User requests to unlock tokens from Imuachain custody in client chain vaults
- **State Change**:
  - ↓ Claimable Balance (on Imuachain)
  - ↑ Withdrawable Balance (in Client Chain vault contracts)
- **User Experience**:
  - Tokens no longer tracked by Imuachain (can't be delegated)
  - Tokens unlocked in vault contracts but not yet in user's wallet
  - Additional withdraw step required to transfer tokens to wallet
  - Only applicable for chains with smart contract support

### 2.6 Withdraw

- **Action**: User withdraws unlocked tokens from vault contracts to their wallet
- **State Change**:
  - ↓ Withdrawable Balance (in Client Chain vault contracts)
  - ↑ Wallet Balance (on Client Chain)
- **User Experience**:
  - Tokens transferred from vault contracts to user's wallet
  - For chains without smart contracts (BTC, XRP), combines claim+withdraw in one step

## 3. Chain-Specific Considerations

### 3.1 Smart Contract Chains (ETH, EVM-compatible)

- Two-step withdrawal process required:
  1. Claim (request permission from Imua Chain)
  2. Withdraw (transfer from contract to wallet)
- All balance tracking and custody managed through contracts

### 3.2 Non-Smart Contract Chains (BTC, XRP)

- Single-step withdrawal process:
  - Withdraw operation handles both claim and transfer
- Cross-chain messaging managed through precompiles and specialized gateways

## 4. State Flow Visualization

```
User Wallet ──(Deposit)──> Claimable Balance ──(Delegate)──> Delegated Balance
                                ↑                                   │
                                │                                   │
                                └───(After Unbonding)────┐          │
                                                         │          │
                               Pending Undelegated <──(Undelegate)──┘
                                     Balance              │
                                        │                 │
                                        │                 │
                                        │                 │
                                        │                 └──(Instant Unbonding)──> Claimable Balance
                                        │                                    (Imua Chain)
                                        │
User Wallet <──(Withdraw)──── Unlocked <──(Claim)──── Claimable Balance
              (Client Chain)   Balance               (Imua Chain)
```

### 4.1 Instant vs Delayed Unbonding Paths

- **Delayed Path** (Imuachain only): Delegated Balance → Pending Undelegated → Claimable Balance
- **Instant Path** (Imuachain only): Delegated Balance → Claimable Balance (with slashing penalty)

**Note**: Unbonding operations only affect Imuachain state. To access tokens after unbonding, users must perform separate Claim and Withdraw operations on the client chain.

## 5. Important Principles

1. **Deposit Resilience**: Deposits must always succeed when properly validated
2. **Delegation Flexibility**: Delegation can occur at time of deposit or later
3. **Unbonding Security**: 
   - Delayed unbonding: Undelegated tokens must go through unbonding period
   - Instant unbonding: Tokens bypass unbonding period for immediate availability
4. **Cross-Chain Custody**: Assets are physically held on client chain but accounted for on Imua Chain
5. **Withdrawal Safety**: Two-step process ensures proper authorization and security
6. **Unbonding Choice**: Users can choose between instant (higher fee, immediate) and delayed (lower fee, secure) unbonding

## 6. Instant Unbonding Considerations

### 6.1 When to Use Instant Unbonding
- **Immediate liquidity needs**: When tokens are needed right away
- **Market timing**: To capitalize on favorable market conditions
- **Emergency situations**: When quick access to funds is critical

### 6.2 When to Use Delayed Unbonding
- **Cost optimization**: No extra fee for patient users
- **Security preference**: Traditional unbonding period for added security
- **Long-term planning**: When immediate access isn't required

### 6.3 Technical Implementation
- **Fee structure**: 
  - Delayed unbonding: No additional fee (standard processing)
  - Instant unbonding: Higher fees to compensate for immediate processing
- **State bypass**: Tokens move directly from delegated to claimable state on Imuachain
- **Slashing penalty**: A percentage of the unbonding amount is deducted as penalty for bypassing the unbonding period
- **Immediate availability**: Tokens can be immediately delegated to other operators OR claimed to unlock them in client chain vaults, without waiting for unbonding period
- **Imuachain-only processing**: No client chain state changes involved in the instant unbonding process

This model provides users with flexibility while maintaining secure cross-chain token management and staking operations.
