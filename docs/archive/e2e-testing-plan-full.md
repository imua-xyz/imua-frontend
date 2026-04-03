# dApp E2E Testing Plan

## Overview

Automated end-to-end testing for the Imua Protocol frontend, covering wallet connection, staking operations, and dashboard verification across all supported chains (EVM, XRP, Bitcoin) in both bootstrap and post-bootstrap phases.

## Architecture

```
Phase 1 (EVM):      Synpress + MetaMask extension + Anvil fork
Phase 2 (XRP):      Playwright + SDK-level mock (construct + sign, no broadcast)
Phase 3 (Bitcoin):   Playwright + SDK-level mock (construct + sign, no broadcast)
Phase 4 (Dashboard): Playwright + MSW (Mock Service Worker) for API fixtures
```

All phases share a common test harness built on Playwright. Phase 1 uses real MetaMask via Synpress with Anvil providing the EVM chain (real contract execution, no funding issues). Phases 2 and 3 inject mock wallet connectors that construct and sign transactions locally without broadcasting to real chains. Phase 4 uses MSW to intercept external API calls and return deterministic fixture data.

### Design Principles

**Why Anvil for EVM (not public testnet):**
- `deal` cheatcode mints arbitrary ERC-20 tokens (imETH, wstETH) — no faucet dependency
- `setBalance` funds accounts with unlimited ETH — no gas funding issues
- `evm_setStorageAt` flips the `bootstrapped` flag — test both phases on one fork
- `evm_snapshot` / `evm_revert` — clean state between tests
- Instant block mining — tests run in seconds, not minutes
- Zero external dependencies — no testnet outages, no rate limits

**Why SDK mocks for XRP/Bitcoin (not real testnets):**
- No need to fund XRPL/Bitcoin testnet wallets (faucets are unreliable)
- Mock constructs the real transaction (XRPL Payment with memo, PSBT with OP_RETURN) and signs it locally
- Assertions verify transaction structure (correct amount, destination, memo/OP_RETURN contents)
- The actual broadcast + on-chain validation is tested manually via the existing Vercel testnet deployments

**Why Playwright `page.route()` for external APIs (not MSW):**
- Playwright's built-in request interception replaces MSW — simpler, zero production code changes
- All external API calls (Cosmos REST, GraphQL, Esplora, Beacon, LayerZero) are intercepted at the network level and resolved with fixture data
- No service worker setup, no Next.js App Router compatibility issues
- Individual tests can override routes for error simulation

### Two-Layer Testing Strategy

| Layer | Purpose | Speed | Fidelity | Runs when |
|-------|---------|-------|----------|-----------|
| **Automated E2E** (this plan) | UI regression prevention, flow correctness | Fast (~5 min) | High for UI, medium for on-chain | Every PR |
| **Manual testnet** (Vercel deployments) | Real cross-chain validation, LayerZero relay | Slow (min per flow) | Full end-to-end | Before releases |

The automated tests catch UI regressions and logic errors. The Vercel testnet deployments (bootstrap + post-bootstrap) remain the ground truth for real multi-chain behavior, cross-chain relay, and on-chain state transitions.

### Test Environment

| Component | Tool | Purpose |
|-----------|------|---------|
| Browser automation | Playwright | Page navigation, DOM interaction, assertions |
| EVM wallet | Synpress + MetaMask | Real extension-based wallet signing |
| EVM chain | Anvil (Foundry) | Local fork of Hoodi, instant blocks, free tokens |
| EVM token funding | Foundry `deal` cheatcode | Mint arbitrary ERC-20 balances to test accounts |
| Bootstrap toggle | Anvil `evm_setStorageAt` | Flip `bootstrapped` flag on bootstrap contract |
| Test isolation | Anvil `evm_snapshot`/`evm_revert` | Clean state between tests |
| XRP wallet | SDK mock (`xrpl`) | Construct + sign XRPL Payment locally (no broadcast) |
| Bitcoin wallet | SDK mock (`bitcoinjs-lib`) | Construct + sign PSBT locally (no broadcast) |
| External APIs | Playwright `page.route()` | Intercept Cosmos REST, GraphQL, Esplora, LayerZero |
| API fixtures | JSON fixture files | Deterministic positions, rewards, operators, prices |
| Stable selectors | `data-testid` attributes | Resilient to copy/styling changes, added incrementally |

### External Service Dependency Map

The frontend depends on 6 categories of external services. The table below shows how each is handled in E2E tests vs production:

| External Service | What it provides to the frontend | Production | E2E Tests |
|-----------------|--------------------------------|------------|-----------|
| **EVM RPC** (Hoodi / Imuachain) | Contract reads (balances, bootstrap status, vault, capsule), transaction submission, tx receipts | Alchemy / public RPC | **Real — Anvil fork** of Hoodi. Anvil executes real contract code, returns real receipts. The only "real" external service in E2E. |
| **Cosmos REST API** (`api-cosmos-rest.exocore-restaking.com`) | Operator list, staker assets, delegation info, token prices (oracle), rewards, AVS opt-in data | Imuachain Cosmos API | **Mocked — `page.route()`** returns fixture JSON. Used by `useOperators`, `useDelegations`, `useRewards`, `useTokenPrices` (post-bootstrap), `useStakerBalances`. |
| **GraphQL indexer** (`NEXT_PUBLIC_GRAPHQL_ENDPOINT`) | Bootstrap-phase delegations, operator assets, address bindings, network statistics (TVL, staker count) | Subgraph / indexer service | **Mocked — `page.route()`** intercepts GraphQL POST requests by `operationName`, returns fixture data. Used by `useBootstrapGraphQL`, `useAddressBinding`, `useBootstrapNetworkStatistics`. |
| **LayerZero Scan API** (`scan-testnet.layerzero-api.com`) | Cross-chain message status (pending, delivered, failed) | LayerZero infrastructure | **Mocked — `page.route()`** returns configurable status sequence (inflight → delivered). Used by `lib/txUtils.ts` for post-bootstrap cross-chain operation progress. |
| **Beacon Chain API** (`NEXT_PUBLIC_BEACON_API_URL`) | Validator status, validator container data for NST proof verification | Beacon node (Hoodi) | **Mocked — `page.route()`** returns fixture validator data. Used by `VerifyTab.tsx` for NST validator status checks and proof submission. |
| **Esplora API** (`NEXT_PUBLIC_ESPLORA_API_URL`) | Bitcoin UTXOs, raw transaction hex, fee rate estimates | Blockstream Esplora | **Mocked — `page.route()`** returns fixture UTXOs and fee data. Used by `useBitcoinPSBTBuilder`, `useFeeRate`, `useRawTransactions`, `useUTXOSet`. |

#### Playwright Route Interception

External API calls are intercepted via Playwright's `page.route()` in test setup. This requires zero production code changes — no service worker, no conditional imports.

```typescript
// e2e/setup/graphql-mocks.ts — intercepts GraphQL by operationName
export async function setupGraphQLMocks(page: Page, overrides?: GraphQLFixtureMap) {
  await page.route('**/*', async (route) => {
    const request = route.request();
    if (request.method() === 'POST' && request.url().includes('graphql')) {
      const body = JSON.parse(request.postData() || '{}');
      const fixture = fixtures[body.operationName];
      if (fixture) return route.fulfill({ status: 200, body: JSON.stringify(fixture) });
    }
    return route.continue(); // Non-GraphQL requests pass through
  });
}

// e2e/setup/rpc-proxy.ts — proxies EVM RPC calls to Anvil
export async function setupRPCProxy(page: Page) {
  await page.route(url => url.hostname.includes('alchemy.com'), async (route) => {
    const response = await fetch('http://localhost:8545', {
      method: 'POST', body: route.request().postData(),
    });
    route.fulfill({ status: 200, body: await response.text() });
  });
}

// e2e/setup/cosmos-mocks.ts — intercepts Cosmos REST API calls
export async function setupCosmosMocks(page: Page) {
  await page.route('**/imuachain/operator/v1/**', route =>
    route.fulfill({ status: 200, body: JSON.stringify(fixtures.operators) })
  );
  await page.route('**/imuachain/delegation/v1/**', route =>
    route.fulfill({ status: 200, body: JSON.stringify(fixtures.delegations) })
  );
  // ... additional routes for rewards, staker assets, etc.
}
```

Individual tests can override routes for error simulation:

```typescript
test('shows error on API failure', async ({ page }) => {
  await page.route('**/imuachain/operator/v1/**', route =>
    route.fulfill({ status: 500 })
  );
  // ... assert error UI
});
```

---

## Phase 1: EVM Staking (Synpress + MetaMask + Anvil)

### Scope

Covers imETH, wstETH, and nstHoodlETH via MetaMask on an Anvil-forked Hoodi testnet.

### Setup

- Anvil forks Hoodi at a known block: `anvil --fork-url $HOODI_RPC --block-time 1`
- Test wallet funded via Foundry cheatcodes:
  - `cast rpc anvil_setBalance $WALLET 0x56BC75E2D63100000` (100 ETH)
  - `cast rpc anvil_deal $IMETH_TOKEN $WALLET $AMOUNT` (mint imETH/wstETH)
- Test wallet imported into MetaMask (known private key from Anvil default accounts)
- Next.js dev server started with `.env.e2e` pointing RPC URLs to Anvil (`http://localhost:8545`)
- Anvil snapshot taken after setup, reverted between test suites via `evm_snapshot`/`evm_revert`
- Bootstrap phase toggled via `evm_setStorageAt` on the bootstrap contract's `bootstrapped` storage slot

### Test Suites

#### 1.1 Landing Page & Navigation

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | Landing page loads | Happy | Navigate to `/` | IMUA logo, "Welcome to IMUA", Staking and Dashboard cards visible |
| 2 | Staking card navigates | Happy | Click "Get started →" on Staking card | Navigates to `/staking` |
| 3 | Dashboard card navigates | Happy | Click "View dashboard →" on Dashboard card | Navigates to `/dashboard` |
| 4 | Card hover states | Happy | Hover over Staking/Dashboard cards | Border/glow visual feedback |
| 5 | Header logo links home | Happy | From any page, click IMUA logo in header | Navigates to `/` |
| 6 | Header nav active state | Happy | Navigate to Dashboard, then Stake | Active link highlighted in cyan, other link dim |

#### 1.2 Wallet Connection

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | Connect MetaMask | Happy | Click "Connect" → select MetaMask → approve in extension | Wallet address shown in header, status = connected |
| 2 | Reject connection | Negative | Click "Connect" → select MetaMask → reject in extension | Modal remains, no wallet shown |
| 3 | Wrong network | Negative | Connect on mainnet instead of Hoodi | "Switch network" prompt appears |
| 4 | Switch network | Happy | Connect on wrong network → approve switch | Network switches, wallet ready |
| 5 | Disconnect wallet | Happy | Open dropdown → click Disconnect | Status = "Not Connected", positions hidden |
| 6 | Reconnect after disconnect | Happy | Disconnect → reconnect | Wallet restored, positions reload |
| 7 | Wallet details modal | Happy | Click wallet address in header | Modal shows truncated address, balance, explorer link |
| 8 | Copy address | Happy | Open wallet details → click Copy | Full address copied to clipboard, "Copied" feedback |
| 9 | View in Explorer | Happy | Open wallet details → click explorer link | Opens block explorer in new tab |
| 10 | Disconnect from details modal | Happy | Open wallet details → click Disconnect | Wallet disconnected, modal closes |

#### 1.3 Token Selector

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | Open token selector | Happy | Click token dropdown on staking page | "Select a token" modal opens with all tokens |
| 2 | Search by name | Happy | Type "Wrapped" in search | wstETH shown, others filtered out |
| 3 | Search by symbol | Happy | Type "XRP" in search | XRP token shown |
| 4 | No search results | Negative | Type "NONEXISTENT" | Empty list or "no tokens found" |
| 5 | Clear search | Happy | Type search term → clear | Full token list restored |
| 6 | Select token | Happy | Click on a token | Modal closes, staking context updates to selected token |
| 7 | Currently selected indicator | Happy | Open selector when imETH is selected | imETH row shows checkmark |
| 8 | Switch token mid-flow | Happy | Enter amount for imETH → switch to wstETH | Amount clears, context resets to wstETH |
| 9 | Scroll fade indicator | Happy | Open selector with many tokens | Bottom fade visible when not scrolled to bottom |

#### 1.4 Operator Selection Modal

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | Open operator modal | Happy | Click "Select Operator" in Delegate/Stake tab | Modal shows operator list |
| 2 | Search by name | Happy | Type operator name | Filtered list matches |
| 3 | Search by address | Happy | Type partial address | Operator found by address |
| 4 | No results | Negative | Search for nonexistent operator | "No operators found matching your search" |
| 5 | Sort by self-staked % | Happy | Select sort metric | Operators reordered by self-staked % descending |
| 6 | Sort by total delegated | Happy | Select sort metric | Operators reordered |
| 7 | Sort by commission | Happy | Select sort metric | Operators reordered by commission ascending |
| 8 | Sort direction toggle | Happy | Click sort direction | Asc/desc switches |
| 9 | Bootstrap info banner | Happy | In bootstrap mode, open modal | "Bootstrap Phase: APY data not available" banner shown |
| 10 | Results count | Happy | Search or filter | "Showing X of Y operators" accurate |
| 11 | Select via row click | Happy | Click an operator row | Operator selected |
| 12 | Cancel without selecting | Happy | Open modal → click Cancel | Previous selection preserved |
| 13 | Last used operator restored | Happy | Select operator → close → reopen | Last selected operator pre-selected |
| 14 | Operator persistence in localStorage | Happy | Select operator for imETH → switch to wstETH → back to imETH | imETH's last operator restored |

#### 1.5 LST Staking (imETH / wstETH)

##### 1.5.1 Deposit / Stake

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | Stake with operator (bootstrap) | Happy | Select imETH → Stake tab → amount → operator → confirm | Tx succeeds, balance updated, optimistic position shown |
| 2 | Stake without operator (post-bootstrap) | Happy | Post-bootstrap → amount → confirm | Deposit recorded |
| 3 | Deposit-only mode (post-bootstrap) | Happy | Toggle to "Deposit" mode → amount → confirm | Deposit without delegate |
| 4 | Stake mode toggle visible (post-bootstrap) | Happy | Check Stake tab UI | Toggle between "Stake & Earn" and "Deposit only" |
| 5 | Stake mode forced (bootstrap) | Happy | Bootstrap, `isOnlyDepositThenDelegateAllowed` | No toggle, forced to Stake mode |
| 6 | Stake with approval flow | Happy | First-time token → approve allowance → stake | Both txs succeed |
| 7 | Stake zero amount | Negative | Enter "0" | Button disabled, "Amount must be greater than 0" |
| 8 | Stake exceeds balance | Negative | Amount > wallet balance | "Amount exceeds balance" error |
| 9 | Stake below minimum | Negative | Amount < minimum | "Amount must be greater than {min}" |
| 10 | No available balance | Negative | Wallet has 0 token balance | "No available balance" shown |
| 11 | Reject approval tx | Negative | Approve → reject in MetaMask | "Approval failed" error, no state change |
| 12 | Reject stake tx | Negative | Amount → reject in MetaMask | "Transaction rejected by user" |
| 13 | Use MAX button | Happy | Click "MAX" → confirm | Amount = full balance, tx succeeds |
| 14 | Edit amount in review | Happy | Review step → click "Edit" | Returns to amount input, amount preserved |
| 15 | Change operator in review | Happy | Review step → click "Change" next to operator | Opens operator modal, new selection updates review |

##### 1.5.2 Delegate

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | Delegate to operator | Happy | Delegate tab → operator → amount → confirm | Delegation succeeds |
| 2 | Delegate more than deposited | Negative | Amount > total deposited | Error or button disabled |
| 3 | Delegate zero | Negative | Enter "0" | Button disabled |
| 4 | No operators available | Negative | Empty operator list | "No operators available" |

##### 1.5.3 Undelegate

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | Undelegate (instant, bootstrap) | Happy | Undelegate tab → operator → amount → instant → confirm | Instant undelegation succeeds |
| 2 | Undelegate (non-instant, post-bootstrap) | Happy | Post-bootstrap → non-instant | Undelegation queued |
| 3 | Undelegate non-instant in bootstrap | Negative | Try non-instant in bootstrap | Not allowed / error |
| 4 | Undelegate more than delegated | Negative | Amount > delegated to operator | Error |
| 5 | Instant unbond toggle hidden (bootstrap) | Happy | Bootstrap mode | Toggle not visible, always instant |
| 6 | Instant unbond toggle visible (post-bootstrap) | Happy | Post-bootstrap mode | Toggle visible, user can choose |
| 7 | No active delegations | Negative | No delegations to any operator | "No Active Delegations" + "Start Delegating" button |
| 8 | Start Delegating button | Happy | Click "Start Delegating" in empty state | Switches to Delegate tab |

##### 1.5.4 Claim Principal

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | Claim after undelegation completes | Happy | Claimable balance > 0 → confirm | Claim succeeds, claimable → withdrawable |
| 2 | Claim with no claimable balance | Negative | No claimable balance | Button disabled or zero shown |

##### 1.5.5 Withdraw Principal

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | Withdraw to self (no recipient) | Happy | Withdraw tab → amount → confirm | Withdraws to connected wallet (fallback) |
| 2 | Withdraw to custom recipient | Happy | Amount + different 0x address → confirm | Withdraws to specified address |
| 3 | Withdraw more than withdrawable | Negative | Amount > withdrawable | Error |

#### 1.6 NST Staking (nstHoodlETH)

##### 1.6.1 Capsule Management

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | Check capsule loading state | Happy | Select nstHoodlETH | Spinner while checking capsule existence |
| 2 | Create capsule | Happy | Click "Create Capsule" | Capsule address returned, explorer link shown |
| 3 | Capsule already exists | Negative | Create when capsule exists | Returns existing capsule address |
| 4 | Capsule explorer link | Happy | Click capsule address link | Opens account explorer |

##### 1.6.2 NST Stake

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | Stake 32 ETH (non-Pectra) | Happy | Enter pubkey, signature, deposit data root → stake | Validator stake recorded |
| 2 | Stake 32–2048 ETH (Pectra mode) | Happy | Pectra mode → valid range | Stake succeeds |
| 3 | Invalid amount (not 32 ETH, non-Pectra) | Negative | Enter != 32 ETH | Error: exactly 32 ETH required |
| 4 | Amount not gwei multiple | Negative | Enter amount not divisible by 1 gwei | Validation error |
| 5 | Invalid pubkey format | Negative | Enter invalid 48-byte hex | Validation error |
| 6 | Invalid signature format | Negative | Enter invalid hex | Validation error |
| 7 | View validator link | Happy | After entering pubkey, click explorer link | Opens validator explorer |

##### 1.6.3 Verify & Deposit

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | Verify and deposit | Happy | Provide validator container + proof → verify | Verification succeeds |
| 2 | Check validator status | Happy | Enter pubkey → click "Check Status" | Validator status fetched from beacon API |
| 3 | Validator not found | Negative | Enter unknown pubkey → Check Status | "Validator not found" error |
| 4 | Non-active validator | Negative | Validator not `active_ongoing` | Cannot submit proof |
| 5 | Upload proof file | Happy | Upload valid JSON proof | Fields populated correctly |
| 6 | Upload invalid proof file | Negative | Upload invalid JSON | Error shown |
| 7 | Proof index mismatch | Negative | Proof validator index ≠ current validator | Error |
| 8 | Timestamp not in oracle | Happy | Timestamp missing → click "Add Timestamp" | Timestamp added first, then verify |
| 9 | Slashed validator | Negative | Validator has been slashed | Warning displayed |

##### 1.6.4 NST Delegate / Withdraw

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | Delegate NST | Happy | Delegate tab → operator → amount → confirm | Delegation succeeds |
| 2 | Withdraw NST (post-bootstrap) | Happy | Post-bootstrap → Withdraw → amount → confirm | Withdrawal succeeds |
| 3 | Withdraw NST in bootstrap | Negative | Bootstrap → check tabs | Withdraw tab not available |

#### 1.7 Operation Progress & Cross-Chain

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | Local operation progress (bootstrap) | Happy | Bootstrap deposit → observe progress | Steps: approval → tx → confirmation → complete |
| 2 | Simplex progress (post-bootstrap) | Happy | Post-bootstrap deposit → observe | Steps: tx → confirm → relay → complete |
| 3 | Duplex progress (claim) | Happy | Post-bootstrap claim → observe | Steps: tx → confirm → relay → response → complete |
| 4 | Tx hash displayed | Happy | Complete any tx | Tx hash shown with explorer link |
| 5 | "Keep window open" warning | Happy | Start tx, observe progress | Warning shown during processing |
| 6 | Confirmation time estimate | Happy | Observe EVM progress | "~10 sec" for EVM confirmation |
| 7 | Error during operation | Negative | Force tx failure | Error message shown, "What is next?" guidance |
| 8 | Close progress on success | Happy | Operation completes → close | Progress dismissed, UI returns to normal |

#### 1.8 Bootstrap Phase Specifics

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | Tab visibility (bootstrap, LST) | Happy | Check tabs | stake, delegate, undelegate (no withdraw) |
| 2 | Tab visibility (bootstrap, NST) | Happy | Check tabs | stake, verify, delegate, undelegate (no withdraw) |
| 3 | Tab visibility (post-bootstrap) | Happy | Post-bootstrap, check tabs | All tabs including withdraw |
| 4 | Tab auto-reset on token switch | Happy | Post-bootstrap on Withdraw tab → switch to bootstrap-only token | Tab resets to "stake" |
| 5 | Locked phase | Negative | Set timestamp to locked phase | Staking disabled, lock message |
| 6 | Relay fee = 0 in bootstrap | Happy | Bootstrap deposit | getQuote returns 0 |
| 7 | Relay fee > 0 post-bootstrap | Happy | Post-bootstrap deposit | getQuote returns nonzero |

#### 1.9 Optimistic Updates

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | Pending tx in dashboard | Happy | Stake → navigate to dashboard before indexer updates | Optimistic position visible |
| 2 | Merge with real data | Happy | Wait for indexer → refresh | Optimistic entry replaced by indexed data |
| 3 | Survives page refresh | Happy | Stake → refresh page | Pending tx restored from localStorage |

#### 1.10 Error Message Display

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | Insufficient funds | Negative | Stake with insufficient gas | "Insufficient funds for transaction" |
| 2 | User rejected | Negative | Reject tx in MetaMask | "Transaction rejected by user" |
| 3 | Long error truncated | Negative | Trigger verbose error | Message truncated to ~30 chars with "..." |

---

## Phase 2: XRP Staking (SDK-Level Mock)

### Scope

Covers XRP staking via a mock GemWallet connector that uses the `xrpl` SDK for transaction signing.

### Mock Architecture

```typescript
// Mock replaces the real GemWallet store
// Constructs and signs XRPL transactions locally using xrpl.Wallet.fromSeed()
// Does NOT broadcast to XRPL testnet — captures the signed tx for assertion
// Injects via NEXT_PUBLIC_E2E_MOCK_WALLETS=true

class MockXRPWalletConnector {
  private wallet: xrpl.Wallet;
  address: string;
  isConnected: boolean;
  lastSignedTx: object | null;     // Captured for test assertions

  connect(): void;                  // Sets connected state + mock balance
  disconnect(): void;
  signTransaction(tx): Promise<string>;  // Signs locally, captures tx, returns mock hash
  getBalance(): Promise<string>;         // Returns configurable mock balance
  getNetwork(): { network: string };     // Returns "Testnet" by default

  // Test helpers
  setBalance(drops: string): void;       // Configure balance for test scenarios
  setNetwork(network: string): void;     // Simulate wrong network
  getLastTransaction(): object;          // Assert on constructed tx fields
}
```

**What the mock verifies:** The XRPL Payment transaction is correctly constructed — correct `Amount` (in drops), correct `Destination` (vault address), correct `Memos` (EVM address + operator in bootstrap, EVM address only post-bootstrap). The mock signs the tx with a real `xrpl.Wallet` to validate signature logic, but skips the broadcast step.

**What is NOT tested here (tested manually on Vercel):** Actual XRPL ledger submission, transaction validation on-chain, vault address balance update.

### Test Suites

#### 2.1 XRP Wallet Connection

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | Connect XRP + EVM wallets | Happy | Connect mock XRP → connect EVM | Both connected, dual-wallet status shown |
| 2 | XRP connected, EVM not | Negative | Connect only XRP | "Connect EVM wallet" prompt |
| 3 | Wrong XRP network (mainnet) | Negative | Mock connected on mainnet | "Switch to Testnet" prompt |
| 4 | Disconnect XRP | Happy | Disconnect XRP wallet | XRP status = disconnected |
| 5 | Wallet connection modal progress | Happy | Connect XRP first → then EVM | Modal shows step 1/2 → step 2/2 progress |
| 6 | Bootstrap EOA-only warning | Happy | Connect in bootstrap | EOA-only warning shown in modal |

#### 2.2 Address Binding

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | First stake creates binding | Happy | Unbound XRP → stake → success | Provisional binding: XRP ↔ EVM |
| 2 | Subsequent stake uses existing binding | Happy | Bound XRP → stake again | Same binding, no new creation |
| 3 | Conflicting binding (EVM → different XRP) | Negative | EVM bound to XRP-B, try with XRP-A | "Conflicting binding" error |
| 4 | Binding persists across sessions | Happy | Bind → refresh page | Provisional binding restored from store |
| 5 | Binding resolves from network data | Happy | After indexer picks up binding | Provisional replaced by on-chain binding |

#### 2.3 XRP Staking Operations

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | Stake XRP (bootstrap, with operator) | Happy | Select XRP → amount → operator → confirm | XRPL Payment tx with memo (evmAddr + operator) |
| 2 | Stake XRP (post-bootstrap, no operator) | Happy | Post-bootstrap → amount → confirm | XRPL Payment with memo (evmAddr only) |
| 3 | Stake below minimum (50M drops / 50 XRP) | Negative | Enter < 50 XRP | "Below minimum" |
| 4 | Stake exceeds XRP balance | Negative | Enter > balance | "Exceeds balance" |
| 5 | Missing operator in bootstrap | Negative | Bootstrap → no operator selected | Button disabled or error |
| 6 | Delegate XRP (post-bootstrap) | Happy | Delegate tab → operator → amount → confirm | EVM tx via bound address |
| 7 | Undelegate XRP (post-bootstrap) | Happy | Undelegate tab → confirm | EVM tx succeeds |
| 8 | Withdraw XRP (post-bootstrap) | Happy | Withdraw tab → confirm | EVM tx succeeds |
| 9 | Delegate in bootstrap | Negative | Check tabs | Tab not available (only stake visible) |
| 10 | Withdraw in bootstrap | Negative | Check tabs | Tab not available |
| 11 | Tab auto-reset: XRP in bootstrap | Happy | Select post-bootstrap token on Withdraw → switch to XRP | Resets to stake tab |

---

## Phase 3: Bitcoin Staking (SDK-Level Mock)

### Scope

Covers tBTC staking via a mock Bitcoin wallet connector that uses `bitcoinjs-lib` + `tiny-secp256k1` for PSBT signing.

### Mock Architecture

```typescript
// Mock replaces the Reown AppKit Bitcoin adapter
// Constructs and signs PSBTs locally using bitcoinjs-lib + tiny-secp256k1
// Does NOT broadcast to Bitcoin testnet — captures the PSBT for assertion
// Injects via NEXT_PUBLIC_E2E_MOCK_WALLETS=true

class MockBitcoinWalletConnector {
  private keyPair: ECPairInterface;
  address: string;              // testnet (tb1...)
  paymentAddress: string;
  isConnected: boolean;
  lastSignedPsbt: Psbt | null;  // Captured for test assertions

  connect(): void;               // Sets connected state + mock UTXOs
  disconnect(): void;
  signPsbt(psbt): Promise<string>;  // Signs locally, captures PSBT, returns mock txid
  getBalance(): Promise<number>;     // Returns sum of mock UTXOs
  getUtxos(): Promise<UTXO[]>;       // Returns configurable mock UTXO set

  // Test helpers
  setUtxos(utxos: UTXO[]): void;     // Configure UTXOs for test scenarios
  setNetwork(mainnet: boolean): void; // Simulate wrong network
  getLastPsbt(): Psbt;               // Assert on PSBT structure
}
```

**What the mock verifies:** PSBT is correctly built — correct OP_RETURN data (EVM address + operator encoding), correct output to vault address, correct fee calculation per selected strategy, correct change output handling (above/below dust threshold). The mock signs with a real key pair to validate signature logic.

**What is NOT tested here (tested manually on Vercel):** Actual Bitcoin testnet broadcast, confirmation tracking via Esplora, UTXO spending on-chain.

### Test Suites

#### 3.1 Bitcoin Wallet Connection

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | Connect Bitcoin + EVM wallets | Happy | Connect mock BTC → connect EVM | Both connected, dual-wallet status |
| 2 | Bitcoin connected, EVM not | Negative | Connect only BTC | "Connect EVM wallet" prompt |
| 3 | Wrong Bitcoin network (mainnet address) | Negative | Mock with mainnet address prefix | "Wrong network" error |
| 4 | Connection timeout (30s) | Negative | Simulate slow connect | Timeout error |
| 5 | Wallet connection modal with AppKit | Happy | Connect BTC → modal closes → AppKit opens → reopens | Flow completes (35s fallback) |

#### 3.2 Address Binding

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | First stake creates binding | Happy | Unbound BTC → stake → success | Provisional binding: BTC ↔ EVM |
| 2 | Conflicting binding | Negative | EVM bound to different BTC | "Conflicting binding" error |

#### 3.3 Bitcoin Staking Operations

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | Stake BTC (bootstrap, with operator) | Happy | Select tBTC → amount → operator → confirm | PSBT with OP_RETURN (evmAddr + operator) |
| 2 | Stake BTC (post-bootstrap, no operator) | Happy | Post-bootstrap → amount → confirm | PSBT with OP_RETURN (evmAddr only) |
| 3 | Stake below minimum (5000 sats) | Negative | Enter < minimum | "Below minimum" |
| 4 | Stake exceeds BTC balance | Negative | Enter > balance | "Exceeds balance" |
| 5 | Insufficient UTXOs | Negative | Wallet has no spendable UTXOs | PSBT build failure |
| 6 | OP_RETURN exceeds 80 bytes | Negative | Edge case | Build error |
| 7 | Wait for 6 confirmations | Happy | Stake → observe progress | Confirmation counter shown, "~10 min" estimate |
| 8 | Delegate BTC (post-bootstrap) | Happy | Delegate tab → operator → amount → confirm | EVM tx succeeds |
| 9 | Withdraw BTC (post-bootstrap) | Happy | Withdraw tab → amount → confirm | EVM tx succeeds |
| 10 | Delegate in bootstrap | Negative | Check tabs | Tab not available |

#### 3.4 Bitcoin Fee & PSBT Details

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | Fee strategy selection | Happy | Choose Fast / Balanced / Economical | Fee estimate updates |
| 2 | Testnet fee fallback | Happy | On testnet | Uses fallback rate (e.g., 1.5 sat/vB) |
| 3 | Change output created | Happy | Stake amount << balance | Change output in PSBT (remainder > dust) |
| 4 | No change output (dust) | Happy | Stake ~full balance, remainder ≤ 546 sats | Change omitted |
| 5 | Unconfirmed UTXO warning | Happy | Wallet has unconfirmed UTXOs | Warning displayed |

---

## Phase 4: Dashboard Verification

### Scope

Verify dashboard displays correct data after operations from all phases.

#### 4.1 Summary Section

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | Total value staked | Happy | Connect + have positions | Correct USD total shown |
| 2 | Pie chart breakdown | Happy | Multiple token positions | Pie chart shows allocation by token |
| 3 | Token legend | Happy | With positions | Legend shows token, USD value, percentage |
| 4 | Rewards card (post-bootstrap) | Happy | Post-bootstrap with rewards | Total rewards earned + pie chart |
| 5 | Rewards hidden (bootstrap) | Happy | Bootstrap mode | No rewards card |
| 6 | Zero state (no stakes) | Happy | Connected but no positions | "No stakes" circle, "No positions staked yet" |
| 7 | Zero rewards state | Happy | Post-bootstrap, no rewards | "No rewards" circle + "Start staking to earn rewards" |

#### 4.2 Positions Section

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | Positions load after connect | Happy | Connect → dashboard | Token positions listed |
| 2 | Position updates after stake | Happy | Stake → dashboard | Total deposited increases |
| 3 | Token sorting | Happy | Some tokens with positions, some without | Tokens with positions appear first |
| 4 | Unconnected token → connect prompt | Happy | Don't connect XRP | "Connect wallet" card with Connect button |
| 5 | Zero-position → start staking | Happy | Connected but no position | "No staking positions found" + Start Staking button |
| 6 | Start Staking navigation | Happy | Click "Start Staking" on zero-position card | Navigates to `/staking` with token + tab set in localStorage |
| 7 | Expand position card | Happy | Click position row | Expanded view: delegation breakdown, AVS, details |
| 8 | Collapse position card | Happy | Click expanded position | Collapsed back |
| 9 | Delegation pie chart | Happy | Expand position with delegations | Delegation distribution by operator |
| 10 | No delegations state | Happy | Expand position with 0 delegated | "No delegations found" |
| 11 | Participating AVS | Happy | Expand position, operators opted into AVS | AVS list with APY shown |
| 12 | Position details: delegation status | Happy | Expand position | Progress bar, delegated/deposited amounts |
| 13 | Navigate to Delegate More | Happy | Expand → click "Delegate More" | Navigates to staking page with delegate tab |
| 14 | Navigate to Undelegate | Happy | Expand → click "Undelegate" | Navigates to staking page with undelegate tab |
| 15 | Navigate to Withdraw | Happy | Expand → click "Withdraw" | Navigates to staking page with withdraw tab |
| 16 | Mobile layout | Happy | Narrow viewport | Compact position display (no desktop columns) |

#### 4.3 Rewards Section (Post-Bootstrap)

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | Reward tokens listed | Happy | Earned rewards | Reward tokens with total value, sources, avg APY |
| 2 | Expand reward card | Happy | Click reward token | Distribution pie chart, breakdown by AVS |
| 3 | Reward details | Happy | Expand reward | Total accumulated, average APY, source list |
| 4 | Claim All Rewards button | Happy | Expand reward → click Claim All | (Verify if wired or placeholder) |
| 5 | No rewards state | Happy | No rewards | "No Rewards Available" card |
| 6 | Rewards sorted by value | Happy | Multiple reward tokens | Sorted descending by total value |

#### 4.4 Operators & Network Stats

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | Top operators list | Happy | Load dashboard | Top 5 operators shown with rank |
| 2 | Operator token selector | Happy | Change token in operator section | Operator list updates for selected token |
| 3 | Sort by self-staked % | Happy | Select metric | Operators reordered |
| 4 | Sort by total staked | Happy | Select metric | Operators reordered |
| 5 | Sort by commission | Happy | Select metric | Operators reordered (ascending) |
| 6 | Bootstrap operator display | Happy | Bootstrap mode | Self-staked %, total staked, commission (no APR) |
| 7 | Post-bootstrap operator display | Happy | Post-bootstrap | APR shown |
| 8 | Network statistics | Happy | Load dashboard | TVL, active stakers, top token shown |
| 9 | Total operators (bootstrap) | Happy | Bootstrap | Shows operator count instead of APY |
| 10 | No operators | Negative | Empty operator list | "No operators available" |

#### 4.5 Loading & Error States

| # | Test Case | Type | Steps | Expected |
|---|-----------|------|-------|----------|
| 1 | Skeleton loaders | Happy | Load dashboard with pending data | SkeletonCard + SkeletonPositionCard shown |
| 2 | Error state | Negative | API unreachable | Error card with AlertCircle + "Refresh Dashboard" button |
| 3 | Refresh dashboard | Happy | Error → click Refresh | Page reloads |
| 4 | Initial spinner | Happy | First mount before hydration | "Initializing..." spinner |

---

## Cross-Cutting Concerns

### Test Data Management

**Anvil (EVM state):**
- Fork Hoodi at a known block where bootstrap contract and token contracts are deployed
- Fund test accounts via `deal` cheatcode (ERC-20 tokens) and `setBalance` (ETH)
- Snapshot state after initial setup: `cast rpc evm_snapshot`
- Revert between test suites: `cast rpc evm_revert $SNAPSHOT_ID`
- Toggle bootstrap phase: `cast rpc anvil_setStorageAt $BOOTSTRAP_CONTRACT $SLOT $VALUE`

**XRP/Bitcoin (mock state):**
- Mock connectors start with configurable balances and UTXOs per test
- No persistent state — each test configures its own mock state
- Signed transactions are captured in memory for assertions, not broadcast

**API fixtures (dashboard data):**
- JSON fixture files under `e2e/fixtures/` represent known states:
  - `positions-with-stakes.json` — user with imETH + wstETH positions
  - `positions-empty.json` — connected user with no positions
  - `rewards-multiple-avs.json` — rewards from multiple AVS services
  - `operators-bootstrap.json` — operators with position data (no APR)
  - `operators-post-bootstrap.json` — operators with APR data
  - `network-stats.json` — TVL, stakers, top token
- MSW intercepts matching API URLs and returns fixture data
- Fixtures can be swapped per test to simulate different states

### Bootstrap Phase Toggling

The bootstrap contract stores `bootstrapped` as a boolean in a known storage slot. To test both phases on the same Anvil fork:

```bash
# Read current bootstrap status
cast call $BOOTSTRAP_CONTRACT "bootstrapped()(bool)" --rpc-url http://localhost:8545

# Set to bootstrapped (post-bootstrap phase)
cast rpc anvil_setStorageAt $BOOTSTRAP_CONTRACT $BOOTSTRAPPED_SLOT 0x0000000000000000000000000000000000000000000000000000000000000001

# Set to not bootstrapped (bootstrap phase)
cast rpc anvil_setStorageAt $BOOTSTRAP_CONTRACT $BOOTSTRAPPED_SLOT 0x0000000000000000000000000000000000000000000000000000000000000000
```

This allows running bootstrap-tagged and post-bootstrap-tagged tests sequentially on the same fork without restarting.

### CI Integration

```yaml
name: dApp E2E Tests

on:
  pull_request:
    branches: [main, bootstrap]

jobs:
  e2e-bootstrap:
    name: E2E Tests (Bootstrap Phase)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: recursive
      - uses: foundry-rs/foundry-toolchain@v1
        with:
          version: v1.3.6
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: forge compile
      - run: pnpm exec playwright install --with-deps chromium

      # Start Anvil fork (bootstrap phase)
      - name: Start Anvil
        run: |
          anvil --fork-url ${{ secrets.HOODI_RPC_URL }} --block-time 1 &
          sleep 3
          # Fund test accounts
          cast rpc anvil_setBalance $TEST_WALLET 0x56BC75E2D63100000
          # Ensure bootstrap phase
          cast rpc anvil_setStorageAt $BOOTSTRAP_CONTRACT $BOOTSTRAPPED_SLOT 0x0...0

      # Start dev server
      - name: Start app
        run: pnpm dev &
        env:
          NEXT_PUBLIC_E2E_MODE: "true"

      # Run bootstrap-phase tests
      - run: pnpm test:e2e --grep @bootstrap
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: e2e-report-bootstrap
          path: playwright-report/

  e2e-post-bootstrap:
    name: E2E Tests (Post-Bootstrap Phase)
    runs-on: ubuntu-latest
    steps:
      # (same setup steps as above)

      # Start Anvil fork (post-bootstrap phase)
      - name: Start Anvil
        run: |
          anvil --fork-url ${{ secrets.HOODI_RPC_URL }} --block-time 1 &
          sleep 3
          cast rpc anvil_setBalance $TEST_WALLET 0x56BC75E2D63100000
          # Set to bootstrapped
          cast rpc anvil_setStorageAt $BOOTSTRAP_CONTRACT $BOOTSTRAPPED_SLOT 0x0...1

      - name: Start app
        run: pnpm dev &
        env:
          NEXT_PUBLIC_E2E_MODE: "true"

      # Run post-bootstrap tests
      - run: pnpm test:e2e --grep @post-bootstrap
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: e2e-report-post-bootstrap
          path: playwright-report/
```

Bootstrap and post-bootstrap suites run as **parallel CI jobs** for faster feedback.

### Environment Variables

```env
# .env.e2e — used by Next.js dev server during E2E tests
NEXT_PUBLIC_E2E_MODE=true                        # Enable mock XRP/BTC connectors
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=test         # Placeholder (AppKit mocked)
NEXT_PUBLIC_ALCHEMY_API_KEY=test                  # Not used (Anvil provides RPC)
NEXT_PUBLIC_GRAPHQL_ENDPOINT=http://localhost:3000/api/mock-graphql  # MSW intercepts

# Test wallet (Anvil default account #0)
E2E_EVM_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
E2E_XRP_SEED=sEdTM1uX8pu2do5XvTnutH6HsouMaM2    # Mock-only, not broadcast
E2E_BTC_PRIVATE_KEY=cVkB...                       # Mock-only, not broadcast
```

### Test Tagging

Tests are tagged for selective execution. CI runs `@bootstrap` and `@post-bootstrap` in parallel jobs. Developers can run specific tags locally.

```
# By phase
@phase1  @evm       @wallet-connect
@phase1  @evm       @token-selector
@phase1  @evm       @operator-modal
@phase1  @evm       @lst-stake
@phase1  @evm       @nst-stake
@phase1  @evm       @operation-progress
@phase1  @evm       @optimistic-updates
@phase2  @xrp       @binding
@phase2  @xrp       @stake
@phase3  @bitcoin   @binding
@phase3  @bitcoin   @stake
@phase3  @bitcoin   @psbt
@phase4  @dashboard @positions
@phase4  @dashboard @rewards
@phase4  @dashboard @operators
@phase4  @dashboard @loading

# By protocol phase (CI splits on these)
@bootstrap
@post-bootstrap

# By test type
@happy-path
@negative
```

---

## Implementation Priority

| Phase | Effort | Coverage Value | Dependency |
|-------|--------|---------------|------------|
| Phase 1 (EVM) | Medium | High — covers majority of staking flows | Synpress setup |
| Phase 4 (Dashboard) | Low | Medium — verifies data correctness | Phase 1 |
| Phase 2 (XRP) | Medium | Medium — tests binding + XRPL flow | Mock connector infra |
| Phase 3 (Bitcoin) | Medium | Medium — tests PSBT + binding flow | Mock connector infra |

Order: **Phase 1 → Phase 4 → Phase 2 → Phase 3**

---

## Test Count Summary

| Phase | Happy Path | Negative Path | Total |
|-------|-----------|--------------|-------|
| Phase 1 – EVM | 62 | 35 | 97 |
| Phase 2 – XRP | 12 | 9 | 21 |
| Phase 3 – Bitcoin | 11 | 8 | 19 |
| Phase 4 – Dashboard | 30 | 5 | 35 |
| **Total** | **115** | **57** | **172** |

---

## Success Criteria

- All happy-path flows pass in CI on every PR
- Negative tests verify expected error messages are displayed
- Each CI job (bootstrap / post-bootstrap) completes in < 5 minutes
- No flakiness from timing (Playwright auto-waiting + Anvil instant mining)
- No external dependencies (no faucets, no testnet RPC in hot path, no indexer sync)
- Both bootstrap and post-bootstrap phases covered for each token type
- Test report artifact uploaded on every CI run
- Zero false positives from testnet outages or funding issues

## Relationship to Manual Testing

This automated E2E suite does **not** replace manual testing on real testnets. It complements it:

| What automated E2E covers | What manual testnet testing covers |
|---------------------------|-----------------------------------|
| UI flow correctness | Real cross-chain relay (LayerZero) |
| Form validation & error handling | Actual XRPL ledger transaction validation |
| Transaction construction correctness | Actual Bitcoin confirmation tracking |
| Bootstrap/post-bootstrap UI differences | Real Imuachain state updates |
| Dashboard data rendering | End-to-end token flow (deposit → relay → ledger) |
| Regression prevention on every PR | Pre-release validation |

The existing Vercel testnet deployments (bootstrap + post-bootstrap) continue to serve as the manual testing ground for real multi-chain flows.

---

## Appendix: API Contract Tests (Optional)

> **This section is optional and not a priority.** The MSW mock approach is sufficient for automated E2E testing. API contract tests are a nice-to-have safeguard against mock drift, but the risk is low when the team maintains both the frontend and the backend/indexer services.

### The Mock Drift Problem

Since all non-EVM external services are mocked with fixture data, there's a theoretical risk: if the real API changes its response format (field renamed, new required field, type change), the E2E tests would still pass against the old fixture while the production app breaks.

In practice this risk is low because:
- The Imua team controls both the frontend and the backend services
- Manual testing on Vercel testnet deployments catches format mismatches before releases
- TypeScript types in the frontend already define the expected shapes

### Mitigation: Lightweight Contract Tests

If the team wants an extra safety net, a small suite of "contract tests" can validate that real API responses match the expected TypeScript types. These tests don't exercise the UI — they just hit real endpoints and check response shapes.

```typescript
// e2e/contracts/cosmos-api.contract.test.ts
// Runs on a schedule (nightly or weekly), NOT on every PR

import { describe, test, expect } from 'vitest';

const COSMOS_API = 'https://api-cosmos-rest.exocore-restaking.com';

describe('Cosmos REST API contract', () => {
  test('operators endpoint returns expected shape', async () => {
    const res = await fetch(`${COSMOS_API}/imuachain/operator/v1/all_operators`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    // Validate top-level structure
    expect(data).toHaveProperty('operators');
    expect(Array.isArray(data.operators)).toBe(true);
    if (data.operators.length > 0) {
      const op = data.operators[0];
      expect(op).toHaveProperty('operator_address');
      expect(op).toHaveProperty('commission');
      expect(op.commission).toHaveProperty('commission_rates');
    }
  });

  test('delegation endpoint returns expected shape', async () => {
    const stakerId = 'test_staker_id';
    const assetId = 'test_asset_id';
    const res = await fetch(
      `${COSMOS_API}/imuachain/delegation/v1/delegations/${stakerId}/${assetId}`
    );
    // Even 404/empty is fine — just verify the response is parseable
    const data = await res.json();
    expect(data).toHaveProperty('delegation_infos');
  });
});
```

```typescript
// e2e/contracts/graphql.contract.test.ts

describe('GraphQL indexer contract', () => {
  test('bootstrap delegations query returns expected shape', async () => {
    const res = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{ bootstrapDelegations(first: 1) { id operator staker amount } }`,
      }),
    });
    const data = await res.json();
    expect(data).toHaveProperty('data');
    // Schema check passes even with empty results
  });
});
```

### When to Run

| Trigger | Tests to run |
|---------|-------------|
| Every PR | E2E tests only (Anvil + MSW mocks) |
| Nightly / weekly | API contract tests against real testnet endpoints |
| After backend/indexer deploy | API contract tests (if wired to backend CI) |

### When to Actually Implement This

Consider adding API contract tests when:
- The backend/indexer team is separate from the frontend team
- API schemas start changing without frontend coordination
- A production incident is traced back to API format mismatch

Until then, the MSW mock approach combined with manual Vercel testnet testing provides sufficient coverage.
