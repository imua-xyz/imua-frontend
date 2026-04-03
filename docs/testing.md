# Testing: Design & Implementation

## Overview

The frontend uses a three-layer testing approach: **unit tests** for pure logic and state, **integration tests** for multi-module flows (e.g. optimistic cache + merge), and **E2E tests** for critical user journeys. The goal is to lock in behavior for hooks, state changes, and main workflows without flakiness.

### Stack

- **Runner**: [Vitest](https://vitest.dev/) for unit and integration tests (already in the project).
- **React**: [@testing-library/react](https://testing-library.com/docs/react-testing-library/intro/) for component/hook tests.
- **E2E**: [Playwright](https://playwright.dev/) for browser smoke and workflow tests.

---

## Test Layout

```
exocore-frontend/
├── __tests__/
│   ├── setup.ts              # Global setup: env vars, clear optimistic store after each test
│   └── integration/
│       └── optimistic-flow.test.ts   # Store + merge flow
├── types/__tests__/
│   └── operations.test.ts
├── lib/__tests__/
│   ├── optimistic-merge.test.ts
│   ├── optimistic-helpers.test.ts
│   └── validator-container.test.ts
├── lib/graphql/__tests__/
│   └── transformers.test.ts
├── stores/__tests__/
│   └── optimisticCacheStore.test.ts
├── hooks/__tests__/
│   └── useOptimisticCacheCleanup.test.tsx
├── e2e/
│   └── smoke.spec.ts
├── vitest.config.ts
└── playwright.config.ts
```

- **Unit**: Colocated `__tests__` next to the code they cover; file names `*.test.ts` / `*.test.tsx`.
- **Integration**: `__tests__/integration/` for tests that span store, merge, and helpers.
- **E2E**: `e2e/*.spec.ts` for Playwright.

---

## Unit Tests

### What We Test

- **Pure functions and types**: No React, no DOM. Fast and deterministic.
- **State transitions**: Store actions and merge logic with explicit inputs and expected outputs.

### Coverage

| Area | File | What’s tested |
|------|------|----------------|
| **Operations** | `types/__tests__/operations.test.ts` | `affectsStakerAssets`, `affectsDelegations`, `affectsStakerAssetRecord`, `isDepositOnly`, `isDelegationOperation`, `isUndelegateOperation` for all `StakingOperation` values. |
| **Merge (staker assets)** | `lib/__tests__/optimistic-merge.test.ts` | `mergeStakerAssets`: deposit, stake, delegate, undelegate, claim, withdraw (BTC/XRP vs other), block-height skip, order, new asset from tx, invariant `deposited = withdrawable + delegated`. |
| **Merge (delegations)** | Same file | `mergeDelegations`: delegate, undelegate, block-height skip, remove when delegated ≤ 0, ignore non-delegation ops, create delegation from tx. |
| **Validator container** | `lib/__tests__/validator-container.test.ts` | `getEffectiveBalanceGwei`, `getDepositAmountWeiFromValidatorContainer` (little-endian uint64 at index 2, Gwei → wei). |
| **Transformers** | `lib/graphql/__tests__/transformers.test.ts` | `generateStakerId`, `generateAssetId` (format and lowercasing). |
| **Optimistic helpers** | `lib/__tests__/optimistic-helpers.test.ts` | `storePendingTransaction` adds a pending tx with correct `stakerId`/`assetId` and optional `operatorAddress`. |
| **Optimistic store** | `stores/__tests__/optimisticCacheStore.test.ts` | add, remove, getPendingTransactions, clearExpiredTransactions (asset and delegation keys), clearByChainId, clearAll. |

### Running Unit / Integration Tests

```bash
pnpm test          # Vitest run once
pnpm test:watch    # Vitest watch
pnpm test:coverage # Vitest with coverage (v8)
```

---

## Integration Tests

### What We Test

- **State flow across modules**: e.g. “add pending tx → merge with GraphQL data → clear expired” produces the expected final state.
- **No full app or network**: Uses the real store and merge logic; no Next.js or live APIs.

### Example: Optimistic Flow

`__tests__/integration/optimistic-flow.test.ts`:

1. Clear store, then call `storePendingTransaction` (deposit, 50, block 10).
2. Fetch pending txs for staker/asset and run `mergeStakerAssets` with base GraphQL data.
3. Assert merged deposited/withdrawable (150, 110).
4. Call `clearExpiredTransactions` with indexer block 15.
5. Assert pending list is empty and merging again with updated indexer data yields the original base (100, 60).

This locks in the intended UX: optimistic bump, then correct state after indexer catch-up.

---

## Hook Tests

### Approach

- Hooks that depend on Wagmi, Apollo, or Bootstrap status are tested with **vi.mock** of those dependencies.
- We assert **side effects** (e.g. store methods) or **return shape** when the hook is used inside a minimal component.

### Example: useOptimisticCacheCleanup

`hooks/__tests__/useOptimisticCacheCleanup.test.tsx`:

- Mock `useOptimisticCacheStore`, `useBootstrapStatus`, `useAccount`.
- Render a component that calls `useOptimisticCacheCleanup()`.
- When `useBootstrapStatus` returns `isBootstrapped: true`, assert `clearAll` was called.
- When `isBootstrapped: false`, assert `clearAll` was not called.

Other hooks (e.g. `useStakerBalances`, `useDelegations`) can be covered similarly by mocking their data sources and asserting merged results or refetch behavior.

---

## E2E Tests

### What We Test

- **Smoke**: Key routes load (e.g. `/`, `/staking`) and render without crashing.
- **Bootstrap phase (EVM)**: Wallet connection, token selector, operator modal, stake flow (amount → operator → review) on Hoodi. Baseline: [Bootstrap user flow spec](./e2e-bootstrap-user-flow-spec.md). Scope and architecture: [E2E testing plan](./e2e-testing-plan.md). Bootstrap and post-bootstrap are tested separately; current focus is bootstrap.

### Setup

- **Playwright** is in `devDependencies`; install with `pnpm install`.
- **Config**: `playwright.config.ts` — baseURL `http://localhost:3000`, `webServer` runs `pnpm run dev:e2e` (via `scripts/dev-e2e.mjs`, which loads `.env.e2e` and enables E2E mode), and `globalSetup` / `globalTeardown` manage Anvil (`globalSetup` stops any stale detached Anvil from `.e2e-anvil-pid` before starting a new one when `ANVIL_FORK_URL` is set; fund test wallet via JSON-RPC; `globalTeardown` stops Anvil if we started it).
- **Tests**: `e2e/phase1/*.spec.ts` — bootstrap-phase wallet connection, token selector, operator modal, and stake flow; plus `e2e/smoke.spec.ts` for basic route health.

### Running E2E

```bash
pnpm test:e2e      # Run Playwright (loads .env.e2e, starts dev server if not CI)
pnpm test:e2e:ui   # Playwright UI mode (also loads .env.e2e)
```

By default Playwright **starts and stops** its own `pnpm run dev:e2e` so **next-server does not stay running** after tests. If port 3000 is already in use, the run fails — run `pnpm test:e2e:clean:force` first.

To **reuse** an already-running dev server on :3000 and leave it up after tests (faster local iteration): `E2E_REUSE_DEV_SERVER=1 pnpm test:e2e`.

### Local cleanup (stale processes / ports)

Interrupted runs can leave **detached Anvil** (`.e2e-anvil-pid`) or **Playwright** driver processes around. Use:

```bash
pnpm test:e2e:clean              # Anvil pid file + stray Playwright only (does NOT free ports)
pnpm test:e2e:clean:force        # Recommended: also frees :3000 and :8545 (SIGTERM, then SIGKILL if needed)
pnpm test:e2e:clean:all          # Like :force + pkill heuristics for `next dev` / `dev-e2e.mjs`
```

Optional: run soft cleanup **before** every local E2E invocation:

```bash
E2E_CLEAN_BEFORE=1 pnpm test:e2e
```

`scripts/dev-e2e.mjs` forwards **SIGINT/SIGTERM** to the child `pnpm dev` so Playwright can shut down the Next.js process cleanly when the webServer stops.

### E2E troubleshooting (short)

- **Nothing runs for a long time**: Playwright waits for `http://localhost:3000`, then runs `globalSetup` (Anvil + fund wallet), then tests. Cold Next compile can take minutes.
- **`page.goto` timeout**: Stop anything else on port 3000; use **`pnpm test:e2e:clean:force`**. Ensure `.env.e2e` is loaded via `pnpm test:e2e` (not raw `playwright test` without env).
- **Precondition / `withdrawableAmounts`**: On-chain helpers use the Hoodi portal (`e2e/setup/anvil-portal.ts`), not `bootstrapContractNetwork` when `NEXT_PUBLIC_NST_LOCALNET=true` (UI still uses Hoodi LST paths). Keep `NEXT_PUBLIC_E2E_MODE=true` in `.env.e2e`.
- **`Approval failed`**: The app must send Hoodi RPC traffic to Anvil without browser CORS issues. With `NEXT_PUBLIC_E2E_MODE=true`, `config/wagmi.ts` uses **`/api/e2e-anvil`** (proxies to `127.0.0.1:8545`). Relying only on an empty `NEXT_PUBLIC_ALCHEMY_API_KEY` + Playwright route interception often breaks `eth_sendRawTransaction` / receipts; the proxy avoids that.

For CI, set `PLAYWRIGHT_BASE_URL` and disable `webServer`, or start the app in a prior step.

---

## Configuration

### Vitest (`vitest.config.ts`)

- **Environment**: `jsdom` for React and DOM-dependent code.
- **Paths**: Alias `@` to project root so imports like `@/stores/...` resolve.
- **Include**: `**/*.test.ts`, `**/*.test.tsx`, `**/__tests__/**/*.ts(x)`.
- **Exclude**: `node_modules`, `.next`, `lib/forge-std`, `lib/imua-contracts`, `__tests__/setup.ts`.
- **Setup**: `__tests__/setup.ts` sets `NEXT_PUBLIC_BEACON_API_URL` (for modules that require it) and clears the optimistic cache store after each test.

### Playwright (`playwright.config.ts`)

- **Test dir**: `e2e/`.
- **webServer**: Runs `pnpm run dev:e2e` and waits for `http://localhost:3000` in local runs; `.env.e2e` is loaded so `NEXT_PUBLIC_E2E_MODE` and related E2E settings are applied. In CI, either a dev server is started in a previous step or `PLAYWRIGHT_BASE_URL` is set and `webServer` is disabled.
- **Global hooks**: `globalSetup` / `globalTeardown` ensure Anvil is running, fund the test wallet via JSON-RPC (`anvil_setBalance`, `anvil_setStorageAt`), and stop Anvil if it was started by the test run.
- **Workers & timeouts**: E2E tests run with `workers: 1` and increased timeouts to avoid bootstrap warm-up flakes.
- **Projects**: Chromium (Firefox/WebKit can be added later if needed).

---

## Expected State Changes (What Tests Encode)

- **Staker assets**: deposit ↑ deposited & withdrawable; stake ↑ deposited & delegated; delegate ↑ delegated, ↓ withdrawable; undelegate ↓ delegated, ↑ withdrawable; claim/withdraw (BTC/XRP) ↓ deposited & withdrawable. Invariant: `deposited = withdrawable + delegated`.
- **Delegations**: stake/delegate ↑ delegated for operator; undelegate ↓ delegated; delegation removed when delegated ≤ 0.
- **Optimistic cache**: Pending tx applied only when `tx.blockHeight > record.updated_at_block`; cleared when indexer has indexed all affected records; cleared on bootstrap end and on chain switch (previous chain).

These rules are encoded in the merge tests and the optimistic-flow integration test so that future changes to merge or store behavior are caught by the suite.

---

## Test Checklists / Roadmap

This section tracks higher-level journeys and error-prone flows. Items already covered by existing tests are checked; the rest are targets for new tests.

### 1. Core staking flows (hooks + tabs)

- [x] **EVM LST staking hook**  
  - Tests in: `hooks/__tests__/useEVMLSTStaking.test.tsx`  
  - Cover:
    - Happy-path `deposit`, `depositAndDelegate`, `delegateTo`, `undelegateFrom`, `claimPrincipal`, `withdrawPrincipal`
    - Interaction with `storePendingTransaction` (operation type, amounts, operator, block height)
  - Remaining:
    - Explicit assertions on `handleEVMTxWithStatus` mode (`"local" | "simplex" | "duplex"`) for bootstrap vs post-bootstrap
- [ ] **Staking tabs / NST flows**  
  - Tests in: `components/tabs/__tests__/*.test.tsx` (in progress; `StakeTab.test.tsx`, `DelegateTab.test.tsx` added)  
  - Cover:
    - `StakeTab` amount step rendering and basic validation (empty amount disables Continue)
    - `DelegateTab` available balance display and initial disabled Continue button
  - Remaining:
    - Tests for `StakeNSTTab`, `VerifyTab`, `DelegateTab`, `UndelegateTab`, `WithdrawTab`
    - Disabled/hidden states when wallet is not connected or bootstrap constraints apply
    - Interaction tests that confirm the correct `StakingService` methods are invoked on submit

### 2. BTC / XRP cross-chain flows

- [ ] **Bitcoin staking hook (`useBitcoinStaking`)**  
  - Tests in: `hooks/__tests__/useBitcoinStaking.test.tsx` (planned)  
  - Cover:
    - OP_RETURN encoding (with and without operator, bootstrap vs post-bootstrap) and 80-byte limit errors
    - Guardrails: missing wallets, mismatched bound address, invalid params, pre-bootstrap delegate/undelegate/withdraw rejections
    - Provisional binding via `useAllWalletsStore.setProvisionalBinding` and `setBinding`
    - `storePendingTransaction` calls for `deposit`/`stake`, `delegate`, `undelegate`, `withdraw`
- [ ] **XRP staking hook (`useXRPStaking`)**  
  - Tests in: `hooks/__tests__/useXRPStaking.test.tsx` (planned)  
  - Cover:
    - Memo encoding (with and without operator, bootstrap vs post-bootstrap)
    - Guardrails similar to Bitcoin (GemWallet not connected, EVM not connected, mismatched bound address, pre-bootstrap delegate/undelegate/withdraw)
    - Provisional binding behavior and GraphQL rebinding refetch
    - `storePendingTransaction` calls for `deposit`/`stake`, `delegate`, `undelegate`, `withdraw`

### 3. Wallet connection & binding

- [ ] **Wallet connection modal & provider**  
  - Tests in: `components/modals/__tests__/WalletConnectionModal.test.tsx` (planned)  
  - Cover:
    - Each `WalletConnector` issue type (`needsInstallNative`, `needsConnectNative`, `needsSwitchNative`, `needsConnectBindingEVM`, `needsSwitchBindingEVM`, `needsMatchingAddress`)
    - Correct CTA text and that clicking invokes the appropriate resolver
    - Dual-wallet progress indicator for BTC/XRP (0/2, 1/2, 2/2)
- [ ] **All-wallets store & binding logic**  
  - Tests in: `stores/__tests__/allWalletsStore.test.ts` (planned)  
  - Cover:
    - `setWallet`, `setBasicWallet`, `setBinding`, `clearBinding`, `clearAllBindings`
    - `setProvisionalBinding` / `removeProvisionalBinding` for XRP vs BTC, including key format
    - `getQueryStakerAddress` behavior for EVM vs BTC/XRP networks (bound vs unbound)

### 4. Wallet providers & XRPL client

- [ ] **GemWallet store (`useGemWalletStore`)**  
  - Tests in: `stores/__tests__/gemWalletClient.test.ts` (planned)  
  - Cover:
    - Installation detection, connect/disconnect happy paths
    - 24h session expiry and manual disconnect semantics
    - `sendTransaction` branches: success, user refusal, generic failure, unsupported tx type
- [ ] **XRPL client store (`useXrplStore`)**  
  - Tests in: `stores/__tests__/xrplClient.test.ts` (planned)  
  - Cover:
    - `connect` reuse vs reconnect vs new client when network changes
    - `getAccountInfo` and `getTransactionStatus` success and error paths (no network, not connected, XRPL RPC error)

### 5. Optimistic updates end-to-end

- [x] **Operations helpers**  
  - Tests in: `types/__tests__/operations.test.ts`
- [x] **Optimistic merge functions**  
  - Tests in: `lib/__tests__/optimistic-merge.test.ts`
- [x] **Validator container helpers**  
  - Tests in: `lib/__tests__/validator-container.test.ts`
- [x] **GraphQL transformers (IDs)**  
  - Tests in: `lib/graphql/__tests__/transformers.test.ts`
- [x] **Optimistic helpers & store**  
  - Tests in: `lib/__tests__/optimistic-helpers.test.ts`, `stores/__tests__/optimisticCacheStore.test.ts`
- [x] **Optimistic cache cleanup hook**  
  - Tests in: `hooks/__tests__/useOptimisticCacheCleanup.test.tsx`
- [x] **Optimistic flow integration**  
  - Tests in: `__tests__/integration/optimistic-flow.test.ts`

### 6. Dashboard & staking UI flows

- [x] **Staking positions hook (`useStakingPositions`)**  
  - Tests in: `hooks/__tests__/useStakingPositions.test.ts`  
  - Cover:
    - Transformation from `useStakerBalances(validTokens)` results into a positions map keyed by `getTokenKey`
    - `boundImuaAddressNotSetup` path (zeroed position with correct `stakerAddress`)
    - Aggregated `isLoading` / `error` behavior across tokens
- [ ] **Dashboard page**  
  - Tests in: `app/__tests__/dashboard.page.test.tsx` (planned)  
  - Cover:
    - Sorting of tokens in “Your Positions” (non-zero, zero-but-present, undefined)
    - Card states per token: connect-wallet, empty-position, full position
    - Navigation to `/staking` via localStorage (`selectedStakingToken`, `selectedStakingTab` → `initialStakingTab`)
    - Summary metrics (`Total Value Staked`, rewards, network stats) with mocked hooks
- [ ] **New staking page / tab gating**  
  - Tests in: `app/__tests__/staking.page.test.tsx` (planned)  
  - Cover:
    - `availableTabs` logic: NST vs non-NST, bootstrap vs pre-bootstrap, `requireExtraConnectToImua`
    - Fallback to `stake` when a previously selected tab becomes invalid
    - “Connect to Start Staking” state vs tab content based on `WalletConnector.isReadyForStaking`

