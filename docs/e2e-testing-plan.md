# dApp E2E Testing Plan

## Overview

Automated end-to-end testing for the Imua Protocol frontend, covering wallet connection, staking operations, and dashboard verification across all supported chains (EVM, XRP, Bitcoin) in both bootstrap and post-bootstrap phases.

## Architecture

```
Phase 1 (EVM):     Synpress + MetaMask extension + Anvil fork
Phase 2 (XRP):     Playwright + SDK-level mock (xrpl library)
Phase 3 (Bitcoin):  Playwright + SDK-level mock (bitcoinjs-lib)
```

All phases share a common test harness built on Playwright. Phase 1 uses real MetaMask via Synpress; Phases 2 and 3 inject mock wallet connectors that sign transactions programmatically, bypassing browser extensions while still exercising real UI flows and contract interactions.

### Test Environment

| Component | Tool | Purpose |
|-----------|------|---------|
| Browser automation | Playwright | Page navigation, DOM interaction, assertions |
| EVM wallet | Synpress + MetaMask | Real extension-based wallet signing |
| EVM chain | Anvil (Foundry) | Local fork of Hoodi testnet, instant blocks |
| XRP wallet | SDK mock (`xrpl`) | Programmatic XRPL transaction signing |
| Bitcoin wallet | SDK mock (`bitcoinjs-lib`) | Programmatic PSBT signing |
| Contract state | Anvil snapshots | Revert between tests for isolation |
| Bootstrap toggle | Anvil `eth_call` override | Test both phases on same fork |

---

## Phase 1: EVM Staking (Synpress + MetaMask + Anvil)

### Scope

Covers imETH, wstETH, and nstHoodlETH via MetaMask on an Anvil-forked Hoodi testnet.

### Setup

- Anvil forks Hoodi at a known block
- Test wallet imported into MetaMask (known private key, pre-funded)
- Wallet auto-connected to `localhost:3000`
- Anvil snapshot taken after setup, reverted between tests

### Test Suites

#### 1.1 Wallet Connection

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | Connect MetaMask | Happy | Click "Connect" → select MetaMask → approve in extension | Wallet address shown in header, status = connected |
| 2 | Reject connection | Negative | Click "Connect" → select MetaMask → reject in extension | Modal remains, no wallet shown |
| 3 | Wrong network | Negative | Connect on mainnet instead of Hoodi | "Switch network" prompt appears |
| 4 | Switch network | Happy | Connect on wrong network → approve switch | Network switches, wallet ready |
| 5 | Disconnect wallet | Happy | Open dropdown → click Disconnect | Status = "Not Connected", positions hidden |
| 6 | Reconnect after disconnect | Happy | Disconnect → reconnect | Wallet restored, positions reload |

#### 1.2 LST Staking (imETH / wstETH)

##### 1.2.1 Deposit (Stake)

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | Stake with operator (bootstrap) | Happy | Select imETH → Stake tab → enter amount → select operator → confirm tx | Tx succeeds, balance updated, optimistic position shown |
| 2 | Stake without operator (post-bootstrap) | Happy | Select imETH → Stake tab → enter amount → confirm tx | Tx succeeds, deposit recorded |
| 3 | Stake with approval flow | Happy | First-time token → approve allowance → stake | Approval tx + stake tx both succeed |
| 4 | Stake zero amount | Negative | Enter "0" as amount | Button disabled, "Amount must be greater than 0" |
| 5 | Stake exceeds balance | Negative | Enter amount > wallet balance | "Amount exceeds balance" error |
| 6 | Stake below minimum | Negative | Enter amount < minimum | "Amount must be greater than {min}" |
| 7 | Reject approval tx | Negative | Approve allowance → reject in MetaMask | "Approval failed" error, no state change |
| 8 | Reject stake tx | Negative | Enter amount → reject in MetaMask | "Transaction rejected by user" error |
| 9 | Use MAX button | Happy | Click "MAX" → confirm | Amount field = full balance, tx succeeds |

##### 1.2.2 Delegate

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | Delegate to operator | Happy | Delegate tab → select operator → enter amount → confirm | Delegation succeeds, operator delegation updated |
| 2 | Delegate more than deposited | Negative | Enter amount > total deposited | Error or button disabled |
| 3 | Delegate zero | Negative | Enter "0" | Button disabled |
| 4 | No operators available | Negative | (edge case: empty operator list) | "No operators available" message |

##### 1.2.3 Undelegate

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | Undelegate (instant, bootstrap) | Happy | Undelegate tab → select operator → amount → instant unbond → confirm | Instant undelegation succeeds |
| 2 | Undelegate (non-instant, post-bootstrap) | Happy | Same, non-instant | Undelegation queued, pending period starts |
| 3 | Undelegate non-instant in bootstrap | Negative | Try non-instant in bootstrap | Not allowed / error |
| 4 | Undelegate more than delegated | Negative | Amount > delegated to operator | Error |

##### 1.2.4 Claim Principal

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | Claim after undelegation completes | Happy | Wait for claimable balance → Claim tab → confirm | Claim succeeds, claimable → withdrawable |
| 2 | Claim with no claimable balance | Negative | No claimable balance | Button disabled or zero shown |

##### 1.2.5 Withdraw Principal

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | Withdraw to self (no recipient) | Happy | Withdraw tab → enter amount → confirm | Withdraws to connected wallet address (fallback) |
| 2 | Withdraw to custom recipient | Happy | Enter amount + different 0x address → confirm | Withdraws to specified address |
| 3 | Withdraw more than withdrawable | Negative | Amount > withdrawable balance | Error |

#### 1.3 NST Staking (nstHoodlETH)

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | Create capsule | Happy | Select nstHoodlETH → Stake tab → Create Capsule | Capsule address returned |
| 2 | Capsule already exists | Negative | Create when capsule exists | Returns existing capsule address |
| 3 | NST stake (32 ETH) | Happy | Enter pubkey, signature, deposit data root → stake | Validator stake recorded |
| 4 | Verify and deposit | Happy | Provide validator container + proof → verify | Verification succeeds, deposit credited |
| 5 | Delegate NST | Happy | Delegate tab → select operator → amount → confirm | Delegation succeeds |
| 6 | Withdraw NST (post-bootstrap only) | Happy | Withdraw tab → amount → confirm | Withdrawal succeeds |
| 7 | Withdraw NST in bootstrap | Negative | Attempt withdraw in bootstrap | Tab not available / error |

#### 1.4 Cross-Chain Operation Progress

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | Simplex operation completes | Happy | Post-bootstrap deposit → observe progress | Steps: sending → confirming → relaying → complete |
| 2 | Operation shows tx hash | Happy | Complete any tx | Tx hash displayed, explorer link works |
| 3 | Keep window open warning | Happy | Start tx, observe progress | "Keep this window open" shown during processing |

#### 1.5 Bootstrap Phase Specifics

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | Tab visibility (bootstrap) | Happy | Check available tabs for each token | LST: stake, delegate, undelegate. NST: stake, verify, delegate, undelegate (no withdraw) |
| 2 | Tab visibility (post-bootstrap) | Happy | Switch to post-bootstrap, check tabs | All tabs including withdraw |
| 3 | Locked phase | Negative | Set timestamp to locked phase | Staking disabled, lock message shown |
| 4 | Relay fee = 0 in bootstrap | Happy | Bootstrap deposit | getQuote returns 0 |
| 5 | Relay fee > 0 post-bootstrap | Happy | Post-bootstrap deposit | getQuote returns nonzero fee |

---

## Phase 2: XRP Staking (SDK-Level Mock)

### Scope

Covers XRP staking via a mock GemWallet connector that uses the `xrpl` SDK for transaction signing.

### Mock Architecture

```typescript
// Mock replaces the real GemWallet store
// Signs XRPL transactions using xrpl.Wallet.fromSeed()
// Injects via NEXT_PUBLIC_E2E_MOCK_WALLETS=true

class MockXRPWalletConnector {
  private wallet: xrpl.Wallet;
  address: string;
  isConnected: boolean;

  connect(): void;           // Sets connected state
  disconnect(): void;
  signTransaction(tx): Promise<string>;  // Signs with xrpl.Wallet
  getBalance(): Promise<string>;         // Queries XRPL testnet
}
```

The mock connector implements the same interface as the real GemWallet store, so the UI code runs identically. The mock auto-approves all transactions.

### Test Suites

#### 2.1 XRP Wallet Connection

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | Connect XRP + EVM wallets | Happy | Connect mock XRP → connect EVM (MetaMask) | Both connected, binding status shown |
| 2 | XRP connected, EVM not | Negative | Connect only XRP | "Connect EVM wallet" prompt for binding |
| 3 | Wrong XRP network | Negative | Mock connected on mainnet | "Switch to Testnet" prompt |
| 4 | Disconnect XRP | Happy | Disconnect XRP wallet | XRP status = disconnected, positions hidden |

#### 2.2 Address Binding

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | First stake creates binding | Happy | Unbound XRP → stake → success | Provisional binding set, XRP ↔ EVM linked |
| 2 | Subsequent stake uses existing binding | Happy | Bound XRP → stake again | Same binding used, no new binding created |
| 3 | Conflicting binding (EVM bound to different XRP) | Negative | EVM already bound to XRP address B, try with XRP address A | "Conflicting binding" error shown |
| 4 | Binding persists across sessions | Happy | Bind → refresh page → check binding | Provisional binding restored from store |

#### 2.3 XRP Staking Operations

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | Stake XRP (bootstrap, with operator) | Happy | Select XRP → enter amount → select operator → confirm | XRPL Payment tx with memo (evmAddr + operator) |
| 2 | Stake XRP (post-bootstrap, no operator) | Happy | Same, post-bootstrap | XRPL Payment tx with memo (evmAddr only) |
| 3 | Stake below minimum (50M drops) | Negative | Enter < 50 XRP | "Amount must be greater than minimum" |
| 4 | Stake exceeds XRP balance | Negative | Enter > balance | "Amount exceeds balance" |
| 5 | Missing operator in bootstrap | Negative | Try to stake without selecting operator | "Operator required" error or button disabled |
| 6 | Delegate XRP (post-bootstrap) | Happy | Delegate tab → operator → amount → confirm | EVM tx via bound address |
| 7 | Undelegate XRP (post-bootstrap) | Happy | Undelegate tab → operator → amount → confirm | EVM tx succeeds |
| 8 | Withdraw XRP (post-bootstrap) | Happy | Withdraw tab → amount → confirm | EVM tx succeeds |
| 9 | Delegate in bootstrap | Negative | Attempt delegate | Tab not available |
| 10 | Withdraw in bootstrap | Negative | Attempt withdraw | Tab not available |

---

## Phase 3: Bitcoin Staking (SDK-Level Mock)

### Scope

Covers tBTC staking via a mock Bitcoin wallet connector that uses `bitcoinjs-lib` + `tiny-secp256k1` for PSBT signing.

### Mock Architecture

```typescript
// Mock replaces the Reown AppKit Bitcoin adapter
// Signs PSBTs using bitcoinjs-lib ECPair

class MockBitcoinWalletConnector {
  private keyPair: ECPairInterface;
  address: string;            // testnet address (tb1...)
  paymentAddress: string;
  isConnected: boolean;

  connect(): void;
  disconnect(): void;
  signPsbt(psbt): Promise<string>;    // Signs with keyPair
  getBalance(): Promise<number>;       // Queries Esplora API
  getUtxos(): Promise<UTXO[]>;         // Queries Esplora API
}
```

### Test Suites

#### 3.1 Bitcoin Wallet Connection

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | Connect Bitcoin + EVM wallets | Happy | Connect mock BTC → connect EVM | Both connected, binding status shown |
| 2 | Bitcoin connected, EVM not | Negative | Connect only BTC | "Connect EVM wallet" prompt |
| 3 | Wrong Bitcoin network (mainnet) | Negative | Mock with mainnet address | "Wrong network" error |
| 4 | Connection timeout (30s) | Negative | Simulate slow connect | Timeout error |

#### 3.2 Address Binding

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | First stake creates binding | Happy | Unbound BTC → stake → success | Provisional binding: BTC ↔ EVM |
| 2 | Conflicting binding | Negative | EVM bound to different BTC address | "Conflicting binding" error |

#### 3.3 Bitcoin Staking Operations

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | Stake BTC (bootstrap, with operator) | Happy | Select tBTC → amount → operator → confirm | PSBT with OP_RETURN (evmAddr + operator) sent |
| 2 | Stake BTC (post-bootstrap, no operator) | Happy | Same, post-bootstrap | PSBT with OP_RETURN (evmAddr only) |
| 3 | Stake below minimum (5000 sats) | Negative | Enter < 5000 sats equivalent | "Below minimum" error |
| 4 | Stake exceeds BTC balance | Negative | Enter > balance | "Exceeds balance" error |
| 5 | Insufficient UTXOs | Negative | Wallet has no spendable UTXOs | PSBT build failure |
| 6 | OP_RETURN exceeds 80 bytes | Negative | (edge case) | Build error |
| 7 | Wait for 6 confirmations | Happy | Stake → observe confirmation count | Progress shows confirmation tracking |
| 8 | Delegate BTC (post-bootstrap) | Happy | Delegate tab → operator → amount → confirm | EVM tx via bound address |
| 9 | Withdraw BTC (post-bootstrap) | Happy | Withdraw tab → amount → confirm | EVM tx succeeds |
| 10 | Delegate in bootstrap | Negative | Attempt delegate | Tab not available |

---

## Phase 4: Dashboard Verification

### Scope

Verify dashboard displays correct data after operations from all phases.

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | Positions load after connect | Happy | Connect wallet → navigate to dashboard | Token positions listed with correct balances |
| 2 | Position updates after stake | Happy | Stake → go to dashboard | Total deposited increases |
| 3 | Delegation breakdown | Happy | Delegate → expand position | Delegation pie chart shows operator split |
| 4 | Rewards section (post-bootstrap) | Happy | Stake + earn → check rewards | Rewards by AVS shown with values |
| 5 | Rewards hidden in bootstrap | Happy | Bootstrap mode → check dashboard | No rewards section |
| 6 | Operator list sorts correctly | Happy | Toggle sort metrics | List reorders by self-staked %, total, commission |
| 7 | Network statistics | Happy | Load dashboard | TVL, stakers, top token shown |
| 8 | Unconnected token shows connect prompt | Happy | Don't connect XRP → check XRP position | "Connect wallet" card with Connect button |
| 9 | Zero-position token shows start staking | Happy | Connect but no position | "No staking positions found" + Start Staking |
| 10 | Skeleton loaders during fetch | Happy | Load dashboard with slow network | Skeleton cards shown before data |
| 11 | Error state | Negative | API unreachable | Error card with refresh button |

---

## Cross-Cutting Concerns

### Test Data Management

- **Anvil snapshots:** Capture state after setup, revert between test suites
- **Pre-funded accounts:** Known private keys with sufficient token balances
- **Contract state:** Fork at a block where bootstrap contract is in desired phase
- **Phase toggling:** Use Anvil's `evm_setStorageAt` to flip `bootstrapped` flag for testing both phases

### CI Integration

```yaml
# Suggested CI job structure
e2e-dapp-tests:
  steps:
    - Install Foundry, pnpm, Playwright browsers
    - Start Anvil fork (background)
    - Build and start Next.js app (background)
    - Run Phase 1 tests (Synpress + MetaMask)
    - Run Phase 2 tests (XRP mock)
    - Run Phase 3 tests (Bitcoin mock)
    - Run Phase 4 tests (Dashboard)
    - Upload Playwright report artifact
```

### Environment Variables for Test Mode

```env
NEXT_PUBLIC_E2E_MODE=true              # Enable mock wallet connectors
NEXT_PUBLIC_E2E_XRP_SEED=s...          # XRPL testnet wallet seed
NEXT_PUBLIC_E2E_BTC_PRIVATE_KEY=...    # Bitcoin testnet private key
NEXT_PUBLIC_E2E_EVM_PRIVATE_KEY=0xac...# Anvil default account
```

### Test Tagging

Tests should be tagged for selective execution:

```
@phase1  @evm       @wallet-connect
@phase1  @evm       @lst-stake
@phase1  @evm       @nst-stake
@phase2  @xrp       @binding
@phase2  @xrp       @stake
@phase3  @bitcoin   @binding
@phase3  @bitcoin   @stake
@phase4  @dashboard
@bootstrap           (bootstrap-phase tests)
@post-bootstrap      (post-bootstrap tests)
@negative            (error/edge case tests)
```

---

## Implementation Priority

| Phase | Effort | Coverage Value | Dependency |
|-------|--------|---------------|------------|
| Phase 1 (EVM) | Medium | High — covers majority of staking flows | Synpress setup |
| Phase 4 (Dashboard) | Low | Medium — verifies data correctness | Phase 1 (needs wallet connected) |
| Phase 2 (XRP) | Medium | Medium — tests binding + XRPL-specific flow | Mock connector infra |
| Phase 3 (Bitcoin) | Medium | Medium — tests PSBT + binding flow | Mock connector infra (shared with Phase 2) |

Suggested order: **Phase 1 → Phase 4 → Phase 2 → Phase 3** (Phase 4 is low effort once Phase 1 is working).

---

## Success Criteria

- All happy-path flows pass in CI on every PR
- Negative tests document expected error messages
- Tests run in < 5 minutes total
- No flakiness from timing issues (use Playwright's auto-waiting + Anvil's instant mining)
- Both bootstrap and post-bootstrap phases covered for each token type
