# Imua Staking - New User Flow Architecture

## Overview

The new Imua staking interface follows a streamlined, modal-based workflow similar to Uniswap. This document outlines the proposed user flow, component architecture, and interaction patterns to achieve the simplified experience shown in the demo.

## 1. Core User Flow Architecture

### Global Navigation
- **Primary Navigation**: Horizontal tabs at top for main sections (DEPOSIT, DASHBOARD, DELEGATE)
- **Persistent Header**: Logo, chain selector, and wallet connection status
- **Context-Sensitive Modals**: Interface primarily driven by modal overlays rather than page navigation

### Primary User Paths
1. **Select Operation** → **Select Token** → **Connect Wallet** → **Deposit/Stake**
2. **Select Operation** → **Dashboard** → **Connect Wallet** → **View Positions**
3. **Select Operation** → **Select Token** → **Connect Wallet** → **Delegate**

## 2. Major Changes from Current Flow

### 1. Unified Interface Instead of Separate Pages
- **Current Flow**: EVM staking and XRP staking are separate pages with duplicated components
- **New Flow**: Single unified interface where token selection determines the underlying protocol
- **Benefit**: Eliminates redundant code and provides consistent experience across protocols

### 2. Operation-First Navigation Model
- **Current Flow**: Select staking method (EVM/XRP) → Connect wallet → Select token → Select operation tab
- **New Flow**: Select operation (Deposit/Dashboard/Delegate) → Select token → Connect appropriate wallet
- **Benefit**: Aligns with user goals ("I want to deposit") rather than implementation details ("I want to use EVM")

### 3. Progressive Disclosure via Modals
- **Current Flow**: All components are simultaneously visible on the page (spatial arrangement)
- **New Flow**: Components appear and disappear as needed through modals (temporal arrangement)
- **Benefit**: Reduces cognitive load by only showing what's relevant at each step

### 4. Token-Driven Wallet Connection
- **Current Flow**: User must connect wallet first, then select tokens and operations
- **New Flow**: User selects desired token first, which then prompts appropriate wallet connection
- **Benefit**: More intuitive flow that starts with user's goal rather than technical requirements

### 5. Contextual Presentation of Actions
- **Current Flow**: All possible actions (Stake/Delegate/Undelegate/Withdraw) shown as equal tabs
- **New Flow**: Primary actions highlighted, secondary actions contextually revealed when relevant
- **Benefit**: Clearer user guidance and emphasis on common operations

## 3. Component Hierarchy & Flow

### Entry Point (Initial State)
- **Header Component**: Logo + navigation tabs
- **Token Selection Panel**: Central card with token options
- **Connect Wallet Button**: Appears after token selection if wallet not connected

### Connection Flow
- **Wallet Connection Modal**:
  - Title + close button
  - List of wallet options (selection items)
  - Status indicators ("Detected")
  - Animation: Fade + scale entry

### Token Selection Flow
- **Token Type Selector**:
  - Title ("Choose Token Type")
  - Token display items with:
    - Icon
    - Symbol
    - Name
    - APY displayed prominently
  - Selection triggers wallet connection or next modal

### Deposit/Stake Flow
- **Deposit Modal**:
  - Token information header (selected token)
  - Amount input field with MAX button
  - APY display
  - Primary action button (Deposit)
  - Close button
  - Animation: Modal slides/fades in

### Operator Selection Flow
- **Operator Selection Modal**:
  - Title with sorting controls (APY ↑, Fee ↓)
  - List of operators with:
    - Name
    - Fee percentage
    - APY percentage
  - Selected state for chosen operator
  - Animation: List items stagger in

## 4. Component Requirements

### Components from Design System to Use
1. **Modal Dialog** (#1)
2. **Buttons** (#2) - Primary, Secondary
3. **Input Fields** (#3)
4. **Selection Cards/List Items** (#4)
5. **Token Display** (#6)
6. **Operator List Item** (#8)
7. **Sortable Header** (#9)

### New Components to Add to Design System

```jsx
// 1. TabNavigation Component
export const TabNavigation = ({ tabs, activeTab, onChange }) => {
  return (
    <div className="flex justify-center space-x-8 mb-10">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`relative py-2 font-medium transition-colors
                     ${activeTab === tab.id 
                       ? 'text-accent' 
                       : 'text-text-secondary hover:text-text-primary'}`}
          onClick={() => onChange(tab.id)}
        >
          <span>{tab.label}</span>
          {activeTab === tab.id && (
            <motion.div 
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" 
              initial={false}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
        </button>
      ))}
    </div>
  );
};

// 2. TokenAmount Component
export const TokenAmount = ({ token, onAmountChange, onMax, balance }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <img src={token.icon} alt={token.symbol} className="w-10 h-10 mr-2" />
          <div>
            <div className="text-xl font-bold">{token.symbol}</div>
            <div className="text-sm text-text-secondary">{token.name}</div>
          </div>
        </div>
        <button 
          onClick={onMax}
          className="text-sm font-medium px-3 py-1 bg-background-selected rounded-full
                     text-accent hover:bg-accent/10 transition-colors"
        >
          MAX
        </button>
      </div>
      <div className="bg-background-input rounded-lg p-4">
        <input
          type="text"
          placeholder="0.00"
          className="bg-transparent text-white text-2xl w-full outline-none"
          onChange={(e) => onAmountChange(e.target.value)}
        />
      </div>
      {balance && (
        <div className="text-right text-text-secondary text-sm">
          Balance: {balance}
        </div>
      )}
    </div>
  );
};

// 3. NetworkBadge Component
export const NetworkBadge = ({ network, onClick }) => {
  return (
    <button 
      onClick={onClick}
      className="flex items-center rounded-full bg-background-card py-2 px-4
                 border border-border hover:border-border-accent transition-colors"
    >
      <img src={network.icon} alt={network.name} className="w-5 h-5 mr-2" />
      <span className="font-medium">{network.name}</span>
      <svg className="w-4 h-4 ml-2" viewBox="0 0 24 24" fill="none">
        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
};

// 4. AddressDisplay Component
export const AddressDisplay = ({ address, balance, onClick }) => {
  const shortenedAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
  
  return (
    <button 
      onClick={onClick}
      className="flex items-center rounded-full bg-background-card py-2 px-4
                 border border-border hover:border-border-accent transition-colors"
    >
      {balance && <span className="mr-2 font-medium">{balance}</span>}
      <span className="font-medium text-text-primary">{shortenedAddress}</span>
      <div className="ml-2 w-6 h-6 rounded-full bg-accent/20 p-1">
        <img 
          src={`https://effigy.im/a/${address}.svg`} 
          alt="Address avatar" 
          className="w-full h-full rounded-full"
        />
      </div>
    </button>
  );
};
```

## 5. Interaction Patterns

### Modal Transitions
- **Primary Pattern**: Modal-based navigation instead of page transitions
- **Hierarchy**: Modals stack contextually (e.g., token selection → amount → operator)
- **Animation**: Use AnimatePresence for smooth entry/exit animations

### Context Preservation
- **State Persistence**: Maintain user selections across modal transitions
- **Visual Continuity**: Selected items remain highlighted as user progresses
- **Breadcrumb Context**: Always show current path in UI (which token, which operation)

### User Input Validation
- **Inline Validation**: Amount inputs validated immediately
- **Contextual Buttons**: MAX button calculates max amount
- **Error Handling**: Error states displayed inline with fields
- **Loading States**: Buttons show loading state during transactions

### Responsive Feedback
- **Success Animations**: Brief success animation after operations complete
- **Transition Effects**: Custom easing for natural feeling transitions
- **List Animations**: Staggered item entries for operator lists

## 6. Data Flow Architecture

### Smart Contract Integration
- **Read Operations**:
  - Available tokens and APYs (pre-wallet connection)
  - User balances (post-wallet connection)
  - Staking positions (post-wallet connection)
  
- **Write Operations**:
  - Deposit/Stake (requires amount, token, optional operator)
  - Delegate (requires amount, token, operator)
  - Withdraw (requires amount, token)

### State Management
- **Global State**:
  - Wallet connection status
  - Selected token
  - User balances
  - Transaction history
  
- **Local Component State**:
  - Modal open/close states
  - Input field values
  - Selection states

## 7. Implementation Plan

### Phase 1: Core Components & Navigation
- Implement header with tabs
- Build token selection component
- Create wallet connection modal

### Phase 2: Token Interaction Flow
- Implement deposit flow
- Build amount input with validation
- Create operator selection

### Phase 3: Dashboard & Position Management
- Build position view components
- Implement withdrawal functionality
- Add delegation interfaces

### Phase 4: Animation & Polish
- Add Framer Motion animations
- Implement loading states
- Refine transitions between modals

## 8. Comparison with Current Flow

### Key Improvements
- **Reduced Page Transitions**: Eliminate multi-page flow in favor of modals
- **Progressive Disclosure**: Only show relevant information at each step
- **Contextual Operations**: Present actions in context (e.g., MAX button with input)
- **Visual Hierarchy**: Primary actions given visual prominence
- **Simplified Mental Model**: Clear, linear progression through tasks
- **Protocol Abstraction**: Focus on tokens and actions rather than underlying protocols (EVM/XRP)
- **Goal-Oriented Navigation**: Structure follows user goals rather than technical implementation

### Migration Considerations
- Current users will need to adapt to modal-based flow
- Technical information moved to secondary positions
- Operations now more guided with fewer choices simultaneously
- Current StakingTabs component will need significant refactoring or replacement
- Need to combine EVM and XRP staking logic into a unified system