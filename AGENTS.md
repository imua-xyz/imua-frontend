# AGENTS.md

## Cursor Cloud specific instructions

**Imua Frontend** is a Next.js 15 decentralized staking dApp (client-only, no backend/database). It connects to remote blockchain RPCs and REST APIs.

### Key commands

| Task | Command |
|------|---------|
| Dev server | `pnpm dev` (http://localhost:3000) |
| Build | `pnpm build` |
| Lint | `pnpm lint` |
| Tests | `pnpm test` (vitest — no test files exist yet) |
| Format | `npx prettier --check .` |

### Notes

- The project uses **pnpm** (lockfile: `pnpm-lock.yaml`). Do not use npm or yarn.
- ESLint config uses both `eslint.config.mjs` (flat config for next/core-web-vitals) and `.eslintrc.js` (legacy, for @typescript-eslint). The `pnpm lint` script invokes `eslint .` which uses the flat config.
- There are ~39 pre-existing lint errors (unused vars, `no-explicit-any`, `prefer-const`). These are in the existing codebase and not regressions.
- pnpm may warn about ignored build scripts (esbuild, sharp, etc.). The app builds and runs correctly without them; no action needed.
- No `.env` file is required — the app uses hardcoded RPC URLs and has fallback defaults. Optional env vars configure XRP/XUMM integration.
- Wallet connection requires a browser wallet extension (MetaMask, etc.) and cannot be fully tested in a headless cloud environment. The UI still renders and all non-wallet flows work.
- This is a pure frontend app with no Docker, no database, and no backend service to start.
