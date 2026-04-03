# E2E Testing — Findings Log

This document records discrepancies discovered during E2E test development, **relative to the phase-specific user flow specs** (e.g. `e2e-bootstrap-user-flow-spec.md`). Each finding is classified as:

- **Blocker** — Prevents covering remaining user flows (e.g. cannot run tests, or critical path broken).
- **Non-blocker** — Design/implementation discrepancy; does not stop test implementation (tests can assert current behaviour or document the gap).

Root causes may be: **Implementation bug**, **Design/spec gap**, or **Environment issue**.

---

## Findings

| # | Date | Category | Test | Observation | Likely Cause | Status | Resolution |
|---|------|----------|------|-------------|--------------|--------|------------|
| 1 | 2026-03-05 | Non-blocker | tab visibility | Withdraw tab visible for imETH in bootstrap (pre-lock) phase. Plan says bootstrap LST should only show: stake, delegate, undelegate (no withdraw). UI shows all 4 tabs. | Design/impl mismatch — `staking/page.tsx` tab logic excludes withdraw only for NST tokens. | Open | Confirm intended behaviour for EVM LST in bootstrap; align impl or plan. |
| 2 | 2026-03-05 | Non-blocker | wallet-connect | `connect-wallet-cta` opens WalletConnectionModal, then inner "Connect Wallet" opens RainbowKit. Two-step flow for EVM. | Design intent — modal is for multi-wallet (EVM + XRP/BTC). | Open | Clarify if EVM-only should skip modal. |
| 3 | 2026-03-05 | Non-blocker | synpress-setup | Synpress cache hash mismatch between CLI and Playwright test runner. | Environment — Synpress/Playwright TS compilation difference. | Workaround | Use in-app mock connector for Phase 1; real MetaMask only if needed. |
| 4 | 2026-03-05 | Non-blocker | synpress-setup | MetaMask 13.13.1 shows "Your wallet is ready!" onboarding even with cached wallet. | Environment — MetaMask onboarding change. | Workaround | Use in-app mock for Phase 1. |
| 5 | 2026-03-05 | — | metamask-connect | RainbowKit did not complete with Synpress EthereumWalletMock. | Environment — mock provider not detected by RainbowKit. | Resolved | In-app mock EVM connector added: `config/testWallet.ts` + `useEVMWalletConnector` when `NEXT_PUBLIC_E2E_MODE=true`. Connect via wagmi `connectAsync` with `@wagmi/core` mock connector; no extension. |
| 6 | 2026-03-05 | Non-blocker | wallet-connection 1.2.5 | Plan: "Open dropdown → click Disconnect". Implementation: dropdown has "View Details" only; Disconnect is inside WalletDetailsModal. | Design/impl — disconnect is one extra step (View Details → Disconnect). | Open | Tests use View Details → Disconnect; plan could be updated to match. |
| 7 | 2026-03-05 | Blocker | stake-flow 1.5.1 | `@wagmi/core` mock connector exposes accounts but does not sign transactions. Submitting stake/approval tx will fail in E2E. | Environment — mock is account-only, no wallet client for signing. | Open | Phase 1 tests cover flow up to review step. Full tx success requires: custom connector with real walletClient (viem) pointing at Anvil, or separate "signed tx" E2E with real MetaMask/Synpress. |
| 8 | 2026-03-05 | Blocker | all phase1 | `net::ERR_CONNECTION_REFUSED` at http://localhost:3001 — Playwright default baseURL was 3001 while `pnpm dev` runs on 3000. | Environment — config default did not match Next.js dev port. | Resolved | Default baseURL in `e2e/playwright.config.ts` changed to `http://localhost:3000`. Set `BASE_URL` if the app runs on another port. |

_Entries will be added as tests are developed._
