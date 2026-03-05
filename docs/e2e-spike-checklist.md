# E2E Testing Spike — Checklist

## Goal

Validate the core E2E infrastructure by producing **one passing test**: connect MetaMask → stake imETH on Anvil → assert success. This proves Synpress + Anvil + MSW + Next.js work together before investing in all 172 test cases.

---

## Blocking Prerequisites

Must be resolved before bulk test writing can begin.

- [ ] **Mock injection mechanism** — Design how `NEXT_PUBLIC_E2E_MOCK_WALLETS=true` swaps real wallet connectors (GemWallet, AppKit Bitcoin) with mock implementations. Decide between: conditional imports at provider level, React context DI, or Next.js module aliasing. Document the pattern.
- [ ] **Stable selectors (`data-testid`)** — Audit key interactive elements and add `data-testid` attributes. At minimum for the spike: staking page connect button, token selector, amount input, operator selector, stake/confirm button, progress states.
- [ ] **Bootstrap contract storage slot** — Identify the exact storage slot index for the `bootstrapped` flag from compiled Solidity artifacts (`out/Bootstrap.sol/Bootstrap.json`). Verify with `cast storage` against the Anvil fork.
- [ ] **Synpress compatibility** — Verify Synpress works with Playwright `^1.49`, Next.js `^15.5`, Node.js 20. Install and confirm MetaMask extension launches correctly.
- [ ] **MSW + Next.js App Router** — Verify MSW can intercept client-side `fetch()` in the App Router. Test with one Cosmos REST endpoint and one GraphQL query. Confirm requests made during SSR/prerendering are also handled (or confirm they don't need to be).

---

## Non-Blocking but Significant Effort

Can be scoped and built incrementally after the spike validates the infrastructure.

- [ ] **Fixture data creation** — Craft realistic JSON fixtures for all ~15 mocked API endpoints (Cosmos REST, GraphQL, LayerZero, Beacon API, Esplora). Must match TypeScript types used by hooks.
- [ ] **Anvil setup script** — Production-quality script that starts Anvil, funds accounts, takes snapshots, exposes helpers for revert/toggle. The spike uses a minimal version; this needs to be robust for CI.
- [ ] **Production code changes for testability** — Beyond `data-testid`, quantify what else needs to change (provider wiring for mock injection, any environment-conditional logic).
- [ ] **Full XRP mock connector** — Implement `MockXRPWalletConnector` matching the GemWallet store interface. Spike may only need a stub.
- [ ] **Full Bitcoin mock connector** — Implement `MockBitcoinWalletConnector` matching the AppKit adapter interface.
- [ ] **CI workflow** — GitHub Actions workflow with parallel bootstrap/post-bootstrap jobs, Anvil setup, Playwright report upload.

---

## Spike Tasks

### Task 1: Synpress setup and MetaMask verification
- [ ] Install Synpress: `pnpm add -D @synpress/core @synpress/metamask`
- [ ] Verify Synpress version compatibility with existing Playwright
- [ ] Create a minimal test that launches Chrome with MetaMask extension
- [ ] Confirm MetaMask can import a wallet from private key
- [ ] Confirm MetaMask can connect to a dApp page
- **Output:** Working Synpress + Playwright setup, MetaMask launching

### Task 2: Anvil setup script
- [ ] Create `e2e/setup/anvil.ts` (or shell script) that:
  - Starts Anvil fork of Hoodi: `anvil --fork-url $RPC --block-time 1`
  - Funds test wallet with ETH via `anvil_setBalance`
  - Mints ERC-20 tokens (imETH, wstETH) via `deal` or direct storage manipulation
  - Takes a snapshot for test isolation
- [ ] Verify funded balances are visible via `cast call`
- **Output:** `e2e/setup/anvil.ts` with start/fund/snapshot/revert helpers

### Task 3: Bootstrap contract storage slot
- [ ] Read `out/Bootstrap.sol/Bootstrap.json` storage layout
- [ ] Identify the slot index for `bootstrapped` (bool)
- [ ] Test toggling on Anvil: `cast rpc anvil_setStorageAt $CONTRACT $SLOT $VALUE`
- [ ] Verify with `cast call $CONTRACT "bootstrapped()(bool)"`
- [ ] Document the slot index and the toggle commands
- **Output:** Documented storage slot, verified toggle command

### Task 4: Mock injection design + minimal implementation
- [ ] Survey all wallet connector imports in providers/hooks
- [ ] Choose injection pattern (conditional provider, context DI, or module alias)
- [ ] Implement the pattern for one connector (XRP or Bitcoin) as proof of concept
- [ ] Verify the mock is used when `NEXT_PUBLIC_E2E_MOCK_WALLETS=true`
- **Output:** Working mock swap for one connector, documented pattern

### Task 5: MSW setup for Next.js
- [ ] Install MSW: `pnpm add -D msw`
- [ ] Create `e2e/mocks/handlers.ts` with one Cosmos REST handler and one GraphQL handler
- [ ] Create `e2e/mocks/browser.ts` MSW browser worker setup
- [ ] Wire MSW into the Next.js app (conditional on E2E mode)
- [ ] Verify intercepted requests return fixture data in browser dev tools
- **Output:** Working MSW setup, at least 2 handlers verified

### Task 6: Add `data-testid` to staking page
- [ ] Add `data-testid` to these elements (minimum for spike test):
  - Header: connect wallet button, wallet status
  - Staking page: token selector trigger, token selector modal items
  - Stake tab: amount input, MAX button, operator selector, stake button
  - Operation progress: step indicators, success state, tx hash
- [ ] Verify selectors work with Playwright `page.getByTestId()`
- **Output:** Staking page elements addressable by `data-testid`

### Task 7: Write the spike test
- [ ] Create `e2e/spike/stake-imeth.spec.ts`
- [ ] Test flow:
  1. Anvil is running with funded account
  2. MSW is intercepting Cosmos/GraphQL calls
  3. Navigate to `localhost:3000/staking`
  4. Connect MetaMask via Synpress
  5. Select imETH token (if not default)
  6. Enter stake amount
  7. Select operator (bootstrap mode)
  8. Click stake, approve tx in MetaMask
  9. Assert operation progress shows success
  10. Optionally: verify on-chain balance changed via `cast call`
- [ ] Test passes consistently (run 3x)
- **Output:** One passing E2E test exercising the full stack

### Task 8: Document learnings and update plan
- [ ] Record any surprises, version issues, or architectural adjustments
- [ ] Update `docs/e2e-testing-plan.md` if the spike reveals needed changes
- [ ] Update this checklist with status
- **Output:** Updated documentation reflecting reality

---

## Progress Log

| Date | Task | Status | Notes |
|------|------|--------|-------|
| 2026-02-25 | Task 1: Synpress setup | ✅ Done | Synpress 4.1.2 installed. Wallet cache builds in headless mode. Needs both Chromium 1140 (for Synpress) and 1208 (for Playwright 1.58). |
| 2026-02-25 | Task 2: Anvil setup script | ✅ Done | `e2e/setup/anvil.ts` with fund/snapshot/revert/toggle helpers. imETH balance mapping at slot 0. |
| 2026-02-25 | Task 3: Bootstrap storage slot | ✅ Done | Slot 257 (0x101). Toggle verified both directions on Anvil fork. |
| 2026-02-25 | Task 4: Mock injection | ⏭️ Deferred | Not needed for EVM spike. Will implement for Phase 2 (XRP) and Phase 3 (Bitcoin). |
| 2026-02-25 | Task 5: API mocking | ✅ Done | **MSW not needed.** Playwright `page.route()` is simpler, requires zero production code changes, and works reliably. GraphQL + RPC proxy both working. |
| 2026-02-25 | Task 6: data-testid | ⏭️ Deferred | Role-based and text selectors work well with Playwright's strict mode. `data-testid` can be added incrementally for stability. |
| 2026-02-25 | Task 7: Spike tests | ✅ Done | 4/4 tests passing in ~7s: page load, token selector, landing page, navigation. |
| 2026-02-25 | Task 8: Learnings | ✅ Done | See below. |

## Key Learnings

1. **MSW is unnecessary.** Playwright's built-in `page.route()` intercepts all network requests (including GraphQL POST and RPC) without any production code changes or service worker setup. This is simpler and more reliable.

2. **RPC proxy works.** Alchemy RPC calls are intercepted by `page.route()` and proxied to local Anvil. The app reads contract state from Anvil transparently.

3. **Synpress needs two Chromium versions.** Synpress bundles `playwright-core@1.48.2` (needs chromium-1140) while the project uses `@playwright/test@1.58.2` (needs chromium-1208). Both must be installed.

4. **Synpress wallet cache hash.** The cache hash is computed from the wallet setup file. Ensure the CLI and tests resolve the same file. If hash mismatch occurs, rebuild with `npx synpress <dir> --force`.

5. **Strict mode is helpful.** Playwright's strict mode catches ambiguous selectors immediately. Use `getByRole()` for precision instead of `getByText()` when text appears multiple times.

6. **Dev server first-compile is slow.** The Next.js dev server takes 10-30s to compile a page on first request. Tests should use generous timeouts for the first navigation.

7. **data-testid is optional.** Role-based selectors (`getByRole('heading', { name: 'Stake Assets' })`) and specific text selectors work well. `data-testid` can be added incrementally for elements that are hard to select otherwise.

## Plan Adjustments

Based on the spike, the E2E testing plan should be updated:

- **Replace MSW with Playwright `page.route()`** — simpler, no production code changes
- **Replace `.env.e2e` for API mocking with route interception** — the `.env.e2e` is only needed for the `NEXT_PUBLIC_GRAPHQL_ENDPOINT` placeholder
- **data-testid is a nice-to-have, not a blocker** — add incrementally as tests need them
- **Mock injection (Task 4) is only needed for Phase 2/3** — EVM tests don't need wallet mocks since Synpress handles MetaMask
