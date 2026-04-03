## Phase 1 (EVM) E2E Testing — Progress Summary

Last updated: 2026-03-05  
Scope: Playwright + in-app mock EVM connector (or Synpress/MetaMask) on Anvil for imETH/wstETH/nstHoodlETH, covering the Phase 1 suites in `docs/e2e-testing-plan.md`.

---

### 1. High-Level Status

- **Infrastructure**: Core Phase 1 EVM test harness is in place. **In-app mock EVM connector** (`config/testWallet.ts` + `useEVMWalletConnector` when `NEXT_PUBLIC_E2E_MODE=true`) is implemented so tests can connect without an extension. Anvil, GraphQL/Cosmos mocking, and RPC proxy are ready.
- **Implemented tests**: Spike/smoke specs under `e2e/spike/` and **Phase 1 specs under `e2e/phase1/`**: wallet connection (connect, disconnect, reconnect), token selector (open, search, select, no results), operator modal (open, search, no results, select, cancel), and stake flow (amount + operator + continue to review, zero-amount validation).
- **Coverage vs Phase 1 plan**: **Expanded** — §1.1 landing/nav, §1.2 wallet (connect/disconnect/reconnect; details modal and copy/explorer not yet), §1.3 token selector (1–4, 6), §1.4 operator modal (1, 2, 4, 11, 12), §1.5.1 stake flow up to review step. **Remaining**: full stake/approval tx (blocked by mock not signing — see Finding 7), delegate/undelegate/claim/withdraw, NST, operation progress, optimistic updates, error messages.
- **Findings/blockers**: See `docs/e2e-findings.md`. **Blocker**: Finding 7 — `@wagmi/core` mock does not sign transactions; full stake submit fails. **Non-blockers**: tab visibility (1), two-step connect (2), disconnect via View Details (6), etc. Finding 5 resolved (in-app mock connector).

---

### 2. Infrastructure Readiness (from `docs/e2e-spike-checklist.md` + code)

- **Synpress + Playwright**
  - **Status**: ✅ Synpress 4.1.2 installed and working with Playwright 1.58 and Node 20.
  - `e2e/spike/stake-imeth.spec.ts` demonstrates `testWithSynpress` with `metaMaskFixtures` and `MetaMask` control.
  - Dual Chromium requirement (1140 for Synpress, 1208 for Playwright) documented and handled.

- **Anvil setup & bootstrap toggling**
  - **Status**: ✅ Implemented in `e2e/setup/anvil.ts`.
  - Capabilities:
    - Start/stop Anvil fork against Hoodi (`startAnvil`, `stopAnvil`).
    - Fund ETH via `anvil_setBalance` (`fundETH`).
    - Mint imETH/wstETH by writing ERC-20 balance mappings directly (`fundERC20`).
    - Toggle bootstrap phase via `anvil_setStorageAt` on the known `bootstrapped` slot (slot 257) (`setBootstrapped`, `isBootstrapped`).
    - Snapshot/revert Anvil state (`takeSnapshot`, `revertSnapshot`).

- **Network mocking / routing**
  - **Status**: ✅ Implemented and used in tests.
  - `e2e/setup/graphql-mocks.ts` and `e2e/setup/test-harness.ts`:
    - Intercept GraphQL POST requests by `operationName` and respond with default fixtures (validators, operator assets, stats, etc.).
  - `e2e/setup/rpc-proxy.ts` and `setupTestHarness`:
    - Route EVM JSON-RPC calls to Alchemy and `exocore-restaking.com` through the local Anvil RPC.
  - Cosmos REST calls are mocked with simple empty JSON responses for now.

- **Playwright config**
  - **Status**: ✅ `e2e/playwright.config.ts` is wired for E2E:
    - `baseURL` is configurable (defaults to `http://localhost:3000`, matching `pnpm dev`).
    - Single Chromium desktop project, 60s test timeout, HTML report output to `playwright-report-e2e`.

- **Selectors / `data-testid`**
  - **Status**: ⚠️ Partial.
  - Some critical elements already have `data-testid` and are used in tests:
    - `staking-heading`, `token-selector-button`, `token-search-input`, `token-row-*`, `connect-wallet-cta`, `header-logo`, `nav-dashboard`, `nav-stake`, `wallet-status-button`, `tab-stake`, `tab-delegate`, `tab-undelegate`.
  - The broader `data-testid` coverage envisioned in the plan is still **incomplete**, especially around operator modals, NST flows, operation progress, and error banners.

- **Mock EVM connector (Phase 1)**
  - **Status**: ✅ Implemented.
  - When `NEXT_PUBLIC_E2E_MODE=true` (e.g. via `.env.e2e`), `useEVMWalletConnector` uses wagmi `connectAsync` with `@wagmi/core` mock connector (`config/testWallet.ts`) instead of opening RainbowKit. No extension required. Dev server must be started with E2E env for Phase 1 specs to pass.
- **Mock wallet injection (Phase 2/3 — XRP/BTC)**
  - **Status**: 🚧 Deferred. `NEXT_PUBLIC_E2E_MOCK_WALLETS` not yet implemented for GemWallet/AppKit Bitcoin.

---

### 3. Implemented Tests vs Phase 1 Suites

This section maps **Phase 1** suites from `docs/e2e-testing-plan.md` to the **current automated coverage** in `e2e/`.

#### 3.1 Landing Page & Navigation (Section 1.1)

- **Relevant specs**
  - `e2e/spike/page-load.spec.ts`
  - `e2e/smoke.spec.ts`
- **Automated coverage**
  - Landing page loads and shows core content:
    - Checks `Welcome to IMUA`, `Get started`, `View dashboard` on `/`.
  - Staking page navigation:
    - Clicks `Get started` and verifies navigation to `/staking`.
  - Header basics:
    - Verifies header logo and nav items (`nav-dashboard`, `nav-stake`) on staking page.
- **Status vs plan**
  - **Partially covered**:
    - Happy path tests 1–3 and 5 are effectively covered (landing load, navigation via Staking card, header logo, and header elements).
  - **Not yet covered**:
    - Hover state visuals (test 4).
    - Active nav state styling (test 6).

#### 3.2 Wallet Connection (Section 1.2)

- **Relevant specs**
  - `e2e/phase1/wallet-connection.spec.ts` (in-app mock; no extension)
  - `e2e/spike/stake-imeth.spec.ts` (MetaMask via Synpress)
  - `e2e/spike/metamask-connect.spec.ts` (Synpress mock)
- **Automated coverage**
  - **Connect** (1.2.1, 1.2.2): Click `connect-wallet-cta` or header dropdown → WalletConnectionModal → "Connect Wallet" → wagmi connectAsync with mock (E2E mode); assert connect CTA and "Not Connected" disappear.
  - **Disconnect** (1.2.5): Header → View Details → Disconnect in WalletDetailsModal (Finding 6: plan says "click Disconnect" in dropdown; impl has one extra step).
  - **Reconnect** (1.2.6): Disconnect then connect again via CTA.
- **Status vs plan**
  - **Covered**: 1.2.1, 1.2.2, 1.2.5, 1.2.6.
  - **Not yet covered**: 1.2.2 reject, 1.2.3 wrong network, 1.2.4 switch network, 1.2.7 wallet details modal content, 1.2.8 copy address, 1.2.9 explorer link, 1.2.10 disconnect from details modal (we use View Details → Disconnect).

#### 3.3 Token Selector (Section 1.3)

- **Relevant specs**
  - `e2e/phase1/token-selector.spec.ts`
  - `e2e/spike/page-load.spec.ts`
- **Automated coverage**
  - 1.3.1: Open selector, see all tokens (imETH, wstETH, XRP).
  - 1.3.2: Search "Wrapped" → wstETH only.
  - 1.3.3: Search "XRP" → XRP row visible.
  - 1.3.4: Search "NONEXISTENT" → "No tokens found matching" and no token rows.
  - 1.3.6: Select wstETH → modal closes, context shows wstETH.
- **Status vs plan**
  - **Covered**: 1.3.1, 1.3.2, 1.3.3, 1.3.4, 1.3.6.
  - **Not yet covered**: 1.3.5 clear search, 1.3.7 selected indicator, 1.3.8 switch token mid-flow, 1.3.9 scroll fade.

#### 3.4 Operator Selection Modal (Section 1.4)

- **Relevant specs**
  - `e2e/phase1/operator-modal.spec.ts`
- **Automated coverage**
  - 1.4.1: Connect → Stake tab → "Select" → operator modal with list (fixture: GetBootstrapValidators).
  - 1.4.2: Search "Alpha" → operator row for Test Operator Alpha visible.
  - 1.4.4: Search "NONEXISTENTXYZ" → "No operators found matching your search".
  - 1.4.11: Click operator row → selection applied, "Test Operator Alpha" shown on stake tab.
  - 1.4.12: Open modal → Cancel → modal closes, "Select" still shown.
- **Status vs plan**
  - **Covered**: 1.4.1, 1.4.2, 1.4.4, 1.4.11, 1.4.12.
  - **Not yet covered**: 1.4.3 search by address, 1.4.5–1.4.10 sort/results count/banner, 1.4.13–1.4.14 persistence.

#### 3.5 LST Staking (imETH / wstETH) (Section 1.5)

- **Relevant specs**
  - `e2e/phase1/stake-flow.spec.ts`
  - `e2e/spike/stake-imeth.spec.ts`
  - `e2e/spike/page-load.spec.ts`
- **Automated coverage**
  - 1.5.1 (partial): Connect → Stake tab → amount 0.1 → select operator → Continue → review step with submit button and operator name. **Full submit not asserted**: mock connector does not sign txs (Finding 7).
  - 1.5.7: Amount "0" + operator selected → Continue button disabled.
- **Status vs plan**
  - **Partially covered**: Stake flow up to review (1.5.1); zero-amount validation (1.5.7).
  - **Blocker**: Actual stake/approval tx success requires a connector that signs (custom connector with walletClient or real MetaMask).
  - **Not yet covered**: 1.5.2–1.5.6 (post-bootstrap, deposit-only, approval flow, MAX, etc.), 1.5.8–1.5.15; delegate, undelegate, claim, withdraw.

#### 3.6 NST Staking (nstHoodlETH) (Section 1.6)

- **Relevant specs**
  - **None yet.**
- **Status vs plan**
  - **Not started**:
    - No automated tests yet for capsule management, NST stake, verify & deposit, or NST delegate/withdraw behavior.

#### 3.7 Operation Progress & Cross-Chain (Section 1.7)

- **Relevant specs**
  - **None yet.**
- **Status vs plan**
  - **Not started**:
    - No tests yet for progress stepper states (local/simplex/duplex), tx hash visibility, "keep window open" warning, confirmation time estimates, or error progress paths.

#### 3.8 Bootstrap Phase Specifics (Section 1.8)

- **Relevant specs**
  - `e2e/spike/page-load.spec.ts`
  - Observations captured in `docs/e2e-findings.md`.
- **Automated coverage**
  - Staking page bootstrap tab visibility:
    - Tests assert Stake, Delegate, and Undelegate tabs are present for LSTs in bootstrap mode.
  - However, the findings log notes a discrepancy:
    - Withdraw tab currently appears for imETH in bootstrap, which conflicts with the plan (LST bootstrap should not show Withdraw).
- **Status vs plan**
  - **Partially covered + design/impl mismatch**:
    - Tab visibility is asserted in tests, but the implementation does not yet match the Phase 1 spec for bootstrap vs post-bootstrap withdraw behavior.

#### 3.9 Optimistic Updates (Section 1.9)

- **Relevant specs**
  - **None yet.**
- **Status vs plan**
  - **Not started**:
    - No tests verifying optimistic dashboard entries, merge with real data, or persistence across page refresh.

#### 3.10 Error Message Display (Section 1.10)

- **Relevant specs**
  - **None yet.**
- **Status vs plan**
  - **Not started**:
    - No automated coverage of insufficient funds, user rejection, or long error truncation behavior.

---

### 4. Current Test Inventory (Phase 1 Relevant)

- **`e2e/phase1/wallet-connection.spec.ts`** (requires `NEXT_PUBLIC_E2E_MODE=true`)
  - 1.2.1 Connect via staking CTA (mock; no extension).
  - 1.2.2 Connect via header dropdown.
  - 1.2.5 Disconnect (View Details → Disconnect).
  - 1.2.6 Reconnect after disconnect.

- **`e2e/phase1/token-selector.spec.ts`**
  - 1.3.1 Open selector, all tokens; 1.3.2 search "Wrapped"; 1.3.3 search "XRP"; 1.3.4 no results; 1.3.6 select token.

- **`e2e/phase1/operator-modal.spec.ts`** (requires wallet connected + E2E mock)
  - 1.4.1 Open from Stake tab; 1.4.2 search by name; 1.4.4 no results; 1.4.11 select row; 1.4.12 cancel.

- **`e2e/phase1/stake-flow.spec.ts`**
  - 1.5.1 Connect → amount → operator → continue to review.
  - 1.5.7 Zero amount → Continue disabled.

- **`e2e/spike/page-load.spec.ts`**
  - Staking page loads, token selector, tabs, landing, header, navigation.

- **`e2e/spike/stake-imeth.spec.ts`** (Synpress + MetaMask)
  - Staking page + MetaMask add network + connect.

- **`e2e/spike/metamask-connect.spec.ts`** (Synpress mock)
  - Connect via CTA and via header.

- **`e2e/smoke.spec.ts`**
  - Smoke: `/` and `/staking` load.

---

### 5. Findings and Open Questions (Impacting Phase 1)

From `docs/e2e-findings.md` (see table for Category: Blocker vs Non-blocker). **Key**: Finding 5 resolved (in-app mock connector). Finding 7 **blocker** (mock does not sign txs). Finding 6 non-blocker (disconnect via View Details).

- **Finding 1 — Withdraw tab in bootstrap**
  - Plan: LST bootstrap phase should show only Stake, Delegate, Undelegate (no Withdraw).
  - Actual: Withdraw tab visible for imETH in bootstrap/pre-lock.
  - Impact: Tests must either be updated to the **final intended design** or the implementation adjusted to match the spec before more Phase 1 tab-visibility tests are added.

- **Finding 2 — Double connection step for EVM**
  - Wallet connect CTA opens `WalletConnectionModal`, which then opens RainbowKit.
  - For EVM-only tokens, this may be an unnecessary extra click, but could be intentional for future multi-wallet UX.
  - Impact: Tests currently work around this, but final UX decisions should be reflected in both spec and selectors.

- **Findings 3–5 — MetaMask / mock provider integration**
  - Real MetaMask onboarding & Synpress wallet cache hashing are unstable.
  - `EthereumWalletMock`’s injected `window.ethereum` may not fully match RainbowKit’s MetaMask expectations.
  - Impact: Before implementing full staking flows, we should:
    - Decide whether to standardize on **mock provider** for CI (safer, faster), or
    - Harden real MetaMask setup and codify it in the harness.

---

### 6. Suggested Next Steps to Complete Phase 1

1. **Unblock full stake submit (Finding 7)**
   - Implement a custom wagmi connector (or use a mock that provides a real viem `WalletClient` pointing at Anvil) so approval and stake transactions can be signed in E2E; or run a smaller set of "full tx" tests with Synpress + real MetaMask and Anvil.

2. **Run Phase 1 specs**
   - **Prerequisites:** Dev server must be running with E2E env so the mock connector is used. Playwright expects the app at **port 3000** by default (same as `pnpm dev`). If your app runs on another port, set `BASE_URL` (e.g. `BASE_URL=http://localhost:3001 pnpm test:e2e`).
   - **Steps:** (1) Start dev server with E2E env, e.g. `env $(grep -v '^#' .env.e2e | xargs) pnpm dev` (keeps your existing `.env`; app listens on 3000). (2) In another terminal, start Anvil if you use RPC: `anvil` (default port 8545). (3) Run `pnpm test:e2e` or `pnpm exec playwright test --config=e2e/playwright.config.ts e2e/phase1`.
   - **Timeouts:** Next.js dev first-compile can take 30–60s. Config uses 120s test timeout, 90s navigation timeout, and `waitUntil: "domcontentloaded"` so the first load can finish. If you still see timeouts, warm up the app once (e.g. open http://localhost:3000/staking in a browser) before running tests.

3. **Resolve bootstrap/tab design (Finding 1)** and **disconnect UX (Finding 6)** if product wants plan and UI aligned.

4. **Add remaining Phase 1 cases**
   - Wallet: details modal, copy address, explorer link.
   - Token selector: clear search, selected indicator, switch token mid-flow.
   - Operator: sort, results count, bootstrap banner, persistence.
   - LST: delegate, undelegate, claim, withdraw; negative cases (exceeds balance, reject tx).
   - Operation progress, optimistic updates, error message display.

In summary, **Phase 1 wallet connection is unblocked by the in-app mock**. **New Phase 1 specs** in `e2e/phase1/` cover wallet connect/disconnect/reconnect, token selector, operator modal, and stake flow up to review; **full stake tx success remains blocked** until the mock (or an alternative) can sign transactions.

