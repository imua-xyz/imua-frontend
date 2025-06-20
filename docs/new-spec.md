# IMUA Staking Frontend Specification

## 1. Application Structure

### 1.1 Primary Navigation

The application will consist of three main pages with distinct purposes:

1. **Home/Root** - Landing page with navigation to main functional areas
2. **Staking** - For all token staking operations (deposit, delegate, undelegate, withdraw)
3. **Dashboard** - For viewing positions, rewards, and overall staking information

### 1.2 URL Structure

```
/             - Root/landing page
/staking      - Main staking operations page
/dashboard    - User positions and rewards view
```

## 2. Page Specifications

### 2.1 Root Page

**Purpose:** Provide a clear entry point to the application and direct users to the main functional areas.

**Initial State:**
- Display IMUA logo
- Display welcome message
- Show cards for the two main sections (Staking and Dashboard)

**User Flow:**
1. User lands on the root page
2. User selects either Staking or Dashboard based on their goal
3. User is navigated to the selected section

**Key Components:**
- `<Logo />` - Brand identity at top
- `<WelcomeMessage />` - Brief platform description
- `<NavigationCards />` - Cards linking to main functional areas

**Layout:**
```
+----------------------------------+
|            IMUA LOGO             |
+----------------------------------+
|                                  |
|        Welcome to IMUA           |
|      Decentralized Staking       |
|                                  |
|  +---------------------------+   |
|  |                           |   |
|  |        STAKING            |   |
|  |                           |   |
|  | Deposit, delegate, and    |   |
|  | manage your token stakes  |   |
|  |                           |   |
|  +---------------------------+   |
|                                  |
|  +---------------------------+   |
|  |                           |   |
|  |        DASHBOARD          |   |
|  |                           |   |
|  | View your positions and   |   |
|  | track your rewards        |   |
|  |                           |   |
|  +---------------------------+   |
|                                  |
+----------------------------------+
```

### 2.2 Staking Page

**Purpose:** Allow users to perform all staking-related operations in a modal-driven flow.

**Initial State:**
- Display logo
- Display token selection panel with available tokens
- Show Connect Wallet button after token selection

**User Flow:**
1. User selects a token type (ETH, XRP, etc.)
2. User connects wallet specific to the selected token
3. User is presented with operation options through contextual modals

**Key Components:**
- `<Logo />` - Brand identity at top
- `<TokenSelectionPanel />` - Card with token options and APY
- `<ConnectWalletButton />` - Appears after token selection
- `<WalletConnectionModal />` - Appears when connecting wallet
- `<StakeModal />` - For stake/deposit operations with optional delegation
- `<DelegateModal />` - For dedicated delegation operations of already deposited tokens
- `<OperatorsList />` - Grid view of operators with metrics for delegation
- `<UndelegateModal />` - For undelegation operations
- `<WithdrawModal />` - For withdrawal operations

**Layout:**
```
+-----------------------------+
|            LOGO             |
+-----------------------------+
|      STAKING | DASHBOARD    |
+-----------------------------+
|                             |
|     Choose Token Type       |
|  +---------------------+    |
|  |        ETH          |    |
|  |      Ethereum       |    |
|  |        APY 5.2%     |    |
|  +---------------------+    |
|  |        XRP          |    |
|  |       Ripple        |    |
|  |        APY 4.8%     |    |
|  +---------------------+    |
|                             |
|      [Connect Wallet]       |
|                             |
+-----------------------------+
```

### 2.3 Dashboard Page

**Purpose:** Display user's staking positions, rewards, and overall portfolio.

**Initial State:**
- If wallet not connected, show connect prompt
- If wallet connected, show all positions and rewards

**User Flow:**
1. User navigates to Dashboard
2. If not connected, user connects wallet
3. User views staking positions across all tokens
4. User can filter/sort positions and view detailed metrics

**Key Components:**
- `<Logo />` - Brand identity at top
- `<PositionsSummary />` - Total value staked and rewards earned
- `<PositionCards />` - Individual position cards for each token
- `<PositionActions />` - Quick actions for each position (delegate, withdraw, etc.)
- `<RewardsDisplay />` - Detailed rewards information
- `<ConnectWalletPrompt />` - Shown if wallet not connected

**Layout:**
```
+-----------------------------+
|            LOGO             |
+-----------------------------+
|      STAKING | DASHBOARD    |
+-----------------------------+
|                             |
|     Total Value Staked      |
|      $X,XXX,XXX.XX          |
|                             |
|     Total Rewards Earned    |
|       $XXX,XXX.XX           |
|                             |
+-----------------------------+
|                             |
|  +---------------------+    |
|  |        ETH          |    |
|  |      $X,XXX.XX      |    |
|  |     Rewards: $XXX   |    |
|  +---------------------+    |
|                             |
|  +---------------------+    |
|  |        XRP          |    |
|  |      $X,XXX.XX      |    |
|  |     Rewards: $XXX   |    |
|  +---------------------+    |
|                             |
+-----------------------------+
```

## 3. Component Specifications

### 3.1 Shared Components

#### 3.1.1 Navigation Bar

**Purpose:** Provide consistent navigation between main sections.

**Props:**
- `activePage`: Current active page

**Behavior:**
- Highlights current active page
- Provides navigation between Staking and Dashboard
- Includes animated underline for active tab

**Design:**
- Use Framer Motion for smooth animations
- Follow design system for colors and spacing

### 3.2 Staking Page Components

#### 3.2.1 TokenSelectionPanel

**Purpose:** Allow users to select which token they want to stake.

**Props:**
- `tokens`: Array of available tokens with metadata
- `selectedToken`: Currently selected token
- `onTokenSelect`: Callback for token selection

**Behavior:**
- Display list of available tokens with icons, names, and APY
- Highlight selected token
- Trigger wallet connection flow when token selected

**Design:**
- Card-based design with hover effects
- APY prominently displayed in accent color

#### 3.2.2 ConnectWalletButton

**Purpose:** Trigger wallet connection flow.

**Props:**
- `onClick`: Function to open wallet connection modal
- `tokenType`: Type of token selected (determines wallet options)

**Behavior:**
- Appears after token selection
- Opens appropriate wallet connection modal based on token type

**Design:**
- Primary button style from design system
- Full width with appropriate padding

#### 3.2.3 WalletConnectionModal

**Purpose:** Facilitate wallet connection.

**Props:**
- `isOpen`: Boolean to control visibility
- `onClose`: Function to close modal
- `tokenType`: Type of token to connect for
- `onSuccess`: Callback on successful connection

**Behavior:**
- Display appropriate wallet options based on token type
- Show connection status and handle errors
- Proceed to operation selection on successful connection

**Design:**
- Modal dialog with animation
- Wallet options as selectable cards

#### 3.2.4 StakeModal

**Purpose:** Allow users to specify stake amount and optionally select an operator for delegation in a single flow.

**Props:**
- `isOpen`: Boolean to control visibility
- `onClose`: Function to close modal
- `token`: Selected token
- `balance`: User's wallet balance
- `onStake`: Function to execute stake/deposit
- `onStakeAndDelegate`: Function to execute stake with delegation

**Behavior:**
- Allow amount input with MAX button
- Show estimated rewards/APY
- Provide option to select an operator (with toggle for "Deposit only")
- Validate input and show errors
- Show transaction status and confirmation
- Combine deposit and delegation into a single operation when operator is selected
- When "Stake" (vs "Deposit only") is selected, provide two operator selection modes:
  1. **Quick Selection**: Simplified dropdown with top 5-7 operators by APY
  2. **Advanced Selection**: Button to open expanded operator comparison view
- Include a "View all operators" link that opens the comprehensive OperatorsView
- Remember user's last selected operator for future operations

**Design:**
- Modal with token information at top
- Input field with MAX button
- Operator selection section (can be collapsed if "Deposit only" is selected)
- Primary action button changes text based on selection (Deposit/Delegate)

#### 3.2.5 DelegateModal

**Purpose:** Allow users to delegate already deposited tokens to operators.

**Props:**
- `isOpen`: Boolean to control visibility
- `onClose`: Function to close modal
- `token`: Selected token
- `availableToDelegate`: Amount available for delegation
- `currentDelegations`: Current delegations if any
- `onDelegate`: Function to execute delegation

**Behavior:**
- Display available amount for delegation
- Show current delegations (if any)
- Allow selection of an operator from the comprehensive list
- Support changing delegation from one operator to another
- Allow delegation amount input with MAX button
- Validate input and show errors

**Design:**
- Modal with token information at top
- Current delegations summary (if applicable)
- Amount input field with MAX button
- Operators list component embedded within the modal
- Primary action button for delegation

#### 3.2.6 OperatorsList

**Purpose:** Display a comprehensive grid of available operators with metrics for easy comparison.

**Props:**
- `operators`: Array of operator data
- `selectedOperator`: Currently selected operator
- `onOperatorSelect`: Callback for operator selection
- `sortBy`: Current sort criterion
- `onSortChange`: Callback to change sorting

**Behavior:**
- Display all operators in a grid/table view
- Allow sorting by different metrics (APY, Fee, Stake amount, etc.)
- Support filtering options
- Highlight selected operator
- Include action buttons for each operator
- Support two display modes:
  1. **Compact Mode**: For embedding within operation modals
  2. **Expanded Mode**: For detailed comparison in the dedicated operators view
- Provide visual indicators for key metrics (highest APY, lowest fee, etc.)
- Include historical performance graphs when in expanded mode
- Allow comparison of selected operators in a side-by-side view

**Design:**
```
+----------------------------------------+
|           Filter/Sort Controls         |
+----------------------------------------+
| Operator | Stake | Stakers | Fee | APY |
+----------------------------------------+
| Operator1|  $XX  |  XXXX   | X%  | X%  |
|          |       |         |     |     |
|         [Delegate Button]          |
+----------------------------------------+
| Operator2|  $XX  |  XXXX   | X%  | X%  |
|          |       |         |     |     |
|         [Delegate Button]          |
+----------------------------------------+
```

- Card-based design for each operator
- Sort controls at the top
- Visual indicators for best APY, lowest fee, etc.
- Responsive design that collapses to more compact view on smaller screens

#### 3.2.7 UndelegateModal

**Purpose:** Allow users to undelegate tokens from operators.

**Props:**
- `isOpen`: Boolean to control visibility
- `onClose`: Function to close modal
- `token`: Selected token
- `delegations`: Current delegations to operators
- `onUndelegate`: Function to execute undelegation

**Behavior:**
- Display current delegations to operators
- Allow selection of amount to undelegate
- Show estimated unbonding period
- Validate input and show errors
- Support undelegating from multiple operators if applicable

**Design:**
- Modal with token information at top
- List of current delegations with operators
- Amount input field with MAX button for each delegation
- Clear indication of unbonding period and consequences
- Primary action button for undelegation

#### 3.2.8 WithdrawModal

**Purpose:** Allow users to withdraw staked tokens.

**Props:**
- `isOpen`: Boolean to control visibility
- `onClose`: Function to close modal
- `token`: Selected token
- `availableToWithdraw`: Amount available for withdrawal
- `onWithdraw`: Function to execute withdrawal

**Behavior:**
- Display available amount for withdrawal
- Allow selection of amount to withdraw
- Validate input and show errors
- Show transaction status and confirmation

**Design:**
- Modal with token information at top
- Amount input field with MAX button
- Primary action button for withdrawal

#### 3.2.9 OperatorsView

**Purpose:** Provide a dedicated view for comparing operators.

**Props:**
- `operators`: Array of operator data
- `onOperatorSelect`: Callback for operator selection
- `onOperatorAction`: Callback that opens appropriate modal with pre-selected operator

**Behavior:**
- Display comprehensive operator metrics in a filterable, sortable table
- Allow users to initiate any operator-related action (Stake, Delegate, Undelegate)
- Show detailed performance history and statistics
- Provide search and filtering capabilities

**Design:**
- Full-page or modal view with expanded metrics
- Visual highlighting of top performers
- Action menu for each operator
- Detail expansion for deeper statistics

### 3.3 Dashboard Page Components

#### 3.3.1 PositionsSummary

**Purpose:** Show aggregated position data.

**Props:**
- `totalStaked`: Total value staked
- `totalRewards`: Total rewards earned

**Behavior:**
- Display totals in USD
- Animate values when they change

**Design:**
- Large, prominent numbers
- Card-based layout with appropriate spacing

#### 3.3.2 PositionCard

**Purpose:** Display individual token position details.

**Props:**
- `token`: Token data
- `amount`: Staked amount
- `delegatedAmount`: Amount delegated to operators
- `undelegatedAmount`: Amount staked but not delegated
- `rewards`: Earned rewards
- `apy`: Current APY

**Behavior:**
- Display token icon, name, and key metrics
- Show delegation status (delegated vs. undelegated amounts)
- Provide quick access to common actions (delegate more, undelegate, withdraw)

**Design:**
- Card design with token branding
- Clear hierarchy of information
- Visual indicators for delegation status

## 4. Modal Flow Architecture

### 4.1 Modal Hierarchy

The application will use a progressive modal system:

1. **Level 1: Token Selection** - Initial view on Staking page
2. **Level 2: Wallet Connection** - After token selection
3. **Level 3: Operation Selection** - Tabs for different operations (Stake/Delegate/Undelegate/Withdraw)
4. **Level 4: Operation Modals**:
   - StakeModal (with combined deposit/delegate functionality)
   - DelegateModal (for delegating already deposited tokens)
   - UndelegateModal (for undelegating tokens)
   - WithdrawModal (for withdrawing tokens)

#### 4.1.1 Context-Sensitive Entry Points

The application will support multiple entry points to the staking workflow:

1. **Token-first**: User selects token → sees operations → selects operator if needed
2. **Operator-first**: User navigates to Operators view → selects operator → chooses operation
3. **Dashboard-initiated**: User selects action from position card → pre-fills relevant modal

Each entry point should maintain context and pre-fill appropriate values while ensuring the same core functionality is accessible.

### 4.2 Modal State Management

- Use a central modal manager to control which modals are visible
- Maintain a modal history stack for back navigation
- Preserve form state between modal transitions

### 4.3 Modal Animation Guidelines

- Entry animations: Fade + scale from 95% to 100%
- Exit animations: Fade + scale down
- Transition timing: 300ms with custom easing
- Use AnimatePresence from Framer Motion for smooth transitions

## 5. State Management

### 5.1 Global State

- Wallet connection status
- Selected token information
- User balances and positions
- Delegation information
- Transaction history
- Operator data and metrics

### 5.2 Page-Specific State

**Staking Page:**
- Current operation tab (Stake/Delegate/Undelegate/Withdraw)
- Current modal state
- Form input values
- Selected operator (if applicable)
- Validation errors
- Transaction status
- Sorting/filtering preferences for operators list

**Dashboard Page:**
- Filter/sort preferences
- Expanded position details
- View preferences

### 5.3 Balance State Visualization

To help users understand the impact of their actions on different balance states:

- Implement visual balance transfer animations between categories
- Show before/after state projections prior to confirming transactions
- Display timeline indicators for time-dependent operations (unbonding)
- Provide success summaries showing exact state changes after operation completion

## 6. Design System Implementation

### 6.1 Colors

Use explicit color values from the design system:
- Primary: `#e631dc` (Magenta/pink)
- Accent: `#00e5ff` (Cyan)
- Background colors (various dark shades)
- Text colors (white, gray variants)

### 6.2 Typography

- Use consistent font sizes and weights from design system
- Maintain proper hierarchy with heading levels

### 6.3 Components

Implement and use components from the design system:
- Buttons (primary, secondary)
- Input fields
- Cards and containers
- Selection items
- Modal dialogs
- Tables and grids for operator list

## 7. Responsive Considerations

- Design for desktop-first (primary use case)
- Support tablet layouts with minor adjustments
- Mobile support with stacked layouts and simplified information
- For OperatorsList, collapse to a more compact view on smaller screens
- Consider reverting to selector dropdown for operators on very small screens

## 8. Accessibility Guidelines

- Ensure proper focus management in modal flows
- Provide appropriate ARIA attributes
- Maintain sufficient color contrast
- Support keyboard navigation
- Ensure table/grid views are navigable via keyboard

## 9. Implementation Phases

### Phase 1: Core Structure and Navigation
- Implement main page templates
- Build navigation system
- Set up routing

### Phase 2: Token Selection and Wallet Connection
- Implement token selection panel
- Create wallet connection flow
- Build modal foundation

### Phase 3: Operation Tabs and Modals
- Implement operation tabs (Stake/Delegate/Undelegate/Withdraw)
- Build StakeModal with combined functionality
- Create DelegateModal for separate delegation operations
- Create OperatorsList component with sorting/filtering
- Implement undelegate and withdraw flows

### Phase 4: Dashboard Implementation
- Build positions view
- Implement rewards display
- Create filtering and sorting options

### Phase 5: Polish and Refinement
- Add animations and transitions
- Implement loading states
- Refine error handling
- Add success feedback

## 10. Technical Requirements

- Next.js for rendering and routing
- Framer Motion for animations
- State management with React Context or similar
- TypeScript for type safety
- Tailwind CSS for styling (with custom theme)

## 11. Performance Considerations

- Lazy load modals and secondary components
- Optimize bundle size for critical rendering path
- Implement proper loading states for async operations
- Cache contract data when appropriate
- Virtualize long lists of operators to maintain performance

This specification provides a comprehensive guide for implementing the IMUA staking frontend according to the design system and user flow requirements.
