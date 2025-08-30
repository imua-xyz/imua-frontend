# Imua Protocol Bootstrap

## Overview

The Imua Protocol bootstrap is a critical phase that occurs before Imuachain's launch, where assets from multiple blockchain networks are collected and locked to generate the genesis state. This process ensures that Imuachain starts with a diverse, multi-chain asset base and an established validator set.

## Bootstrap Architecture

### Core Concept

Before Imuachain is spawned, the protocol operates in "bootstrap mode" where:

- **Validators register** on client chains (primarily Ethereum)
- **Users deposit and delegate** assets to registered validators
- **All operations are local** (no cross-chain messaging)
- **Bootstrap contracts act as ledgers** recording all staking positions
- **Genesis file generation** occurs from collected data

### Multi-Chain Asset Collection

The bootstrap process collects assets from multiple blockchain ecosystems:

1. **Ethereum/EVM Chains**: Bootstrap contract with full smart contract functionality
2. **Bitcoin**: Direct transfers to vault addresses with encoded delegation data
3. **XRPL**: Direct transfers to vault addresses with encoded delegation data

## Bootstrap Contract (Ethereum)

### Purpose and Functionality

The `Bootstrap` contract serves as the primary coordination point for the bootstrap phase:

- **Validator Registration**: Accepts validator registrations with commission settings
- **Asset Collection**: Manages LST deposits and delegations
- **Native Staking**: Handles ETH staking setup for beacon chain validators
- **Genesis Data Storage**: Records all information needed for Imuachain genesis

### Key Functions

#### Validator Management

```solidity
function registerValidator(
    string calldata validatorAddress,
    string calldata name,
    Commission memory commission,
    bytes32 consensusPublicKey
) external

function replaceKey(bytes32 newKey) external
function updateRate(uint256 newRate) external
```

#### Staking Operations

```solidity
function deposit(address token, uint256 amount) external
function depositThenDelegateTo(address token, uint256 amount, string calldata validator) external
function delegateTo(string calldata validator, address token, uint256 amount) external
function undelegateFrom(string calldata validator, address token, uint256 amount, bool instantUnbond) external
```

#### Native ETH Staking

```solidity
function createImuaCapsule() external returns (address)
function stake(bytes calldata pubkey, bytes calldata signature, bytes32 depositDataRoot) external payable
function verifyAndDepositNativeStake(bytes32[] calldata validatorContainer, BeaconChainProofs.ValidatorContainerProof calldata proof) external
```

### Bootstrap Phase Constraints

During the bootstrap phase, several restrictions apply:

- **`beforeLocked` modifier**: Operations are restricted before the lock period
- **No cross-chain messaging**: All operations are local to the client chain
- **Validator registration only**: New validators can only register during bootstrap
- **Commission editing limits**: Validators can only edit commission rates once

### Timeline Management

```solidity
function isLocked() public view returns (bool)
function setSpawnTime(uint256 spawnTime_) external onlyOwner beforeLocked
function setOffsetDuration(uint256 offsetDuration_) external onlyOwner beforeLocked
```

- **Spawn Time**: When Imuachain will be launched
- **Offset Duration**: Lock period before spawn time
- **Lock Period**: When operations become restricted

## Non-EVM Chain Bootstrap

### Bitcoin Bootstrap

Users transfer BTC to specified vault addresses with encoded delegation data:

```
Vault Address: [Bitcoin address]
OP_RETURN Output: [Encoded Imua address + validator address]
```

### XRPL Bootstrap

Users transfer XRP to specified vault addresses with encoded delegation data:

```
Vault Address: [XRPL address]
Memo: [Encoded Imua address + validator address]
```

### Data Encoding Format

The delegation data typically includes:

- **Imua Address**: The user's Imuachain address (Bech32 format)
- **Validator Address**: The validator's Imuachain address

**Note**: The amount is determined by the transaction value, and the timestamp is recorded when the transaction is processed. The vault address serves as the destination for the transfer.

## Bootstrap to ClientChainGateway Transition

### Upgrade Process

When Imuachain is ready to launch:

1. **Mark as Bootstrapped**: Message sent from Imuachain to bootstrap contract
2. **In-Place Upgrade**: Bootstrap contract upgraded to ClientChainGateway
3. **Storage Preservation**: All bootstrap data and state maintained
4. **Functionality Enhancement**: Cross-chain messaging capabilities added

### Contract Upgrade Implementation

```solidity
function markBootstrapped() public onlyCalledFromThis whenNotPaused {
    if (block.timestamp < spawnTime) {
        emit BootstrapNotTimeYet();
        return;
    }

    try ICustomProxyAdmin(customProxyAdmin).changeImplementation(
        ITransparentUpgradeableProxy(address(this)),
        clientChainGatewayLogic,
        clientChainInitializationData
    ) {
        emit Bootstrapped();
    } catch {
        emit BootstrapUpgradeFailed();
    }
}
```

### Post-Upgrade State

After the upgrade:

- **Same Proxy Address**: Contract address remains unchanged
- **Enhanced Functionality**: Cross-chain messaging via LayerZero
- **Bootstrap Data**: All deposits, delegations, and validator registrations preserved
- **New Operations**: Cross-chain staking operations become available

## Frontend Integration

### Bootstrap Phase Detection

The frontend must detect whether the contract is in bootstrap mode:

```typescript
const { data: bootstrapStatus } = useQuery({
  queryKey: ["bootstrapStatus"],
  queryFn: async () => {
    const [bootstrapped, spawnTime, offsetDuration] = await Promise.all([
      contract.read.bootstrapped([]),
      contract.read.spawnTime([]),
      contract.read.offsetDuration([]),
    ]);

    return {
      isBootstrapped: bootstrapped,
      isLocked: block.timestamp >= spawnTime - offsetDuration,
      spawnTime,
      offsetDuration,
      phase: bootstrapped ? "post-bootstrap" : "bootstrap",
    };
  },
});
```

### Staking Position Queries

During bootstrap phase, query the Bootstrap contract for staking positions:

```typescript
// Query user's staking positions
const stakingPositions = await Promise.all([
  contract.read.totalDepositAmounts([userAddress, tokenAddress]),
  contract.read.withdrawableAmounts([userAddress, tokenAddress]),
  contract.read.delegations([userAddress, validatorAddress, tokenAddress]),
]);
```

### Operation Mode Switching

The frontend must handle both operation modes:

```typescript
const handleStakingOperation = async (operation, params) => {
  if (bootstrapStatus.isBootstrapped) {
    // Cross-chain operation via ClientChainGateway
    return await handleCrossChainOperation(operation, params);
  } else {
    // Local operation via Bootstrap contract
    return await handleLocalOperation(operation, params);
  }
};
```

## Genesis Generation

### Data Collection

When the bootstrap deadline is reached:

1. **Ethereum Data**: Read from Bootstrap contract storage
2. **Bitcoin Data**: Scan vault address transaction history
3. **XRPL Data**: Scan vault address transaction history

### Genesis File Structure

The genesis file includes:

```json
{
  "validators": [
    {
      "address": "imua1...",
      "consensus_key": "0x...",
      "commission": {
        "rate": "10000000000000000",
        "max_rate": "200000000000000000",
        "max_change_rate": "10000000000000000"
      }
    }
  ],
  "delegations": [
    {
      "delegator": "imua1...",
      "validator": "imua1...",
      "amount": "1000000000000000000",
      "token": "0x..."
    }
  ],
  "total_supply": {
    "ethereum": "1000000000000000000000",
    "bitcoin": "100000000",
    "xrp": "100000000000"
  }
}
```

## Important Considerations

### Security

- **Validator Registration**: Only during bootstrap phase
- **Commission Limits**: Maximum rates enforced
- **Timeline Enforcement**: Strict adherence to spawn time
- **Upgrade Authorization**: Only Imuachain can trigger bootstrap completion

### User Experience

- **Seamless Transition**: Users don't need to re-approve or re-stake
- **Same Interface**: Staking operations maintain consistent UI
- **Status Visibility**: Clear indication of bootstrap phase vs. active network
- **Operation Feedback**: Different messaging for local vs. cross-chain operations

### Technical Implementation

- **Proxy Pattern**: Enables in-place upgrades
- **Storage Compatibility**: Bootstrap and ClientChainGateway share storage layout
- **Function Selectors**: Consistent interface across both contracts
- **State Preservation**: All user positions maintained during upgrade

## Summary

The Imua Protocol bootstrap represents a sophisticated approach to launching a multi-chain staking network. By collecting assets from Ethereum, Bitcoin, and XRPL before launch and then seamlessly transitioning to cross-chain operations, the protocol ensures:

1. **Diverse Asset Base**: Multiple blockchain ecosystems represented
2. **Established Validator Set**: Pre-vetted validators with commission structures
3. **User Participation**: Early adopters can stake before network launch
4. **Seamless Transition**: No disruption to user positions during upgrade
5. **Cross-Chain Capability**: Full functionality after bootstrap completion

This bootstrap mechanism enables Imuachain to launch with a robust foundation of assets and participants, while maintaining the security and functionality expected from a mature staking network.