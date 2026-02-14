# Exocore Frontend

Frontend application for the Exocore staking platform, built with Next.js, React, and TypeScript.

## Getting Started

### Prerequisites

- Node.js 20.x or later
- pnpm (recommended) or npm/yarn

### Installation

```bash
# Install dependencies
pnpm install

# Or using Make
make install
```

### Development

```bash
# Start development server
pnpm dev

# Or using Make
make dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Available Scripts

### Using pnpm

- `pnpm dev` - Start development server
- `pnpm build` - Build for production (Vercel)
- `pnpm build:local` - Build locally (with forge compile)
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm test` - Run unit tests
- `pnpm test:watch` - Run unit tests in watch mode
- `pnpm test:coverage` - Run unit tests with coverage
- `pnpm test:e2e` - Run E2E tests
- `pnpm test:e2e:ui` - Run E2E tests with UI

### Using Make

See `make help` or run `make` without arguments for all available targets.

**Common commands:**
- `make ci` - Run all CI checks (lint, type-check, test, build)
- `make test` - Run unit tests
- `make test-coverage` - Run unit tests with coverage
- `make e2e` - Run E2E tests
- `make clean` - Clean build artifacts

## Testing

### Unit Tests

Unit tests use Vitest and are located alongside source files with `.test.ts` or `.test.tsx` extensions.

```bash
# Run all tests
pnpm test

# Run in watch mode
pnpm test:watch

# Run with coverage
pnpm test:coverage
```

### E2E Tests

E2E tests use Playwright and are located in the `e2e/` directory.

```bash
# Run E2E tests (requires dev server running)
pnpm test:e2e

# Run with UI
pnpm test:e2e:ui

# Install Playwright browsers (first time)
pnpm exec playwright install chromium
```

## CI/CD

This project uses GitHub Actions for continuous integration. See [docs/ci-cd.md](./docs/ci-cd.md) for detailed information.

**Quick CI check locally:**
```bash
make ci
```

**Workflows:**
- **CI** - Runs on every push/PR (lint, type-check, unit tests, build, E2E)
- **PR Checks** - Lightweight checks for pull requests
- **Code Quality** - Comprehensive checks with coverage reporting

## Project Structure

```
exocore-frontend/
├── app/              # Next.js app directory
├── components/       # React components
├── hooks/           # Custom React hooks
├── lib/             # Utility libraries
├── stores/           # State management (Zustand)
├── types/            # TypeScript type definitions
├── config/           # Configuration files
├── e2e/              # E2E tests (Playwright)
├── docs/             # Documentation
└── .github/          # GitHub Actions workflows
```

## Documentation

- [CI/CD Guide](./docs/ci-cd.md) - CI/CD pipelines and local testing
- [Testing Guide](./docs/testing.md) - Testing strategy and best practices
- [Frontend Specs](./docs/frontend-specs.md) - Frontend architecture and specifications

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

## Deploy

The application is deployed on Vercel. See [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for details.
