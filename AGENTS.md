# AGENTS.md

## Cursor Cloud specific instructions

**Imua Frontend** is a Next.js 15 decentralized staking dApp (client-only, no backend/database). It connects to remote blockchain RPCs and REST APIs. The `bootstrap` branch adds Solidity contract ABI dependencies compiled via Foundry.

### Key commands

| Task | Command |
|------|---------|
| Dev server | `pnpm dev` (http://localhost:3000) |
| Build (local) | `pnpm build:local` (runs `forge compile && next build`) |
| Build (Vercel) | `pnpm build` (auto-installs Foundry) |
| Lint | `pnpm lint` |
| Type check | `npx tsc --noEmit` |
| Unit tests | `pnpm test` (vitest) |
| E2E tests | `pnpm test:e2e` (playwright, requires dev server) |
| Format | `npx prettier --check .` |

### Setup prerequisites (bootstrap branch)

1. **Foundry** must be installed (`bash ./scripts/install-foundry.sh`) and `forge` on PATH (`export PATH="$PATH:$HOME/.foundry/bin"`).
2. **Git submodules** must be initialized: `git submodule update --init --recursive` (pulls `lib/forge-std` and `lib/imua-contracts` with their transitive deps).
3. **Solidity compilation**: Run `forge compile` before `next build` or `tsc --noEmit`. This generates ABI JSONs in `out/` that TypeScript imports at `@/out/*.sol/*.json`.
4. **pnpm install**: Uses `pnpm-lock.yaml`. Do not use npm or yarn.

### Notes

- The `out/` directory (Solidity artifacts) is gitignored. You must run `forge compile` after cloning or after submodule updates.
- `forge compile` produces a non-blocking linter error from `lib/imua-contracts/src/utils/CustomProxyAdmin.sol` — this is harmless and doesn't affect ABI generation.
- ESLint has 0 errors and warnings only (mostly `no-explicit-any` and `react-hooks/exhaustive-deps`). These are pre-existing.
- pnpm may warn about ignored build scripts (esbuild, sharp, etc.). The app builds and runs without them.
- For the current bootstrap setup, no `.env` file is strictly required — the app uses fallback defaults. In production, env vars like `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`, `NEXT_PUBLIC_ALCHEMY_API_KEY`, and `NEXT_PUBLIC_GRAPHQL_ENDPOINT` must be set. See `.env.example`.
- Wallet connection requires a browser extension (MetaMask, etc.) and cannot be fully tested headlessly.
- CI workflows are in `.github/workflows/`. The `build:local` script is what CI's Build job should use; E2E tests expect a `build:local` artifact.
