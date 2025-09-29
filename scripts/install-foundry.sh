#!/bin/bash

set -e

# Install Foundry if not already installed
if ! command -v forge &> /dev/null; then
    echo "Installing Foundry..."

    # Download and install Foundry
    curl -L https://foundry.paradigm.xyz | bash

    # Add foundry to PATH
    export PATH="$PATH:$HOME/.foundry/bin"

    # Source the profile to make foundryup available
    source $HOME/.bashrc 2>/dev/null || true
    source $HOME/.zshrc 2>/dev/null || true

    # Run foundryup to install forge, cast, anvil, and chisel
    $HOME/.foundry/bin/foundryup

    # Verify the installation
    if ! command -v forge &> /dev/null; then
        echo "Error: forge command not found after installation"
        exit 1
    fi
else
    echo "Foundry is already installed"
fi

# Verify installation
echo "Foundry version:"
forge --version
