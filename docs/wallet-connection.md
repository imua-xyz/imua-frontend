# Wallet Connection Specifications

## Overview

Wallet connection is the foundational step for all staking operations. The system uses a **two-phase approach**:

1. **Detection Phase**: Check wallet connection status via `WalletConnector` context
2. **Connection Phase**: Guide users through wallet connection via modal

## Core Architecture

### Wallet Connector Context Provider

- Provides unified wallet state for all tokens
- Exposes `isReadyForStaking`, `issues`, and wallet states
- Handles different wallet types (EVM, XRP, Bitcoin) uniformly

### Wallet Connection Modal

- Context-aware UI based on token requirements
- Handles both single-wallet (EVM) and dual-wallet (XRP/Bitcoin) scenarios
- Provides guided connection flow with issue-specific resolvers

## Wallet Connection States & Issues

### 1. Installation Issues

```typescript
needsInstallNative?: IssueWithResolver
```

- **Trigger**: Native wallet not installed
- **UI**: Install button with `connector.installUrl`
- **Scope**: Only for XRP (GemWallet) - EVM and Bitcoin wallets handled by their respective modals
- **Action**: Open installation URL in new tab

### 2. Native Wallet Connection Issues

```typescript
needsConnectNative?: IssueWithResolver
```

- **Trigger**: Native wallet installed but not connected, or installation status unknown
- **UI**: Connect button
- **Action**: Execute resolver closure
  - **EVM**: Opens RainbowKit modal (handles installation detection)
  - **XRP**: Calls GemWallet connect API
  - **Bitcoin**: Opens AppKit modal (handles installation detection)

### 3. Native Network Switching Issues

```typescript
needsSwitchNative?: IssueWithResolver
```

- **Trigger**: Native wallet connected but wrong network
- **UI**: Switch network button OR manual action required notice
- **Action**: Execute resolver closure OR manual user action
  - **EVM**: Calls Wagmi `switchChain` (has resolver)
  - **XRP**: Manual switch required (no programmatic support, no resolver)
  - **Bitcoin**: Calls AppKit switch network hook (has resolver)

### 4. Binding EVM Wallet Connection Issues

```typescript
needsConnectBindingEVM?: IssueWithResolver
```

- **Trigger**: Network requires EVM binding but EVM wallet not connected
- **UI**: Connect EVM wallet button
- **Action**: Execute resolver to open RainbowKit modal
- **Scope**: Only for XRP and Bitcoin networks

### 5. Binding EVM Network Switching Issues

```typescript
needsSwitchBindingEVM?: IssueWithResolver
```

- **Trigger**: EVM wallet connected but wrong network
- **UI**: Switch EVM network button OR manual action required notice
- **Action**: Execute resolver to switch to correct network OR manual user action
- **Scope**: Only for XRP and Bitcoin networks
- **Note**: Some wallets may not support programmatic network switching

### 6. Address Matching Issues

```typescript
needsMatchingAddress?: IssueWithResolver
```

- **Trigger**: Both wallets connected but EVM address doesn't match bound address
- **UI**: Display expected bound address + connect button OR manual action required notice
- **Action**: User must connect correct EVM wallet OR manually switch wallet address
- **Scope**: Only for XRP and Bitcoin networks
- **Note**: Requires user to switch wallet address in their EVM wallet extension/mobile app

## Network-Specific Requirements

### EVM Networks (exoETH, wstETH)

- **Single Wallet**: Only EVM wallet required
- **Issues**: `needsConnectNative`, `needsSwitchNative`
- **UI**: RainbowKit ConnectButton

### XRP Network

- **Dual Wallet**: XRP wallet + EVM wallet (binding)
- **Issues**: All 6 issue types possible
- **UI**: GemWallet connection + RainbowKit for EVM binding

### Bitcoin Network

- **Dual Wallet**: Bitcoin wallet + EVM wallet (binding)
- **Issues**: All 6 issue types possible
- **UI**: AppKit connection + RainbowKit for EVM binding

## Connection Flow States

### Phase 1: Detection

```typescript
// Check if ready for staking
if (walletConnector.isReadyForStaking) {
  // Show staking interface
} else {
  // Show wallet connection button
}
```

### Phase 2: Connection Modal

```typescript
// Modal shows based on issues
if (issues?.needsInstallNative) {
  // Show install button
} else if (issues?.needsConnectNative) {
  // Show connect button
} else if (issues?.needsSwitchNative) {
  // Show switch button
} else if (issues?.needsConnectBindingEVM) {
  // Show EVM connect button
} else if (issues?.needsSwitchBindingEVM) {
  // Show EVM switch button
} else if (issues?.needsMatchingAddress) {
  // Show address mismatch warning
}
```

## UI Components & States

### Progress Indicator

- Shows connection progress for dual-wallet scenarios
- Displays "X/2" progress (native + EVM)
- Updates in real-time as issues resolve

### Status Badges

- **Connected**: Green badge with checkmark
- **Wrong Network**: Yellow badge with warning
- **Wrong Address**: Yellow badge with warning
- **Not Connected**: No badge

### Action Buttons

- **Install**: Opens installation URL
- **Connect**: Executes connection resolver
- **Switch**: Executes network switch resolver (if available)
- **Retry**: Reopens modal after connection

### Manual Action Notices

- **Network Switching**: Shows when programmatic switching is not available
- **Address Switching**: Shows when user needs to switch wallet address manually
- **Visual Design**: Amber/rose colored borders with clear instructions
- **User Guidance**: Step-by-step instructions for manual resolution

## Modal Handling

### Bitcoin Network Connection

- **Modal Management**: Close wallet connection modal before opening AppKit modal
- **Reason**: AppKit modal would be hidden behind wallet connection modal
- **Flow**: Close → Open AppKit → Reopen wallet connection modal after completion
- **Timeout**: 35-second fallback to ensure modal reopens

### XRP Network Connection

- **Modal Management**: No additional modal required
- **Reason**: GemWallet uses direct API calls, no external modal
- **Flow**: Direct connection via API

### EVM Network Connection

- **Modal Management**: No modal closing required
- **Reason**: RainbowKit modal appears above wallet connection modal
- **Flow**: RainbowKit modal opens on top

## Special Cases

### Bootstrap Phase Handling

- **Implementation**: Handled within corresponding resolvers
- **Logic**: Resolvers determine correct network based on bootstrap status
- **No Special UI**: Modal shows standard connection flow

### Wallet Type Compatibility

- **EOA Wallets Only**: Contract wallets (multisig, account abstraction) not supported
- **Reason**: Different control authorities across networks may cause issues
- **Bootstrap Phase**: Special warning for binding EVM wallet during bootstrap
- **Critical**: Contract wallets may not be controlled by users in future Imuachain
- **Verification**: Cannot verify user authorization on Imuachain during bootstrap phase

### Future Imuachain Connection Warning

- **Bootstrap Phase**: EVM wallet will be permanently bound to native address
- **Critical**: Same EVM wallet must be used for all future operations

### Connection Timeout Handling

- **35 Second Timeout**: Ensures modal reopens even if external wallet modals don't fire events
- **Fallback Mechanism**: Prevents users from getting stuck in connection state

### Retry Handling

- **No Dedicated Retry**: Not needed as long as wallet connector indicates readiness
- **Manual Guidance**: Users can manually retry with correct guidance from issues
- **State-Driven**: UI automatically updates based on wallet connector state

## Error Handling

### Connection Failures

- **User Rejection**: Handle wallet connection rejection gracefully
- **Network Errors**: Display appropriate error messages
- **Timeout Errors**: Provide retry options

### State Recovery

- **Modal Reopening**: Always reopen modal after external wallet interactions
- **State Synchronization**: Ensure UI reflects actual wallet state
- **Progress Tracking**: Update progress indicators in real-time

## Implementation Notes

### Performance Optimizations

- **Event-Driven Updates**: Use GemWallet events instead of polling
- **Smart Caching**: Only check installation when status unknown
- **Minimal API Calls**: Reduce unnecessary network requests

### User Experience

- **Clear Guidance**: Provide step-by-step instructions
- **Visual Feedback**: Show connection progress and status
- **Error Recovery**: Easy retry mechanisms for failed connections

### Security Considerations

- **Address Validation**: Verify wallet addresses before binding
- **Network Validation**: Ensure correct network connections
- **Binding Verification**: Confirm address binding before allowing operations

## Future Enhancements

### Recommended Additions

1. **Loading States**: Add loading indicators for async operations
2. **Wallet Validation**: Add wallet type validation (EOA vs Contract)
3. **Network Validation**: Add network compatibility checks
4. **Address Validation**: Add address format validation
5. **Connection Analytics**: Track connection success rates and error patterns

### Monitoring & Analytics

- **Connection Success Rates**: Track successful connection attempts
- **Error Patterns**: Monitor common failure points
- **User Flow Analysis**: Understand connection journey bottlenecks
