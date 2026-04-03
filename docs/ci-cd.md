# CI/CD Documentation

This document describes the CI/CD pipelines and how to run them locally.

## GitHub Actions Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)

Runs on every push and pull request to `main` or `develop` branches.

**Jobs:**
- **lint**: Runs ESLint to check code quality
- **type-check**: Runs TypeScript compiler to verify type safety
- **unit-tests**: Runs Vitest unit tests and uploads coverage to Codecov
- **build**: Builds the Next.js application locally (with forge compile)
- **e2e-tests**: Runs Playwright E2E tests and uploads reports

**Triggers:**
- Push to `main` or `develop`
- Pull requests targeting `main` or `develop`

### 2. PR Checks Workflow (`.github/workflows/pr-checks.yml`)

Lightweight checks for pull requests.

**Jobs:**
- Combined job that runs lint, type-check, unit tests, and build sequentially

**Triggers:**
- Pull request opened, synchronized, or reopened

### 3. Code Quality Workflow (`.github/workflows/code-quality.yml`)

Comprehensive code quality checks with coverage reporting.

**Jobs:**
- Runs ESLint, type check, unit tests with coverage, and uploads to Codecov

**Triggers:**
- Push to `main` or `develop`
- Pull requests targeting `main` or `develop`
- Weekly schedule (Mondays at 00:00 UTC)

## Running CI Locally

Use the `Makefile` to run CI checks locally before pushing:

### Quick CI Check

```bash
make ci
```

This runs all CI checks: lint, type-check, test, and build.

### Individual Checks

```bash
# Lint
make lint

# Type check
make type-check

# Unit tests
make test

# Unit tests with coverage
make test-coverage

# Build
make build-local

# E2E tests (requires dev server running)
make e2e
```

### Development

```bash
# Install dependencies
make install

# Start dev server
make dev

# Run tests in watch mode
make test-watch

# Run E2E tests with UI
make e2e-ui
```

## Coverage

Unit test coverage is automatically uploaded to Codecov on:
- CI workflow (unit-tests job)
- Code quality workflow

Coverage reports are generated in the `coverage/` directory locally.

## E2E Tests

E2E tests use Playwright and require:
- Either a running **E2E dev server** (`pnpm run dev:e2e`, which loads `.env.e2e` and enables bootstrap E2E mode) or a `PLAYWRIGHT_BASE_URL` pointing at an existing deployment
- Chromium browser installed (`pnpm exec playwright install chromium`)

Locally, `make e2e` / `pnpm test:e2e` will start the dedicated E2E dev server via Playwright’s `webServer` (`pnpm run dev:e2e`) and run the bootstrap-phase E2E suite (`e2e/phase1`, plus smoke tests). In CI, the build step runs before E2E tests, Playwright browsers are installed automatically, and the tests use the same bootstrap-first harness described in `testing.md` and `e2e-testing-plan.md`.

## Environment Variables

Some workflows may require environment variables. For local testing, create a `.env.local` file (not committed to git).

For CI builds, set `SKIP_ENV_VALIDATION: true` to bypass Next.js environment variable validation during build.

## Troubleshooting

### CI Fails Locally But Passes in GitHub Actions

1. Ensure you're using the same Node.js version (20.x)
2. Use `pnpm install --frozen-lockfile` to match CI exactly
3. Check for environment-specific issues (e.g., missing env vars)

### E2E Tests Fail Locally

1. Ensure the dev server is running (`make dev` or `pnpm dev`)
2. Install Playwright browsers: `pnpm exec playwright install chromium`
3. Check `PLAYWRIGHT_BASE_URL` if using a custom URL

### Build Fails

1. Ensure all dependencies are installed: `make install`
2. Check for TypeScript errors: `make type-check`
3. Verify forge is available if using `build:local`

## Makefile Targets

| Target | Description |
|--------|-------------|
| `make help` | Show all available targets |
| `make install` | Install dependencies |
| `make lint` | Run ESLint |
| `make type-check` | Run TypeScript type check |
| `make test` | Run unit tests |
| `make test-watch` | Run unit tests in watch mode |
| `make test-coverage` | Run unit tests with coverage |
| `make build` | Build for production (Vercel) |
| `make build-local` | Build locally (with forge compile) |
| `make e2e` | Run E2E tests |
| `make e2e-ui` | Run E2E tests with UI |
| `make ci` | Run all CI checks |
| `make clean` | Clean build artifacts |
| `make dev` | Start development server |
| `make start` | Start production server |
| `make format` | Format code with Prettier (if available) |
| `make format-check` | Check code formatting |
