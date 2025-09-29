#!/bin/bash

set -e

echo "Starting Vercel build process..."

# Install Foundry
echo "Installing Foundry..."
bash ./scripts/install-foundry.sh

# Add foundry to PATH for this session
export PATH="$PATH:$HOME/.foundry/bin"

# Verify forge is available
if ! command -v forge &> /dev/null; then
    echo "Error: forge command not found after installation"
    exit 1
fi

echo "Foundry installed successfully. Running forge compile..."
forge compile

echo "Forge compilation completed. Running Next.js build..."
npx next build

echo "Build completed successfully!"
