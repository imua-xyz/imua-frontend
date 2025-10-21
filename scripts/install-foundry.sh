#!/bin/bash

set -e

# Install Rust and Cargo if not already installed
if ! command -v cargo &> /dev/null; then
    echo "Installing Rust and Cargo..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
    export PATH="$PATH:$HOME/.cargo/bin"
else
    echo "Rust and Cargo are already installed"
fi

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
    $HOME/.foundry/bin/foundryup --repo foundry-rs/foundry --commit 86d5c5b1cd40505abba1c86f49c6361e8a82100a

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
