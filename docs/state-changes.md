# Imua Chain Staking: State Changes & Operations

## 1. Staker Balance Components

The staker's balance consists of four key components that work together across Imuachain and client chains:

1. **Claimable Balance**: Tokens locked in client chain contracts (vaults) but not delegated to operators (no yield generation)
2. **Delegated Balance**: Tokens actively delegated to operators and generating yield
3. **Pending Undelegated Balance**: Tokens in unbonding period that will eventually return to claimable balance
4. **Total Deposited**: The cumulative total of all deposits minus all claims, representing the historical net position

**Important Note**: Claimable, Delegated, and Pending Undelegated balances are accounting states recorded by Imuachain. The actual tokens are physically locked in client chain vault contracts.

## 1.1 Client Chain Withdrawable Balance

There is an important distinction between Imuachain's claimable balance and the client chain's withdrawable balance:

- **Imuachain Claimable Balance**: Represents tokens that Imuachain still tracks and can be delegated or claimed
- **Client Chain Vault Withdrawable Balance**: Represents the actual unlocked amount in vault contracts that can be withdrawn to user wallets

**Two-Step Withdrawal Process**:

1. **Claim**: Decreases Imuachain claimable balance, increases client chain vault withdrawable balance (unlocks tokens in vault)
2. **Withdraw**: Decreases client chain vault withdrawable balance, increases user wallet balance (transfers tokens from vault to wallet)

**Important**: Vault withdrawable balance always means the same thing regardless of bootstrap phase - it's the unlocked token balance in vault contracts that's ready for withdrawal to user wallets.

## 1.2 Balance Relationship

The relationship between these balances is:

```
Total Deposited = Claimable + Delegated + Pending Undelegated + (Any slashing penalties)
```

**During Bootstrap Phase**:

- No slashing occurs
- No delayed unbonding (all undelegations are instant)
- `Total Deposited = Claimable + Delegated` (Pending Undelegated is always 0)

**After Bootstrap Phase**:

- Slashing may occur during delayed unbonding
- Delayed unbonding creates Pending Undelegated balance
- `Total Deposited = Claimable + Delegated + Pending Undelegated + Slashing Penalties`

## 1.3 Bootstrap Phase vs Post-Bootstrap Phase

**Bootstrap Phase** (Before Imuachain Launch):

- All operations are **local** (no cross-chain messaging)
- Bootstrap contract acts as the ledger recording all staking positions
- Operations use `beforeLocked` modifier to enforce timeline restrictions
- All unbondings are **instant** (no delayed unbonding support)
- **Balance Mapping**:
  - `Bootstrap.totalDepositAmounts` → `Total Deposited`
  - `Bootstrap.withdrawableAmounts` → `Claimable Balance`
  - `Bootstrap.totalDepositAmounts - Bootstrap.withdrawableAmounts` → `Delegated Balance` (total across all validators)
  - `Bootstrap.delegations[user][validator][token]` → Specific delegation to a validator
  - `Pending Undelegated` is always 0 (no delayed unbonding)

**Post-Bootstrap Phase** (After Imuachain Launch):

- Operations involve cross-chain messaging via LayerZero
- Imuachain coordinates all staking operations
- Full unbonding support (instant and delayed)
- Cross-chain reward distribution
- **Balance Mapping**:
  - Imuachain tracks all balances directly
  - `Total Deposited` accounts for slashing penalties
  - `Pending Undelegated` can be non-zero during delayed unbonding

## 2. Staking Operations & State Changes

### 2.1 Deposit

#### Bootstrap Phase

- **Action**: User sends tokens to Bootstrap contract without delegating
- **State Change**:
  - ↑ Total Deposited
  - ↑ Claimable Balance
  - ↓ Wallet Balance (on Client Chain)
- **Bootstrap Contract Mapping**:
  - `totalDepositAmounts[user][token]` → Total Deposited
  - `withdrawableAmounts[user][token]` → Claimable Balance
  - `depositsByToken[token]` → Token-level total deposits
- **Contract Logic**:
  ```solidity
  function _deposit(address depositor, address token, uint256 amount) internal {
      IVault vault = _getVault(token);
      vault.deposit(depositor, amount);

      if (!isDepositor[depositor]) {
          isDepositor[depositor] = true;
          depositors.push(depositor);
      }

      totalDepositAmounts[depositor][token] += amount;
      withdrawableAmounts[depositor][token] += amount;
      depositsByToken[token] += amount;
  }
  ```

#### Post-Bootstrap Phase

- **Action**: User sends tokens to ClientChainGateway contract
- **State Change**: Same as bootstrap phase, but with cross-chain messaging to Imuachain
- **User Experience**: Tokens are locked in vault contracts but not generating yield

### 2.2 Stake (Deposit + Delegate)

#### Bootstrap Phase

- **Action**: User deposits tokens AND delegates to an operator in one operation
- **State Change on Success**:
  - ↑ Total Deposited
  - ↑ Delegated Balance
  - ↓ Wallet Balance (on Client Chain)
  - Claimable Balance unchanged (deposit increases it, but delegation immediately consumes it)
- **State Change on Failure**:
  - ↑ Total Deposited (deposit succeeds)
  - ↑ Claimable Balance (deposit succeeds, but delegation fails)
  - ↓ Wallet Balance (on Client Chain)
  - Delegated Balance unchanged
- **Bootstrap Contract Mapping**:
  - `totalDepositAmounts[user][token]` → Total Deposited
  - `withdrawableAmounts[user][token]` → Claimable Balance
  - `delegations[user][validator][token]` → Specific delegation to this validator
  - `delegationsByValidator[validator][token]` → Validator's total delegations
- **Contract Logic**:
  ```solidity
  function depositThenDelegateTo(address token, uint256 amount, string calldata validator)
      external payable beforeLocked whenNotPaused {
      _deposit(msg.sender, token, amount);
      _delegateTo(msg.sender, validator, token, amount);
  }
  ```

#### Post-Bootstrap Phase

- **State Change**: Same as bootstrap phase, but with cross-chain messaging to Imuachain
- **User Experience**: Tokens begin generating yield immediately

### 2.3 Delegate

#### Bootstrap Phase

- **Action**: User delegates tokens from claimable balance to an operator
- **State Change**:
  - ↑ Delegated Balance
  - ↓ Claimable Balance
  - Total Deposited unchanged
- **Bootstrap Contract Mapping**:
  - `delegations[user][validator][token]` → Specific delegation to this validator
  - `delegationsByValidator[validator][token]` → Validator's total delegations
  - `withdrawableAmounts[user][token]` → Claimable Balance
- **Contract Logic**:
  ```solidity
  function _delegateTo(address user, string calldata validator, address token, uint256 amount) internal {
      uint256 withdrawable = withdrawableAmounts[user][token];
      if (withdrawable < amount) {
          revert Errors.BootstrapInsufficientWithdrawableBalance();
      }

      if (delegations[user][validator][token] == 0) {
          stakerToTokenToValidators[user][token].push(validator);
      }
      delegations[user][validator][token] += amount;
      delegationsByValidator[validator][token] += amount;
      withdrawableAmounts[user][token] -= amount;
  }
  ```

#### Post-Bootstrap Phase

- **State Change**: Same as bootstrap phase, but with cross-chain messaging to Imuachain
- **User Experience**: Previously deposited tokens begin generating yield

### 2.4 Undelegate

#### Bootstrap Phase

- **Action**: User requests to undelegate tokens from an operator
- **State Change**:
  - ↓ Delegated Balance
  - ↑ Claimable Balance
  - **Important**: All unbondings are instant during bootstrap
- **Bootstrap Contract Mapping**:
  - `delegations[user][validator][token]` → Specific delegation to this validator
  - `delegationsByValidator[validator][token]` → Validator's total delegations
  - `withdrawableAmounts[user][token]` → Claimable Balance
- **Contract Logic**:

  ```solidity
  function undelegateFrom(string calldata validator, address token, uint256 amount, bool instantUnbond)
      external payable beforeLocked whenNotPaused {
      if (!instantUnbond) {
          revert Errors.NotYetSupported(); // Only instant unbonding supported
      }
      _undelegateFrom(msg.sender, validator, token, amount);
    }

  function _undelegateFrom(address user, string calldata validator, address token, uint256 amount) internal {
      uint256 delegated = delegations[user][validator][token];
      if (delegated < amount) {
          revert Errors.BootstrapInsufficientDelegatedBalance();
      }

      delegations[user][validator][token] -= amount;
      delegationsByValidator[validator][token] -= amount;
      withdrawableAmounts[user][token] += amount; // Immediate return
  }
  ```

#### Post-Bootstrap Phase

- **State Change Options**:
  - **Instant Unbonding**: Same as bootstrap phase
  - **Delayed Unbonding**: Tokens go through unbonding period before becoming claimable

### 2.5 Claim Principal

#### Bootstrap Phase

- **Action**: User requests to unlock tokens from Bootstrap contract custody
- **State Change**:
  - ↓ Total Deposited
  - ↓ Claimable Balance
  - ↑ Client Chain Withdrawable Balance (in vault contracts)
- **Bootstrap Contract Mapping**:
  - `totalDepositAmounts[user][token]` → Total Deposited
  - `withdrawableAmounts[user][token]` → Claimable Balance
  - `depositsByToken[token]` → Token-level total deposits
- **Contract Logic**:
  ```solidity
  function _claim(address user, address token, uint256 amount) internal {
      uint256 deposited = totalDepositAmounts[user][token];
      if (deposited < amount) {
          revert Errors.BootstrapInsufficientDepositedBalance();
      }
      uint256 withdrawable = withdrawableAmounts[user][token];
      if (withdrawable < amount) {
          revert Errors.BootstrapInsufficientWithdrawableBalance();
      }

      totalDepositAmounts[user][token] -= amount;
      withdrawableAmounts[user][token] -= amount;
      depositsByToken[token] -= amount;

      vault.unlockPrincipal(user, amount);
  }
  ```

#### Post-Bootstrap Phase

- **State Change**: Same as bootstrap phase, but with cross-chain messaging to Imuachain
- **User Experience**: Tokens no longer tracked by Imuachain (can't be delegated)

### 2.6 Withdraw

#### Bootstrap Phase

- **Action**: User withdraws unlocked tokens from vault contracts to their wallet
- **State Change**:
  - ↓ Client Chain Withdrawable Balance (in vault contracts)
  - ↑ Wallet Balance (on Client Chain)
- **Bootstrap Contract Mapping**:
  - No changes to Bootstrap contract state
  - Vault contract manages client chain withdrawable balance
- **Contract Logic**:
  ```solidity
  function withdrawPrincipal(address token, uint256 amount, address recipient)
      external override beforeLocked whenNotPaused {
      IVault vault = _getVault(token);
      vault.withdraw(msg.sender, recipient, amount);
  }
  ```

#### Post-Bootstrap Phase

- **State Change**: Same as bootstrap phase
- **User Experience**: Tokens transferred from vault contracts to user's wallet

## 3. Bootstrap Phase Specific Operations

### 3.1 Native ETH Staking

#### Create Capsule

- **Action**: User creates an ImuaCapsule for beacon chain staking
- **State Change**:
  - ↑ `ownerToCapsule[msg.sender]` (capsule address)
- **Contract Logic**:
  ```solidity
  function createImuaCapsule() public whenNotPaused nativeRestakingEnabled returns (address) {
      if (address(ownerToCapsule[msg.sender]) != address(0)) {
          revert Errors.NativeRestakingControllerCapsuleAlreadyCreated();
      }
      // Create capsule via Create2 deployment
      // Initialize capsule with contract, owner, and beacon oracle
  }
  ```

#### Stake ETH

- **Action**: User stakes 32 ETH to beacon chain via capsule
- **State Change**: No immediate state change (beacon chain operation)
- **Contract Logic**: Calls `ETH_POS.deposit` with capsule withdrawal credentials

#### Verify Native Stake

- **Action**: User verifies beacon chain deposit proof
- **State Change**:
  - ↑ `totalDepositAmounts[user][VIRTUAL_NST_ADDRESS]` (native stake amount)
  - ↑ `withdrawableAmounts[user][VIRTUAL_NST_ADDRESS]` (available for delegation)
  - ↑ `depositsByToken[VIRTUAL_NST_ADDRESS]` (total native stake)
  - ↑ `stakerToPubkeyIDs[user]` (validator pubkey ID)

### 3.2 Validator Registration

#### Register Validator

- **Action**: Validator registers with commission settings and consensus key
- **State Change**:
  - ↑ `ethToImAddress[msg.sender]` (Ethereum to Imua address mapping)
  - ↑ `validators[validatorAddress]` (validator information)
  - ↑ `registeredValidators` (list of registered validators)
  - ↑ `consensusPublicKeyInUse[consensusKey]` (key uniqueness tracking)
  - ↑ `validatorNameInUse[name]` (name uniqueness tracking)

#### Update Commission Rate

- **Action**: Validator updates commission rate (allowed only once)
- **State Change**:
  - ↑ `validators[validatorAddress].commission.rate` (new rate)
  - ↑ `commissionEdited[validatorAddress]` (mark as edited)

#### Replace Consensus Key

- **Action**: Validator replaces consensus public key
- **State Change**:
  - ↓ `consensusPublicKeyInUse[oldKey]` (mark old key as unused)
  - ↑ `consensusPublicKeyInUse[newKey]` (mark new key as used)
  - ↑ `validators[ethToImAddress[msg.sender]].consensusPublicKey` (new key)

## 4. Bootstrap Contract State Variable Mapping

### 4.1 Balance Concept Mapping

The Bootstrap contract uses different state variable names that map to the standard balance concepts:

| Bootstrap Contract Variable                 | Standard Balance Concept | Description                                                              |
| ------------------------------------------- | ------------------------ | ------------------------------------------------------------------------ |
| `totalDepositAmounts[user][token]`          | **Total Deposited**      | Cumulative deposits minus claims, represents historical net position     |
| `withdrawableAmounts[user][token]`          | **Claimable Balance**    | Tokens available for delegation or claim operations (Bootstrap tracking) |
| `totalDepositAmounts - withdrawableAmounts` | **Delegated Balance**    | Total tokens delegated across all validators for a token                 |
| `delegations[user][validator][token]`       | **Specific Delegation**  | Tokens delegated to a specific validator                                 |
| `depositsByToken[token]`                    | Token-level total        | Total deposits across all users for a specific token                     |

**Important Distinction**:

- **Bootstrap.withdrawableAmounts**: Tracks claimable balance for delegation/claim operations (like Imuachain's claimable balance)
- **Client Chain Vault Withdrawable Balance**: Always means the same thing - unlocked tokens in vault contracts that can be withdrawn to user wallets (regardless of bootstrap phase)

### 4.2 Balance Relationship During Bootstrap

During the bootstrap phase, the relationship is simplified:

```
Total Deposited = Claimable + Delegated
```

**Calculating Delegated Balance**:

- **Individual Delegation**: `delegations[user][validator][token]` (specific validator)
- **Total Delegated**: `totalDepositAmounts[user][token] - withdrawableAmounts[user][token]`
- **Why this works**: No slashing or pending undelegated during bootstrap

**Why no Pending Undelegated?**

- All undelegations are instant during bootstrap
- No delayed unbonding period exists
- Tokens immediately return to Claimable Balance

**Why no slashing?**

- No delayed unbonding means no slashing penalties
- All operations are local and immediate
- No cross-chain coordination delays

### 4.3 State Variable Access

The Bootstrap contract provides these key state variables for balance queries:

```solidity
// User's total deposited amount for a token
totalDepositAmounts[user][token]

// User's claimable (withdrawable) amount for a token
withdrawableAmounts[user][token]

// User's delegation to a specific validator for a token
delegations[user][validator][token]

// Total deposits for a specific token across all users
depositsByToken[token]

// Calculate total delegated balance (across all validators)
totalDepositAmounts[user][token] - withdrawableAmounts[user][token]
```

### 4.4 Two-Step Withdrawal Process

The withdrawal process involves two distinct steps and two different types of withdrawable balances:

#### Step 1: Claim (Bootstrap → Vault)

- **Action**: User requests to unlock tokens from Bootstrap contract custody
- **State Change**:
  - ↓ Bootstrap Claimable Balance (`withdrawableAmounts`)
  - ↑ Client Chain Vault Withdrawable Balance
- **Purpose**: Transfer tokens from Bootstrap tracking to vault contract custody

#### Step 2: Withdraw (Vault → Wallet)

- **Action**: User withdraws unlocked tokens from vault contracts to their wallet
- **State Change**:
  - ↓ Client Chain Vault Withdrawable Balance
  - ↑ User Wallet Balance
- **Purpose**: Transfer tokens from vault contract to user's wallet

**Key Insight**:

- **Bootstrap.withdrawableAmounts** = Imuachain's claimable balance concept
- **Vault Withdrawable Balance** = Client chain's unlocked token balance (same concept regardless of bootstrap phase)
- These are separate tracking systems that work together for the complete withdrawal flow

## 5. Bootstrap Phase Constraints

### 5.1 Timeline Restrictions

- **`beforeLocked` modifier**: All operations restricted before lock period
- **Lock Period**: `block.timestamp >= spawnTime - offsetDuration`
- **Spawn Time**: When Imuachain will be launched
- **Offset Duration**: Lock period before spawn time

### 5.2 Operation Restrictions

- **No cross-chain messaging**: All operations are local
- **Validator registration only**: New validators can only register during bootstrap
- **Commission editing limits**: Validators can only edit commission rates once
- **Instant unbonding only**: No delayed unbonding support during bootstrap

### 5.3 State Tracking

- **Bootstrap contract acts as ledger**: Records all staking positions
- **Vault integration**: Manages actual token custody
- **Genesis data preparation**: All data collected for Imuachain launch

## 6. Chain-Specific Considerations

### 3.1 Smart Contract Chains (ETH, EVM-compatible)

- Two-step withdrawal process required:
  1. Claim (request permission from Imua Chain)
  2. Withdraw (transfer from contract to wallet)
- All balance tracking and custody managed through contracts

### 3.2 Non-Smart Contract Chains (BTC, XRP)

- Single-step withdrawal process:
  - Withdraw operation handles both claim and transfer
- Cross-chain messaging managed through precompiles and specialized gateways

## 7. State Flow Visualization

### 7.1 Bootstrap Phase Flow

```
User Wallet ──(Deposit)──> Bootstrap Contract ──(Delegate)──> Delegated State
                                │                                    │
                                │                                    │
                                └───(Undelegate)──> Withdrawable State
                                        (Instant, no unbonding period)
```

### 7.2 Post-Bootstrap Phase Flow

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

### 7.3 Instant vs Delayed Unbonding Paths

- **Delayed Path** (Imuachain only): Delegated Balance → Pending Undelegated → Claimable Balance
- **Instant Path** (Imuachain only): Delegated Balance → Claimable Balance (with slashing penalty)

**Note**: Unbonding operations only affect Imuachain state. To access tokens after unbonding, users must perform separate Claim and Withdraw operations on the client chain.

## 8. Important Principles

1. **Deposit Resilience**: Deposits must always succeed when properly validated
2. **Delegation Flexibility**: Delegation can occur at time of deposit or later
3. **Unbonding Security**:
   - Delayed unbonding: Undelegated tokens must go through unbonding period
   - Instant unbonding: Tokens bypass unbonding period for immediate availability
4. **Cross-Chain Custody**: Assets are physically held on client chain but accounted for on Imua Chain
5. **Withdrawal Safety**: Two-step process ensures proper authorization and security
6. **Unbonding Choice**: Users can choose between instant (higher fee, immediate) and delayed (lower fee, secure) unbonding

## 9. Instant Unbonding Considerations

### 9.1 When to Use Instant Unbonding

- **Immediate liquidity needs**: When tokens are needed right away
- **Market timing**: To capitalize on favorable market conditions
- **Emergency situations**: When quick access to funds is critical

### 9.2 When to Use Delayed Unbonding

- **Cost optimization**: No extra fee for patient users
- **Security preference**: Traditional unbonding period for added security
- **Long-term planning**: When immediate access isn't required

### 9.3 Technical Implementation

- **Fee structure**:
  - Delayed unbonding: No additional fee (standard processing)
  - Instant unbonding: Higher fees to compensate for immediate processing
- **State bypass**: Tokens move directly from delegated to claimable state on Imuachain
- **Slashing penalty**: A percentage of the unbonding amount is deducted as penalty for bypassing the unbonding period
- **Immediate availability**: Tokens can be immediately delegated to other operators OR claimed to unlock them in client chain vaults, without waiting for unbonding period
- **Imuachain-only processing**: No client chain state changes involved in the instant unbonding process

## 10. Technical Implementation Differences

### 10.1 Bootstrap Contract

- **Storage**: Maintains all staking state locally
- **Vault Integration**: Direct interaction with vault contracts
- **No Cross-Chain**: Pure local operations
- **Genesis Preparation**: Data collection for Imuachain launch

### 10.2 ClientChainGateway

- **Storage**: Inherits all bootstrap state
- **Cross-Chain Messaging**: LayerZero integration
- **Imuachain Coordination**: All operations coordinated with Imuachain
- **Enhanced Functionality**: Full staking network capabilities

This model provides users with a seamless transition from bootstrap phase to full network operation while maintaining all their staking positions and preferences.
