## E2E Checklist — Bootstrap Phase 1 (EVM)

This checklist tracks **implementation status** of the Phase 1 EVM test cases defined in `e2e-phase1-evm-test-cases.md`.  
Update the checkboxes as tests are added or removed; keep IDs in sync with the test cases doc.

Legend:

- **[ ]** Not yet covered by E2E tests.
- **[x]** Covered by at least one E2E test.
- **(signing)** Case requires a signing-capable wallet to assert on-chain effects; may be deferred until the harness supports signing.

At creation time, all items are unchecked; fill them in as work progresses.

---

### 1. Entry and navigation

- [x] P1-1.1 — Landing page loads.
- [x] P1-1.2 — Staking card navigates to `/staking`.
- [x] P1-1.3 — Dashboard card navigates to `/dashboard`.
- [x] P1-1.4 — Header nav active state matches route.
- [x] P1-1.5 — Header logo links home.

### 2. Wallet connection (EVM, mock connector)

- [x] P1-2.1 — Not connected state: CTA visible, actions gated.
- [x] P1-2.2 — Connect via CTA → WalletConnectionModal → mock EVM wallet.
- [x] P1-2.3 — Header wallet details modal.
- [x] P1-2.4 — Disconnect from header; status resets to “Not Connected”.
- [x] P1-2.5 — Reconnect after disconnect.
- [x] P1-2.6 — Connect via header dropdown (`wallet-status-button`).

### 3. Token selection

- [x] P1-3.1 — Open token selector.
- [x] P1-3.2 — Search by name.
- [x] P1-3.3 — Search by symbol.
- [x] P1-3.4 — “No tokens found” state.
- [x] P1-3.5 — Select imETH and update context.
- [x] P1-3.6 — Selected token indicated in selector.
- [x] P1-3.7 — Switch token mid-flow resets context appropriately.

### 4. Tab visibility (bootstrap)

- [x] P1-4.1 — LST tabs: Stake / Delegate / Undelegate / Withdraw.
- [x] P1-4.2 — NST tabs: Stake / Verify / Delegate / Undelegate (no Withdraw).
- [x] P1-4.3 — Switching from LST to NST removes Withdraw and adds Verify.

### 5. Stake and deposit flows (LST, bootstrap)

- [x] P1-5.1 — Happy path to review (amount → operator → review).
- [x] P1-5.2 — Zero amount disables Continue.
- [x] P1-5.3 — Amount above balance shows error and blocks Continue.
- [ ] P1-5.4 — No operator selection prevents reaching review.
- [x] P1-5.5 — MAX button uses full balance.
- [x] P1-5.6 — Edit amount from review preserves flow.
- [x] P1-5.7 — Change operator from review updates summary.
- [ ] P1-5.8 — (signing) On-chain stake success and state update.
- [x] P1-5.9 — Deposit-only mode: flow to review/submit without operator (when UI offers it).
- [ ] P1-5.10 — (signing) Deposit-only on-chain success; state changes per §2.1.

### 6. Delegate flow (bootstrap)

- [ ] P1-6.1 — (signing) Delegate with valid operator and amount.
- [x] P1-6.2 — Zero amount validation.
- [x] P1-6.3 — Amount above available delegation.
- [x] P1-6.4 — Missing operator blocks submit.

### 7. Undelegate flow (bootstrap)

- [ ] P1-7.1 — (signing) Instant undelegation succeeds and updates balances.
- [x] P1-7.2 — Zero amount validation.
- [x] P1-7.3 — Amount above delegated validation.
- [x] P1-7.4 — Empty-state UI when no delegations.

### 8. Operator selection (shared)

- [x] P1-8.1 — Operator modal opens with list.
- [x] P1-8.2 — Search by name filters correctly.
- [x] P1-8.3 — Search by address filters correctly.
- [x] P1-8.4 — “No operators found” state.
- [x] P1-8.5 — Cancel preserves previous selection.
- [ ] P1-8.6 — Last operator selection restored per token.

### 9. Claim flow (LST, bootstrap)

- [ ] P1-9.1 — Claim UI happy path (valid amount ≤ claimable, enabled confirm).
- [x] P1-9.2 — Zero amount validation.
- [x] P1-9.3 — Amount above claimable validation.
- [ ] P1-9.4 — (signing) On-chain claim success; vault withdrawable increases.
- [ ] P1-9.5 — Zero claimable: Claim UI shows zero/disabled; Withdraw still usable if withdrawable > 0.

### 10. Withdraw flow (LST, bootstrap)

- [ ] P1-10.1 — Withdraw UI happy path (valid amount ≤ withdrawable, enabled confirm).
- [ ] P1-10.2 — Zero amount validation.
- [ ] P1-10.3 — Amount above withdrawable validation.
- [ ] P1-10.4 — (signing) On-chain withdraw success and state update.
- [ ] P1-10.5 — NST has no Withdraw tab; invalid routes redirect to valid tabs.

### 11. Error and edge cases

- [ ] P1-11.1 — Locked phase disables staking operations and shows message.
- [ ] P1-11.2 — (signing) User rejects stake/approval tx; UI shows rejection.
- [ ] P1-11.3 — (signing) User rejects withdraw tx; UI shows rejection.
- [ ] P1-11.4 — External API failure yields graceful error UI.

