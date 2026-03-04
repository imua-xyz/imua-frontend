.PHONY: help install lockfile-check lint type-check test test-watch test-coverage build build-local e2e e2e-ui ci clean

# Default target
help:
	@echo "Available targets:"
	@echo "  make install          - Install dependencies"
	@echo "  make lockfile-check   - Ensure pnpm-lock.yaml is in sync with package.json"
	@echo "  make lint             - Run ESLint"
	@echo "  make type-check       - Run TypeScript type check"
	@echo "  make test             - Run unit tests"
	@echo "  make test-watch       - Run unit tests in watch mode"
	@echo "  make test-coverage    - Run unit tests with coverage"
	@echo "  make build            - Build for production (Vercel)"
	@echo "  make build-local      - Build locally (with forge compile)"
	@echo "  make e2e              - Run E2E tests"
	@echo "  make e2e-ui           - Run E2E tests with UI"
	@echo "  make ci               - Run all CI checks (lint, type-check, test, build)"
	@echo "  make clean            - Clean build artifacts and dependencies"

# Install dependencies
install:
	pnpm install

# Ensure lockfile is in sync with package.json (fails if out of date)
lockfile-check:
	@echo "Checking lockfile is in sync with package.json..."
	@pnpm install --frozen-lockfile || (echo "Error: pnpm-lock.yaml is out of date. Run 'pnpm install' and commit the updated lockfile." && exit 1)
	@echo "Lockfile is in sync."

# Lint
lint:
	@echo "Running ESLint..."
	@pnpm lint || (echo "⚠️  ESLint found issues. Run 'pnpm lint --fix' to auto-fix some issues." && exit 1)

# Type check
type-check:
	pnpm exec tsc --noEmit

# Unit tests
test:
	pnpm test

# Unit tests in watch mode
test-watch:
	pnpm test:watch

# Unit tests with coverage
test-coverage:
	pnpm test:coverage

# Build for production (Vercel)
build:
	pnpm build

# Build locally (with forge compile)
build-local:
	pnpm build:local

# E2E tests
e2e:
	pnpm test:e2e

# E2E tests with UI
e2e-ui:
	pnpm test:e2e:ui

# Run all CI checks (mimics GitHub Actions CI workflow)
ci: lockfile-check lint type-check test build-local
	@echo "✅ All CI checks passed!"

# Clean build artifacts and dependencies
clean:
	rm -rf .next
	rm -rf node_modules
	rm -rf coverage
	rm -rf playwright-report
	rm -rf .playwright
	find . -type d -name ".next" -exec rm -rf {} + 2>/dev/null || true

# Development server
dev:
	pnpm dev

# Start production server (requires build first)
start:
	pnpm start

# Format code (if prettier is configured)
format:
	@if command -v prettier >/dev/null 2>&1; then \
		pnpm exec prettier --write "**/*.{ts,tsx,js,jsx,json,css,md}"; \
	else \
		echo "Prettier not found. Install it with: pnpm add -D prettier"; \
	fi

# Check formatting (if prettier is configured)
format-check:
	@if command -v prettier >/dev/null 2>&1; then \
		pnpm exec prettier --check "**/*.{ts,tsx,js,jsx,json,css,md}"; \
	else \
		echo "Prettier not found. Install it with: pnpm add -D prettier"; \
	fi
