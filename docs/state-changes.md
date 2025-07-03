# Imua Chain Staking: State Changes & Operations

## 1. Staker Balance Components

The staker's balance on Imua Chain consists of three key components:

1. **Claimable Balance**: Tokens in custody but not actively staked
2. **Delegated Balance**: Tokens actively staked with operators
3. **Pending Undelegated Balance**: Tokens in unbonding period

## 2. Staking Operations & State Changes

### 2.1 Deposit

- **Action**: User sends tokens to client chain contracts without delegating
- **State Change**:
  - ↑ Claimable Balance (on Imua Chain)
  - ↓ Wallet Balance (on Client Chain)
- **User Experience**:
  - Tokens are held in custody but not generating yield
  - Tokens available for delegation later

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
- **State Change**:
  - ↓ Delegated Balance
  - ↑ Pending Undelegated Balance
  - Claimable Balance unchanged
- **Future State Change** (after unbonding period):
  - ↓ Pending Undelegated Balance
  - ↑ Claimable Balance (may be less than initial amount if slashing occurred)
- **User Experience**:
  - Tokens stop generating yield immediately
  - Tokens unavailable during unbonding period
  - Tokens potentially subject to slashing during unbonding

### 2.5 Claim Principal

- **Action**: User requests permission to withdraw tokens from Imua Chain
- **State Change**:
  - ↓ Claimable Balance (on Imua Chain)
  - ↑ Unlocked Balance (in Client Chain contracts)
- **User Experience**:
  - Tokens no longer tracked on Imua Chain
  - Tokens not yet in user's wallet (additional step required)
  - Only applicable for chains with smart contract support

### 2.6 Withdraw

- **Action**: User withdraws unlocked tokens to their wallet
- **State Change**:
  - ↓ Unlocked Balance (in Client Chain contracts)
  - ↑ Wallet Balance (on Client Chain)
- **User Experience**:
  - Tokens returned to user's wallet
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
                                     Balance
                                        │
User Wallet <──(Withdraw)──── Unlocked <──(Claim)──── Claimable Balance
              (Client Chain)   Balance               (Imua Chain)
```

## 5. Important Principles

1. **Deposit Resilience**: Deposits must always succeed when properly validated
2. **Delegation Flexibility**: Delegation can occur at time of deposit or later
3. **Unbonding Security**: Undelegated tokens must go through unbonding period
4. **Cross-Chain Custody**: Assets are physically held on client chain but accounted for on Imua Chain
5. **Withdrawal Safety**: Two-step process ensures proper authorization and security

This model provides users with flexibility while maintaining secure cross-chain token management and staking operations.
