## E2E Test Cases — Bootstrap Phase 1 (EVM)

This document lists **designed test cases** for **Bootstrap Phase 1 (EVM)** based on the baseline in `e2e-bootstrap-user-flow-spec.md`.  
They are grouped by spec section; each case can be mapped to one or more Playwright tests under `e2e/phase1/`.

**State changes**: The user-flow spec references [state-changes.md](./state-changes.md) for balance effects of each operation. Test cases that require signing (marked `yes` in the last column) should assert the corresponding state changes below.

| Flow | state-changes.md | State change to assert | Test case(s) |
|------|------------------|------------------------|--------------|
| Deposit only | §2.1 | Wallet ↓; Total Deposited ↑; Claimable ↑ | P1-5.9 (ui), P1-5.10 (signing) |
| Stake | §2.2 | Wallet ↓; Total Deposited ↑; Delegated ↑; Claimable unchanged (success) | P1-5.8 |
| Delegate | §2.3 | Claimable ↓; Delegated ↑; Total Deposited unchanged | P1-6.1 |
| Undelegate | §2.4 | Delegated ↓; Claimable ↑; Total Deposited unchanged | P1-7.1 |
| Claim | §2.5 | Bootstrap claimable ↓; vault withdrawable ↑ | P1-9.4 |
| Withdraw | §2.6 | Vault withdrawable ↓; wallet ↑ | P1-10.4 |
| (no change) | — | Reject tx → no balance/state change (any operation: stake, delegate, undelegate, claim, withdraw) | P1-11.2 (stake), P1-11.3 (withdraw); same assertion applies if delegate/undelegate/claim tx is rejected |

Columns:

- **ID**: Stable identifier (`P1-<section>.<index>`).
- **Type**: `Happy` / `Negative`.
- **Requires signing**: `yes` if it needs a signing-capable wallet to assert on-chain effects; `ui-only` if UI behaviour is sufficient with the current mock connector.

---

### 1. Entry and navigation

| ID | Type | Precondition | Steps | Expected | Requires signing |
|----|------|--------------|-------|----------|------------------|
| P1-1.1 | Happy | App running | Open `/` | IMUA branding visible; Staking and Dashboard cards shown. | ui-only |
| P1-1.2 | Happy | `/` loaded | Click Staking card CTA (e.g. “Get started”) | Navigates to `/staking`. | ui-only |
| P1-1.3 | Happy | `/` loaded | Click Dashboard card CTA (e.g. “View dashboard”) | Navigates to `/dashboard`. | ui-only |
| P1-1.4 | Happy | Navigated to `/staking` and `/dashboard` | Observe header nav while on each page | Active nav item matches current route; others are inactive. | ui-only |
| P1-1.5 | Happy | Any page | Click logo in header | Navigates to `/`. | ui-only |

---

### 2. Wallet connection (EVM, mock connector)

| ID | Type | Precondition | Steps | Expected | Requires signing |
|----|------|--------------|-------|----------|------------------|
| P1-2.1 | Happy | `/staking` loaded; wallet not connected | Observe main content | Clear “Connect Wallet” CTA is visible; stake/delegate/undelegate actions disabled until connected. | ui-only |
| P1-2.2 | Happy | `/staking` loaded; wallet not connected | Click Connect CTA → WalletConnectionModal → choose EVM wallet (mock) | Wallet connects; header shows truncated address+balance; connect CTA hidden. | ui-only |
| P1-2.3 | Happy | Wallet connected | Open header wallet dropdown/details | Modal shows address, basic info (balance/chain). | ui-only |
| P1-2.4 | Happy | Wallet connected | Header dropdown → View Details → Disconnect | Wallet disconnected; header shows “Not Connected”; staking CTAs require reconnect. | ui-only |
| P1-2.5 | Happy | Wallet disconnected via dropdown | Click Connect CTA again and complete flow | Wallet reconnects; staking UI usable again. | ui-only |
| P1-2.6 | Happy | `/staking` loaded; wallet not connected | Click header `wallet-status-button` → choose “Connect EVM Wallet” (or similar) | Wallet connects via header path; status no longer contains “Not Connected”. | ui-only |

---

### 3. Token selection

| ID | Type | Precondition | Steps | Expected | Requires signing |
|----|------|--------------|-------|----------|------------------|
| P1-3.1 | Happy | `/staking` loaded | Click token selector trigger | Token selection modal opens with supported tokens (e.g. imETH, wstETH, XRP, tBTC). | ui-only |
| P1-3.2 | Happy | Token selector open | Search by name (e.g. “wrapped”) | Matching tokens (e.g. wstETH) remain; others filtered. | ui-only |
| P1-3.3 | Happy | Token selector open | Search by symbol (e.g. “imETH”) | Matching token row visible. | ui-only |
| P1-3.4 | Negative | Token selector open | Search with no match (e.g. “NOT_A_TOKEN”) | Empty list or “No tokens found” message shown. | ui-only |
| P1-3.5 | Happy | Token selector open | Select imETH row | Modal closes; staking context set to imETH; trigger label shows imETH. | ui-only |
| P1-3.6 | Happy | imETH selected | Open selector; observe current token row | imETH row marked as selected (e.g. checkmark). | ui-only |
| P1-3.7 | Happy | imETH selected; amount entered | Switch token to wstETH | Amount cleared or reset appropriately; context shows wstETH; tabs reflect wstETH capabilities. | ui-only |

---

### 4. Tab visibility (bootstrap)

| ID | Type | Precondition | Steps | Expected | Requires signing |
|----|------|--------------|-------|----------|------------------|
| P1-4.1 | Happy | Wallet connected; imETH selected; bootstrap phase | Observe tabs on `/staking` | Tabs present: **Stake**, **Delegate**, **Undelegate**, **Withdraw** for LST. | ui-only |
| P1-4.2 | Happy | Wallet connected; NST token selected; bootstrap phase | Observe tabs | Tabs present: **Stake**, **Verify**, **Delegate**, **Undelegate**; **no Withdraw** tab. | ui-only |
| P1-4.3 | Negative | Switch from LST (with Withdraw tab) to NST | Observe tabs | Withdraw tab disappears; Verify tab appears; current tab resets to a valid default (e.g. Stake). | ui-only |

---

### 5. Stake and deposit flows (LST, bootstrap)

**Deposit only** (when UI offers it): per user-flow spec §5.1 and state-changes §2.1. **Stake** (deposit + delegate): §5.2 and §2.2.

| ID | Type | Precondition | Steps | Expected | Requires signing |
|----|------|--------------|-------|----------|------------------|
| P1-5.1 | Happy | Wallet connected; imETH selected; Stake tab active; funded wallet | Enter valid amount; click Continue → operator modal → select operator → confirm; reach review step | Review displays correct amount, selected operator, and operation type; Submit button enabled. | ui-only |
| P1-5.2 | Negative | Same as above | Enter `0` as amount | Continue button disabled; validation message (e.g. “Amount must be greater than 0”). | ui-only |
| P1-5.3 | Negative | Same as above; limited balance | Enter amount > wallet balance | Error “Amount exceeds balance” (or equivalent); Continue disabled. | ui-only |
| P1-5.4 | Negative | Same as P1-5.1 | Click Continue without operator selection (if allowed) | User cannot reach review without selecting operator (button disabled or error). | ui-only |
| P1-5.5 | Happy | Same as P1-5.1; balance > 0 | Click MAX; click Continue; select operator; reach review | Amount equals full available balance; review shows full amount. | ui-only |
| P1-5.6 | Happy | On review step after P1-5.1 | Click “Edit amount” / equivalent; change amount; proceed again | Flow returns to amount step with previous value; new amount reflected in subsequent review. | ui-only |
| P1-5.7 | Happy | On review step after P1-5.1 | Click “Change operator”; pick different operator | Review updates to show new operator; amount unchanged. | ui-only |
| P1-5.8 | Happy | On review step after P1-5.1; signing-capable wallet | Click Submit and approve tx | On-chain stake recorded; **state changes** per [state-changes.md](./state-changes.md) §2.2: wallet ↓, total deposited ↑, delegated ↑ (claimable unchanged). | yes |
| P1-5.9 | Happy | Wallet connected; imETH selected; Stake tab shows "Deposit only" mode | Select Deposit only; enter valid amount; confirm (no operator) | Deposit-only flow completes to review/submit; no operator step. | ui-only |
| P1-5.10 | Happy | Same as P1-5.9; signing-capable wallet | Confirm deposit-only and approve tx | On-chain deposit recorded; **state changes** per §2.1: wallet ↓, total deposited ↑, claimable ↑. | yes |

---

### 6. Delegate flow (bootstrap)

| ID | Type | Precondition | Steps | Expected | Requires signing |
|----|------|--------------|-------|----------|------------------|
| P1-6.1 | Happy | Wallet connected; imETH selected; Delegate tab active; claimable balance > 0 | Select operator; enter valid amount ≤ claimable; confirm | Delegation recorded; **state changes** per §2.3: claimable ↓, delegated ↑, total deposited unchanged. | yes |
| P1-6.2 | Negative | Same as above | Enter amount `0` | Submit disabled; inline validation error. | ui-only |
| P1-6.3 | Negative | Same as above | Enter amount greater than withdrawable/claimable balance | Error or disabled submit; no tx sent. | ui-only |
| P1-6.4 | Negative | Same as above | No operator selected; attempt to submit | Submit blocked; message to select operator. | ui-only |

---

### 7. Undelegate flow (bootstrap)

| ID | Type | Precondition | Steps | Expected | Requires signing |
|----|------|--------------|-------|----------|------------------|
| P1-7.1 | Happy | Wallet connected; imETH selected; Undelegate tab active; at least one active delegation | Select operator/delegation; enter valid amount ≤ delegated; confirm | Instant undelegation recorded; **state changes** per §2.4: delegated ↓, claimable ↑, total deposited unchanged. | yes |
| P1-7.2 | Negative | Same as above | Enter amount `0` | Submit disabled; validation error. | ui-only |
| P1-7.3 | Negative | Same as above | Enter amount greater than delegated for that operator | Error message; no tx. | ui-only |
| P1-7.4 | Negative | Wallet connected; no delegations for token | Open Undelegate tab | Empty state displayed (e.g. “No active delegations”). | ui-only |

---

### 8. Operator selection (shared)

| ID | Type | Precondition | Steps | Expected | Requires signing |
|----|------|--------------|-------|----------|------------------|
| P1-8.1 | Happy | Wallet connected; Delegate or Stake flow in amount step | Open operator modal | Operator list shows basic info (name, address, commission, metrics). | ui-only |
| P1-8.2 | Happy | Operator modal open | Search by operator name | List filters to matching operators. | ui-only |
| P1-8.3 | Happy | Operator modal open | Search by partial address | Matching operator found. | ui-only |
| P1-8.4 | Negative | Operator modal open | Search for non-existing operator | “No operators found matching your search” (or equivalent). | ui-only |
| P1-8.5 | Happy | Operator modal open; some operator pre-selected | Click Cancel / close without new selection | Previous operator selection preserved in parent form. | ui-only |
| P1-8.6 | Happy | Select operator for imETH; confirm; close modal; later re-open | Last selected operator is pre-selected/restored (per token). | ui-only |

---

### 9. Claim flow (LST, bootstrap)

Per [e2e-bootstrap-user-flow-spec.md](./e2e-bootstrap-user-flow-spec.md) §9, **claim** moves tokens from Bootstrap claimable into vault withdrawable; user must claim before they can withdraw.

| ID | Type | Precondition | Steps | Expected | Requires signing |
|----|------|--------------|-------|----------|------------------|
| P1-9.1 | Happy | Wallet connected; imETH selected; Withdraw tab active; >0 claimable balance | Open Claim sub-step; enter valid amount ≤ claimable; confirm (or reach review) | Claim/confirm button enabled; review (if present) shows correct amount. | ui-only |
| P1-9.2 | Negative | Same as above | Enter `0` as amount | Claim button disabled; validation error. | ui-only |
| P1-9.3 | Negative | Same as above | Enter amount greater than claimable | Error (e.g. "Amount exceeds claimable"); submit disabled. | ui-only |
| P1-9.4 | Happy | Same as P1-9.1; signing-capable wallet | Confirm claim and approve tx | On-chain claim executed; **state changes** per §2.5: Bootstrap claimable ↓, vault withdrawable ↑. | yes |
| P1-9.5 | Negative | Zero claimable balance (fixture) | Open Withdraw tab → Claim | Claim UI shows zero or disabled; user can still use Withdraw if vault withdrawable > 0. | ui-only |

---

### 10. Withdraw flow (LST, bootstrap)

User must have vault withdrawable balance (after **claim** or prior unlock) before withdrawing to wallet.

| ID | Type | Precondition | Steps | Expected | Requires signing |
|----|------|--------------|-------|----------|------------------|
| P1-10.1 | Happy | Wallet connected; imETH selected; Withdraw tab active; >0 vault withdrawable balance | Enter valid amount ≤ withdrawable; confirm (or reach review) | Withdraw/confirm button enabled; review (if present) shows correct amount. | ui-only |
| P1-10.2 | Negative | Same as above | Enter `0` as amount | Withdraw button disabled; validation error. | ui-only |
| P1-10.3 | Negative | Same as above | Enter amount greater than withdrawable | Error (e.g. "Amount exceeds withdrawable"); submit disabled. | ui-only |
| P1-10.4 | Happy | Same as P1-10.1; signing-capable wallet | Confirm withdraw and approve tx | On-chain withdraw executed; **state changes** per §2.6: vault withdrawable ↓, wallet ↑. | yes |
| P1-10.5 | Negative | NST token selected | Open tabs | No Withdraw tab present for NST; trying to navigate to Withdraw (e.g. via URL or stale state) redirects to a valid tab. | ui-only |

---

### 11. Error and edge cases

| ID | Type | Precondition | Steps | Expected | Requires signing |
|----|------|--------------|-------|----------|------------------|
| P1-11.1 | Negative | Bootstrap contract in locked period (test fixture) | Open staking page, attempt to perform stake/delegate/undelegate | Staking operations disabled; clear message indicating bootstrap is locked. | ui-only |
| P1-11.2 | Negative | Signing-capable wallet; stake flow ready | Initiate stake/approve tx; reject in wallet | UI shows “Transaction rejected by user” (or equivalent); **no state change** (balances unchanged per state-changes). | yes |
| P1-11.3 | Negative | Signing-capable wallet; withdraw ready | Initiate withdraw tx; reject in wallet | UI shows rejection; **no state change** (vault withdrawable and wallet unchanged). | yes |
| P1-11.4 | Negative | Network/API failure fixture (e.g. GraphQL down) | Attempt to open staking page or operator modal | Graceful error state (non-blank page), error message, retry controls where applicable. | ui-only |

