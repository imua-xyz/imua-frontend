# Optimistic Updates: Design & Implementation

## Overview

During the **bootstrap phase**, staking data is served by a GraphQL indexer that lags behind the chain. Users can wait minutes (especially on Bitcoin) before the UI reflects a confirmed transaction. **Optimistic updates** improve UX by applying confirmed transactions locally until the indexer catches up.

### Goals

- **Immediate feedback**: After a transaction is confirmed on-chain, the UI shows updated balances and delegations without waiting for the indexer.
- **Correctness**: Optimistic state is merged with indexer data and expires once the indexer has processed the transaction (per-record block height).
- **Simplicity**: Store raw operation data (amount, operation type, block height) and derive deltas at read time; no precomputed balance deltas.

### Scope

- **Bootstrap phase only**: Optimistic merging applies when `!bootstrapStatus?.isBootstrapped`. After bootstrap, data comes from Imuachain APIs and no optimistic cache is used; the cache is cleared when bootstrap ends.
- **Staker assets and delegations**: The system optimistically updates `bootstrap_staker_assets` (deposited, withdrawable, delegated) and `bootstrap_delegation_states` (per-operator delegated amounts).

---

## Design Principles

1. **Store operations, not deltas**  
   Pending transactions store: `txHash`, `operation`, `stakerId`, `assetId`, `blockHeight`, `amount`, and optionally `operatorAddress`. Merge logic computes deltas when combining with GraphQL data. This keeps the cache simple and avoids inconsistent precomputed state.

2. **Per-record block height**  
   Each indexer record has an `updated_at_block`. A pending tx is applied only if `tx.blockHeight > record.updated_at_block`. When the indexer updates a record past that block, the tx is no longer applied for that record. Expiration is per record, not global.

3. **Single source of truth**  
   GraphQL (and later Cosmos) remains the source of truth. Optimistic layer is a transient overlay: merge runs on every read, and expired entries are removed when indexer data advances.

4. **Reactivity**  
   The cache lives in a Zustand store with persistence. Hooks that depend on pending transactions (e.g. `useStakerBalances`, `useDelegations`) subscribe to the store and include a pending-tx–dependent key in their query key so that adding a new pending tx triggers a re-fetch/merge and the UI updates.

---

## Architecture

### High-Level Flow

```
User confirms tx on chain
        ↓
Staking hook onSuccess: storePendingTransaction(txHash, operation, token, address, blockHeight, amount, operator?)
        ↓
Zustand store (persisted) holds PendingTransaction
        ↓
useStakerBalances / useDelegations: fetch GraphQL → merge with getPendingTransactions(...) → return merged result
        ↓
When indexer updates record (updated_at_block ≥ tx.blockHeight), clearExpiredTransactions() drops that tx from cache
```

### Components

| Component | Responsibility |
|----------|----------------|
| **Types** (`types/optimistic-cache.ts`, `types/operations.ts`) | `PendingTransaction` shape; `StakingOperation`; helpers like `affectsStakerAssetRecord`, `affectsDelegations`. |
| **Store** (`stores/optimisticCacheStore.ts`) | Add/remove pending txs; get by staker/asset; `clearExpiredTransactions(recordBlockHeights)`; `clearAll`; `clearByChainId`. Persisted to localStorage. |
| **Helpers** (`lib/optimistic-helpers.ts`) | `storePendingTransaction(...)` builds `stakerId`/`assetId` from token and address and pushes into the store. |
| **Merge** (`lib/optimistic-merge.ts`) | `mergeStakerAssets(graphqlData, pendingTxs)` and `mergeDelegations(graphqlData, pendingTxs)` apply pending txs in block order and return merged arrays. |
| **Data hooks** (`useStakerBalances`, `useDelegations`) | Fetch GraphQL (bootstrap), get pending txs from store, merge, return. Include pending-tx–dependent key in query key so new pending txs trigger re-merge. Run `clearExpiredTransactions` in `useEffect` when indexer data (with `updated_at_block`) changes. |
| **Cleanup hook** (`useOptimisticCacheCleanup`) | Call `clearAll()` when bootstrap ends; call `clearByChainId(previousChainId)` on EVM chain switch. Mounted in `app/providers.tsx`. |

### Identifiers

- **Staker ID**: `{address}_0x{chainId}` (lowercase). One logical staker per chain.
- **Asset ID**: `{tokenAddress}_0x{chainId}` (lowercase). Uniquely identifies the asset on that chain.
- **Delegation key** (for expiration): `{stakerId}_{assetId}_{operatorAddr}` (lowercase).

---

## Operation Semantics

Merge logic applies only to pending txs whose `blockHeight` is **greater than** the record’s `updated_at_block`. Amounts are applied in **block height order**.

### Staker Assets (`mergeStakerAssets`)

| Operation | Effect on deposited | Effect on withdrawable | Effect on delegated |
|-----------|---------------------|------------------------|----------------------|
| **deposit** | +amount | +amount | — |
| **stake** | +amount | — | +amount |
| **delegate** | — | −amount | +amount |
| **undelegate** | — | +amount | −amount |
| **claim** | −amount | −amount | — |
| **withdraw** | (see below) | (see below) | — |

- **deposit**: User locks tokens without delegating; both deposited and withdrawable increase.
- **stake**: Deposit-and-delegate in one step; deposited and delegated increase, withdrawable unchanged.
- **delegate**: Moves from withdrawable to delegated; withdrawable decreases, delegated increases.
- **undelegate**: Moves from delegated to withdrawable; delegated decreases, withdrawable increases.
- **claim**: Unlocks from tracking; deposited and withdrawable decrease (post-bootstrap concept; during bootstrap this is not used from UI, but merge supports it).
- **withdraw**: For **BTC and XRP only**, withdraw is implemented as a single “claim + withdraw” step on-chain, so it does affect indexer-tracked staker assets: deposited and withdrawable both decrease by the amount. For other assets, withdraw does not change staker asset records in the merge (only vault balance off-indexer).

After applying deltas, the merge enforces the invariant `deposited = withdrawable + delegated` (adjusting `deposited` if needed). Values are clamped so that withdrawable and delegated do not go negative.

### Delegations (`mergeDelegations`)

Only operations that affect delegations are applied: **stake**, **delegate**, **undelegate**.

- **stake** / **delegate**: Add `amount` to the delegation for `tx.operatorAddress`.
- **undelegate**: Subtract `amount` from the delegation for `tx.operatorAddress`.

If the resulting delegated amount is ≤ 0, the delegation record is removed from the merged list. Each delegation record has its own `updated_at_block`; a pending tx is applied only if `tx.blockHeight > delegation.updated_at_block`.

---

## Special Cases

### BTC / XRP Withdraw

On Bitcoin and XRP there is no separate claim step; the contract exposes a single “withdraw” that effectively does claim + withdraw. So:

- **Storing**: When the user completes a BTC or XRP withdrawal, the staking hook calls `storePendingTransaction(..., "withdraw", token, address, blockHeight, amount)` (no operator).
- **Merging**: In `mergeStakerAssets`, the `withdraw` case only applies for assets whose `assetId` is in a fixed set (tBTC and XRP). For those, deposited and withdrawable are decreased by the amount; for other assets, withdraw is a no-op in the merge.

### NST Verify-and-Deposit

NST “verify and deposit” does not take an explicit amount; the deposit size is the validator’s **effective balance** from the beacon chain. The contract (and `ValidatorContainer` library) stores this in the validator container array at index 2 (little-endian uint64, in Gwei).

- **Storing**: After a successful `verifyAndDepositNativeStake`, the hook derives the amount with `getDepositAmountWeiFromValidatorContainer(verifyParams.validatorContainer)` (see `lib/validator-container.ts`) and calls `storePendingTransaction(..., "deposit", token, address, blockHeight, depositAmountWei)`.
- **Merging**: Treated as a normal **deposit**: deposited and withdrawable both increase by that amount.

---

## Expiration and Cleanup

- **Per-record expiration**: When GraphQL (or merged) data is available, each record’s `updated_at_block` is known. `clearExpiredTransactions(recordBlockHeights)` is called with a map of record key → `updated_at_block`. A pending tx is removed if, for every record it affects, the tx’s `blockHeight` is ≤ that record’s block height (i.e. the indexer has already included it).
- **Staker assets**: Record key = `assetId`. A tx that `affectsStakerAssetRecord` is kept if `tx.blockHeight > assetBlockHeight` for its asset.
- **Delegations**: Record key = `{stakerId}_{assetId}_{operatorAddr}`. A tx that `affectsDelegations` is kept if `tx.blockHeight > delegationBlockHeight` for that delegation. A tx can affect both an asset and a delegation; it is removed only when it is expired for **all** affected records.
- **Bootstrap end**: When `bootstrapStatus?.isBootstrapped` becomes true, `useOptimisticCacheCleanup` calls `clearAll()`, since post-bootstrap data comes from Imuachain and the optimistic cache is no longer used.
- **Chain switch**: On EVM chain change, `clearByChainId(previousChainId)` clears pending txs that belong to the previous chain (identified by chain ID in `stakerId`/`assetId`).

---

## Key Files Reference

| Path | Purpose |
|------|--------|
| `types/optimistic-cache.ts` | `PendingTransaction`, `OptimisticCacheState`. |
| `types/operations.ts` | `StakingOperation`, `affectsStakerAssets`, `affectsDelegations`, `affectsStakerAssetRecord`, `isUndelegateOperation`. |
| `stores/optimisticCacheStore.ts` | Zustand store + persist; selectors `usePendingTransactionsForStaker`, `usePendingTransactionsForStakerAsset`, `useAllPendingTransactions`. |
| `lib/optimistic-helpers.ts` | `storePendingTransaction()`. |
| `lib/optimistic-merge.ts` | `mergeStakerAssets`, `mergeDelegations`; BTC/XRP withdraw set; per-tx block height check. |
| `lib/validator-container.ts` | `getEffectiveBalanceGwei`, `getDepositAmountWeiFromValidatorContainer` (for NST verify-and-deposit amount). |
| `hooks/useStakerBalances.ts` | Bootstrap: fetches `bootstrap_staker_assets`, merges with pending txs, runs cleanup when asset block heights change. |
| `hooks/useDelegations.ts` | Bootstrap: fetches `bootstrap_delegation_states`, merges with pending txs, runs cleanup when delegation block heights change. |
| `hooks/useOptimisticCacheCleanup.ts` | `clearAll` on bootstrap end; `clearByChainId` on chain switch. |
| `hooks/useBitcoinStaking.ts`, `hooks/useXRPStaking.ts` | Call `storePendingTransaction` for stake, delegate, undelegate, **withdraw** (BTC/XRP). |
| `hooks/useEVMLSTStaking.ts`, `hooks/useEVMNSTStaking.ts` | Call `storePendingTransaction` for stake, delegate, undelegate; NST also for **deposit** (verify-and-deposit) with amount from validator container. |

---

## Bootstrap vs Post-Bootstrap

| Phase | Staker balance / delegations source | Optimistic cache |
|-------|-------------------------------------|------------------|
| **Bootstrap** | GraphQL (`bootstrap_staker_assets`, `bootstrap_delegation_states`) | Applied in `useStakerBalances` and `useDelegations`; cleanup by `updated_at_block`. |
| **Post-bootstrap** | Imuachain (e.g. Cosmos RPC / precompile) | Not used; `clearAll()` on bootstrap end. |

Refetch behavior (e.g. after a successful tx) is unchanged: hooks still call `stakerBalanceResponse.refetch()` and similar so that when the indexer eventually updates, the next fetch gets fresh data and the optimistic overlay naturally disappears as txs expire.
