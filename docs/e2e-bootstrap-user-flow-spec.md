# Bootstrap Phase — User Flow Spec (E2E Baseline)

This document defines the **intended user flows for the bootstrap phase** on EVM (Hoodi). It is the baseline that **bootstrap E2E Phase 1 (EVM)** tests conform to. Post-bootstrap flows are out of scope here and will have a separate spec.

**State changes**: Each flow that modifies balances (Stake, Delegate, Undelegate, Claim, Withdraw) explicitly references [state-changes.md](./state-changes.md) and the balance effects (↑/↓ Total Deposited, Claimable, Delegated, vault withdrawable, wallet) so that E2E tests can assert the correct state transitions.

## Scope and assumptions

- **Phase**: Bootstrap only (Bootstrap contract on **Hoodi**; `bootstrapped === false`).
- **Chains**: EVM client chain (Hoodi) for LST (imETH, wstETH) and NST. Non-EVM (XRP, Bitcoin) bootstrap flows are out of scope for this baseline.
- **Contract**: Bootstrap contract; all operations are local (no cross-chain messaging). **EVM LST** supports claim/withdraw in bootstrap; **EVM NST** does not expose claim/withdraw.
- **UI**: Staking page is token-scoped; user selects token then performs an operation (Stake, Delegate, Undelegate; Withdraw for LST only). Operator selection is required for stake in bootstrap.

## 1. Entry and navigation

- **Landing (`/`)**: User sees IMUA branding, Staking and Dashboard cards. "Get started" / "View dashboard" navigate to `/staking` and `/dashboard`.
- **Header**: Logo (links to `/`), navigation (Dashboard, Staking), wallet status (Not Connected or address + balance). Active nav item is visually distinct.
- **Staking page (`/staking`)**: Loads with a selected token (default or from context). Main content shows operation tabs and token-specific controls.

## 2. Wallet connection

- **Not connected**: Staking page shows a clear call-to-action to connect the wallet (e.g. "Connect Wallet" CTA). Token selector may be usable before connect; stake/delegate/undelegate flows require connection.
- **Connect path**: User clicks Connect → WalletConnectionModal opens → user selects/chosen EVM wallet → connection completes. In E2E mode the app may use an in-app mock connector (no extension).
- **Connected**: Header shows truncated address and balance; connect CTA is hidden. User can open a dropdown/details from the header to see full address, disconnect, etc.
- **Disconnect**: From header dropdown → View Details → Disconnect (or equivalent). After disconnect, status shows "Not Connected" and connect CTA is available again.
- **Reconnect**: After disconnect, user can connect again via the same Connect path.

## 3. Token selection

- **Trigger**: On staking page, a control (e.g. "Select a token" or current token symbol) opens the token selection modal.
- **Modal**: Lists supported tokens (e.g. imETH, wstETH, XRP, tBTC). User can search by name or symbol. Empty search shows "No tokens found" or similar.
- **Select**: Clicking a token row closes the modal and sets the staking context to that token. The trigger label updates to the selected token (e.g. "wstETH").
- **Persistence**: Selected token is reflected in the URL or context for the rest of the session until changed.

## 4. Tab visibility (bootstrap)

- **LST (imETH, wstETH) in bootstrap**: Tabs shown are **Stake**, **Delegate**, **Undelegate**, **Withdraw**. LST claim/withdraw is allowed against the Bootstrap contract.
- **NST in bootstrap**: Tabs shown are **Stake**, **Verify**, **Delegate**, **Undelegate**. **No Withdraw tab** — NST does not expose claim/withdraw, including in bootstrap.
- **Post-bootstrap**: Additional withdraw/claim semantics for other assets are handled by ClientChainGateway and are not part of this spec.

## 5. Stake and deposit flows (LST, bootstrap — EVM Phase 1)

The Stake tab can support two modes when the app allows it: **Deposit only** (tokens to vault, no delegation) and **Stake** (deposit + delegate in one step). In bootstrap, the app may force Stake-only (operator required); when the toggle is available, both modes are in scope.

### 5.1 Deposit-only flow

- **Scope**: User sends tokens to the Bootstrap contract **without** delegating. Per [state-changes.md](./state-changes.md) §2.1 (Deposit): **Total Deposited** ↑, **Claimable** ↑, **Wallet** ↓. Tokens are then available to delegate later via the Delegate tab.
- **Prerequisites**: Wallet connected, token selected, Stake tab active; app shows "Deposit only" mode (toggle or default when not forced to Stake-only).
- **Flow**: User selects "Deposit only", enters amount (≤ balance), and confirms. **No operator selection**. After submit, balances update per §2.1.
- **Validation**: Same as Stake (zero amount, amount above balance).

### 5.2 Stake flow (deposit + delegate)

- **Scope**: Deposit + delegate in one operation. Per [state-changes.md](./state-changes.md) §2.2 (Stake / Deposit + Delegate), on success: **Total Deposited** ↑, **Delegated** ↑, **Wallet** ↓; Claimable unchanged (deposit adds to claimable but delegation immediately consumes it). On partial failure (delegation fails after deposit): Total Deposited ↑, Claimable ↑, Wallet ↓, Delegated unchanged.
- **Prerequisites**: Wallet connected, token selected, Stake tab active.
- **Amount step**:
  - User sees amount input, balance, and optional "MAX" button.
  - User enters a valid amount (≤ balance, ≥ minimum if enforced). Invalid or zero amount keeps Continue disabled or shows validation message.
  - When both modes are available, user may choose "Stake & Earn" vs "Deposit only"; in bootstrap the app may force Stake-only.
- **Continue**: User clicks Continue. For Stake mode, **operator selection is required** before moving to review.
- **Operator step**: After Continue, operator selection modal opens (or is shown inline). User must select one operator from the list. Search by name/address is available. "No operators found" if search has no match. User selects an operator (e.g. by clicking a row) and confirms; modal closes.
- **Review step**: User sees summary (amount, operator, operation type). Submit button is visible. User may have "Edit" or "Change" to go back to amount or operator. After submit and confirmation, balances and delegations update per state-changes §2.2.
- **Validation**: Zero amount → Continue disabled. Amount above balance → error. No operator selected (Stake mode) → cannot proceed to review (or Submit disabled).

## 6. Delegate flow (bootstrap — EVM Phase 1)

- **Scope**: Move tokens from claimable balance to a chosen operator. Per [state-changes.md](./state-changes.md) §2.3 (Delegate): **Delegated** ↑, **Claimable** ↓, **Total Deposited** unchanged.
- **Prerequisites**: Wallet connected, token selected, Delegate tab active. User must have **claimable** (available-to-delegate) balance.
- **Flow**: User selects operator (if not pre-selected), enters amount (≤ claimable), and confirms. Delegation is recorded on the Bootstrap contract; claimable decreases and delegated balance (for that operator) increases per §2.3.
- **Validation**: Zero amount, amount above claimable, or no operator → appropriate disable/error.

## 7. Undelegate flow (bootstrap — EVM Phase 1)

- **Scope**: Return tokens from an operator to the user’s claimable balance. Per [state-changes.md](./state-changes.md) §2.4 (Undelegate): **Delegated** ↓, **Claimable** ↑; Total Deposited unchanged. In bootstrap all unbondings are **instant** (no delayed unbonding).
- **Prerequisites**: Wallet connected, token selected, Undelegate tab active. User must have delegations to one or more operators.
- **Flow**: User selects delegation (operator), enters amount to undelegate (≤ delegated amount). User confirms; delegated balance for that operator decreases and claimable balance increases per §2.4.
- **Validation**: Zero amount, amount above delegated, or no delegation selected → appropriate disable/error.

## 8. Operator selection (shared)

- **When**: Required for Stake in bootstrap; used in Delegate and optionally in Undelegate.
- **Modal/list**: Operators are listed with name, address, commission, and optionally metrics. User can search by name or address.
- **No results**: Search that matches no operator shows "No operators found matching your search" or equivalent.
- **Select**: Clicking a row selects that operator. Cancel or closing without selecting preserves the previous selection (if any).
- **Persistence**: Last selected operator per token may be restored (e.g. from localStorage) when reopening the modal.

## 9. Claim flow (LST, bootstrap — EVM Phase 1)

- **Scope**: Applies only to **EVM LST** tokens (imETH, wstETH). Per [state-changes.md](./state-changes.md) §2.5 (Claim Principal): **Bootstrap claimable** ↓, **Total Deposited** ↓, **Client chain vault withdrawable** ↑. The user’s vault withdrawable balance is increased only by **claim**; they must claim before they can withdraw to wallet.
- **Prerequisites**: Wallet connected, LST token selected, **Withdraw** tab active. User must have a non-zero **claimable** balance.
- **Flow**: User opens the Withdraw tab; UI shows **Claim** and **Withdraw** sub-steps. On **Claim**, UI shows claimable balance and amount input. User enters amount ≤ claimable and confirms; app calls claim (e.g. `claimPrincipal`). After success, claimable decreases and **vault withdrawable** increases.
- **Validation**: Zero amount → submit disabled. Amount above claimable → error and disabled submit.
- **E2E**: With a signing-capable connector, tests can assert on-chain state after claim; otherwise UI/button states only.

## 10. Withdraw flow (LST, bootstrap — EVM Phase 1)

- **Scope**: **EVM LST** only. Per [state-changes.md](./state-changes.md) §2.6 (Withdraw): **Client chain vault withdrawable** ↓, **Wallet** ↑. Withdraw moves tokens from the vault to the user’s wallet. User must **claim first** (§9) to increase vault withdrawable unless they already had unlocked balance.
- **Prerequisites**: Non-zero **vault withdrawable** balance (after claim or prior unlocked).
- **Flow**: On **Withdraw**, UI shows withdrawable balance and amount input. User enters amount ≤ withdrawable and confirms; app calls withdraw (e.g. `withdrawPrincipal`). After success, vault withdrawable decreases and wallet LST balance increases.
- **Validation**: Zero amount → submit disabled. Amount above withdrawable → error and disabled submit.
- **E2E**: With a signing-capable mock connector, tests can assert full claim → withdraw flow; otherwise UI and validation only.

## 11. Error and edge cases (bootstrap)

- **Insufficient balance**: Amount > wallet balance → "Amount exceeds balance" or "No available balance" (if balance is zero).
- **Below minimum**: Amount below protocol minimum → "Amount must be greater than {min}" or equivalent.
- **User rejects tx**: If the user rejects the transaction in the wallet, the UI shows rejection message; no state change.
- **Locked phase**: If the bootstrap contract is in the locked period (before spawn), staking operations may be disabled; message shown. (Optional for initial E2E coverage.)

## 12. Out of scope for this baseline

- **Post-bootstrap flows**: Withdraw, cross-chain messaging, LayerZero relay, ClientChainGateway (Sepolia or other chain).
- **XRP / Bitcoin bootstrap**: Vault transfers and memo/OP_RETURN encoding; **to be covered by separate per-chain bootstrap specs** (e.g. `e2e-bootstrap-xrp-user-flow-spec.md`, `e2e-bootstrap-btc-user-flow-spec.md`).
- **NST Verify & Deposit**: Beacon proof and capsule flows; can be added to this spec or a dedicated NST-bootstrap spec.
- **Full tx signing in E2E**: Current E2E mock does not sign; tests cover flows up to and including the review step. Actual submit and on-chain confirmation are manual or future work (signing-capable connector).

---

Tests in `e2e/phase1/` should align with the flows above. When the app behavior and this spec diverge, either the app or the spec should be updated and the findings log updated accordingly.
