# E2E Testing — Findings Log

This document records discrepancies discovered during E2E test development. Each finding represents a mismatch between the designed user flow and the actual implementation. The root cause could be:

- **Implementation bug** — code doesn't match the intended design
- **Design/spec gap** — the designed flow has an overlooked edge case or ambiguity
- **Environment issue** — test infrastructure limitation, not a real bug

Each finding should be investigated and resolved before the test is marked as passing or skipped.

---

## Findings

| # | Date | Test | Observation | Likely Cause | Status | Resolution |
|---|------|------|-------------|--------------|--------|------------|
| 1 | 2026-03-05 | metamask-connect | Withdraw tab visible for imETH in bootstrap (pre-lock) phase. Plan says bootstrap LST should only show: stake, delegate, undelegate (no withdraw). UI snapshot shows all 4 tabs. | Design/impl mismatch — `staking/page.tsx` tab logic may not correctly exclude withdraw for LST in bootstrap when `requiresExtraConnect=false` | Open | Need to check: is withdraw intended for EVM LST in bootstrap? The tab logic excludes it only for NST tokens. |
| 2 | 2026-03-05 | metamask-connect | `connect-wallet-cta` opens `WalletConnectionModal` (not RainbowKit directly). The modal shows "Connect Hoodi Wallet" with an inner "Connect Wallet" button that then opens RainbowKit. Two-step connection flow. | Design intent — the WalletConnectionModal is a wrapper for multi-wallet scenarios (EVM + XRP/BTC). For EVM-only tokens it adds an unnecessary extra click. | Open | Need to clarify: is the double-click intentional for EVM-only tokens, or should EVM tokens skip the WalletConnectionModal and go straight to RainbowKit? |
| 3 | 2026-03-05 | synpress-setup | Synpress cache hash mismatch between CLI (`532f685e`) and Playwright test runner (`c0fc20e7`). The CLI and Playwright compile TypeScript differently, producing different function hashes. | Environment — Synpress alpha limitation with Playwright TS compilation. | Workaround | Use `EthereumWalletMock` (mock provider) instead of real MetaMask extension. Cache hash issue is a known Synpress limitation. |
| 4 | 2026-03-05 | synpress-setup | MetaMask 13.13.1 shows "Your wallet is ready!" onboarding screen even with cached wallet state. Synpress's `unlockForFixture` doesn't handle this screen. | Environment — MetaMask version changed onboarding flow. | Workaround | Use `EthereumWalletMock` instead. If real MetaMask is needed later, the setup needs to click "Open wallet" to dismiss. |
| 5 | 2026-03-05 | metamask-connect | `EthereumWalletMock` (Synpress) injects `window.ethereum` via `@depay/web3-mock`, but RainbowKit's MetaMask connector may not detect it (requires `isMetaMask=true` and specific EIP-6963 provider info). The WalletConnectionModal + RainbowKit flow doesn't complete with the mock provider. | Environment — mock provider incompatible with RainbowKit's provider detection. | Investigating | Need to either: (a) configure `@depay/web3-mock` to match MetaMask's fingerprint, (b) bypass RainbowKit and connect programmatically via wagmi, or (c) use a different mock strategy. |

_Entries will be added as tests are developed._
