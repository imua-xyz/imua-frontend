# Current Imua Staking User Flow Analysis

## Overview
The current Imua staking interface follows a sequential process spread across multiple pages with separate, distinct components for different staking operations.

## 1. Entry Point & Navigation

### Components
- **Header Bar**: Contains logo, network selection (Sepolia), ETH balance, and wallet address
- **Initial Selection Screen**: Card-based interface for choosing staking method

### User Flow
1. User connects wallet (implicit)
2. User lands on selection screen with two options:
   - EVM Staking
   - XRP Staking

## 2. EVM Staking Flow

### Components
- **Header Bar**: Consistent across pages
- **Back to Home Link**: Navigation component
- **Token Dropdown**: Selection component for choosing token to stake
- **Token Information Panel**: Static display component
- **Action Tabs**: Horizontal tabs for Stake/Delegate/Undelegate/Withdraw
- **Input Field**: For amount entry
- **Operator Selection**: Dropdown for validator selection
- **Action Button**: Primary action button (Deposit)

### User Flow
1. User selects "EVM Staking" from the selection screen
2. User is taken to a new page with a dual-column layout
3. Left column contains staking controls
4. Right column shows current positions
5. User must:
   - Select token (exoETH)
   - View token information
   - Select operation tab
   - Enter amount
   - Select operator (if applicable)
   - Click action button

## 3. Positions View

### Components
- **Position Cards**: Per-token position summary
- **Balance Displays**: Multiple balance types shown (Total, Claimable, Delegated, etc.)
- **Chain Information**: Technical chain details

### User Flow
1. Position information is displayed alongside staking controls
2. Multiple tokens can be displayed if user has multiple positions
3. User must mentally connect their actions on the left with results on the right

## 4. Interaction Model

### Mental Model Gaps
- **Disconnected Actions and Results**: Actions and their results are separated spatially
- **Multi-step Process**: User must navigate between pages for different tokens/operations
- **Hidden Relationships**: Relationship between staking and positions is implicit
- **Sequential vs. Parallel**: Operations that could be parallel are presented sequentially

### Interaction Friction Points
- Page navigation between selecting staking type and performing operations
- Cognitive load of processing technical information alongside decision-making
- Separate tabs for related operations that could be contextually presented
- Limited visual feedback connecting actions to outcomes

## 5. Visual Hierarchy

### Current Priorities
- **Equal Weight**: Token selection, token info, and staking controls have similar visual weight
- **Technical Information**: Addresses and chain details are prominently displayed
- **Tabbed Interface**: Operations are equally weighted in tabs
- **Dual Column**: Left for controls, right for positions

### Information Architecture
- Technical details are given prominence over user goals
- Token address is highlighted but less relevant to most users
- Multiple balance types create cognitive load