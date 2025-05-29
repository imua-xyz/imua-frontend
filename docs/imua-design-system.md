# Imua UI Design System

## Design Tokens

### Colors

```css
/* Primary Colors */
--color-primary: #e631dc; /* Magenta/pink for branding and titles */
--color-accent: #00e5ff; /* Cyan for buttons, APY values, interactive elements */
--color-accent-hover: #33eaff; /* Lighter cyan for hover states */

/* Background Colors */
--color-background-primary: #000000; /* Main page background */
--color-background-card: #15151c; /* Card/container backgrounds */
--color-background-modal: #1a1a24; /* Modal dialog backgrounds */
--color-background-input: #0f0f14; /* Input field backgrounds */
--color-background-selected: #292936; /* Selected items, focused elements */
--color-background-hover: rgba(255, 255, 255, 0.05); /* Hover state for items */

/* Text Colors */
--color-text-primary: #ffffff; /* Primary text */
--color-text-secondary: #9999aa; /* Secondary/descriptive text */
--color-text-accent: #00e5ff; /* Highlighted text, matches accent color */
--color-text-success: #00dc82; /* Success messages, "Detected" status */
--color-text-error: #ff3c5c; /* Error messages */

/* Border Colors */
--color-border: rgba(255, 255, 255, 0.1); /* Subtle borders */
--color-border-accent: #00e5ff; /* Accent borders for focus/active states */
```

### Typography

```css
/* Font Family */
--font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

/* Font Sizes */
--font-size-xs: 0.75rem; /* 12px */
--font-size-sm: 0.875rem; /* 14px */
--font-size-base: 1rem; /* 16px */
--font-size-lg: 1.125rem; /* 18px */
--font-size-xl: 1.25rem; /* 20px */
--font-size-2xl: 1.5rem; /* 24px */
--font-size-3xl: 1.875rem; /* 30px */

/* Font Weights */
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;

/* Line Heights */
--line-height-tight: 1.25;
--line-height-normal: 1.5;
--line-height-relaxed: 1.75;
```

### Spacing

```css
/* Spacing Scale */
--space-1: 0.25rem; /* 4px */
--space-2: 0.5rem; /* 8px */
--space-3: 0.75rem; /* 12px */
--space-4: 1rem; /* 16px */
--space-5: 1.25rem; /* 20px */
--space-6: 1.5rem; /* 24px */
--space-8: 2rem; /* 32px */
--space-10: 2.5rem; /* 40px */
--space-12: 3rem; /* 48px */
--space-16: 4rem; /* 64px */
```

### Borders & Radius

```css
/* Border Radius */
--radius-sm: 0.375rem; /* 6px */
--radius-md: 0.5rem; /* 8px */
--radius-lg: 0.75rem; /* 12px */
--radius-xl: 1rem; /* 16px */
--radius-full: 9999px; /* For pills and circular elements */

/* Border Widths */
--border-width-thin: 1px;
--border-width-normal: 2px;
--border-width-thick: 3px;
```

### Shadows

```css
/* Box Shadows */
--shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.3);
--shadow-md: 0 4px 8px rgba(0, 0, 0, 0.4);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.5);
--shadow-inner: inset 0 2px 4px rgba(0, 0, 0, 0.3);
```

## Component Library

### 1. Modal Dialog

```css
.modal {
  @apply fixed inset-0 z-50 flex items-center justify-center;
  background-color: rgba(0, 0, 0, 0.7);
}

.modal-content {
  @apply bg-[#1a1a24] rounded-xl w-full max-w-md mx-auto p-6 shadow-lg;
  @apply border border-[rgba(255,255,255,0.1)];
}

.modal-header {
  @apply flex items-center justify-between mb-6;
}

.modal-title {
  @apply text-2xl font-bold text-[#e631dc];
}

.modal-close {
  @apply text-white opacity-70 hover:opacity-100 transition-opacity;
}
```

### 2. Buttons

```css
.button-primary {
  @apply bg-[#00e5ff] hover:bg-[#33eaff] text-black font-medium;
  @apply rounded-full py-3 px-6 transition-colors;
  @apply flex items-center justify-center;
}

.button-secondary {
  @apply bg-transparent border border-[#00e5ff] text-[#00e5ff] font-medium;
  @apply rounded-full py-3 px-6 transition-colors;
  @apply hover:bg-[rgba(0,229,255,0.1)];
}

.button-small {
  @apply py-1 px-4 text-sm;
}

.button-disabled {
  @apply opacity-50 cursor-not-allowed;
}
```

### 3. Input Fields

```css
.input-container {
  @apply bg-[#0f0f14] rounded-lg p-4;
  @apply flex items-center justify-between;
}

.input-field {
  @apply bg-transparent text-white text-xl w-full outline-none;
  @apply placeholder-[#9999aa] placeholder-opacity-50;
}

.input-action {
  @apply text-[#00e5ff] font-medium ml-2;
  @apply hover:text-[#33eaff] transition-colors;
}

.input-label {
  @apply text-[#9999aa] text-sm mb-2;
}

.input-balance {
  @apply text-right text-[#9999aa] text-sm mt-2;
}
```

### 4. Selection Cards/List Items

```css
.selection-item {
  @apply w-full flex items-center p-4 rounded-lg;
  @apply hover:bg-[rgba(255,255,255,0.05)] transition-colors;
  @apply cursor-pointer mb-2;
}

.selection-item-selected {
  @apply bg-[#292936];
}

.selection-item-icon {
  @apply w-10 h-10 mr-3 rounded-full overflow-hidden;
}

.selection-item-content {
  @apply flex-1;
}

.selection-item-title {
  @apply font-bold text-white;
}

.selection-item-subtitle {
  @apply text-[#9999aa] text-sm;
}

.selection-item-badge {
  @apply ml-auto text-[#00e5ff];
}

.selection-item-status {
  @apply ml-auto text-[#00dc82];
}
```

### 5. Navigation Tabs

```css
.tabs-container {
  @apply flex justify-center space-x-8 text-xl mb-10;
}

.tab-item {
  @apply text-[#9999aa] font-medium;
  @apply hover:text-white transition-colors;
  @apply relative py-2;
}

.tab-item-active {
  @apply text-[#00e5ff];
}

.tab-item-active::after {
  content: "";
  @apply absolute bottom-0 left-0 right-0 h-[2px] bg-[#00e5ff];
}
```

### 6. Token Display

```css
.token-display {
  @apply flex items-center p-4 rounded-lg;
  @apply border border-[rgba(255,255,255,0.1)] bg-[#1a1a24];
}

.token-icon {
  @apply w-8 h-8 mr-3;
}

.token-symbol {
  @apply font-bold text-white;
}

.token-name {
  @apply ml-2 text-[#9999aa];
}

.token-apy {
  @apply ml-auto text-[#00e5ff];
}
```

### 7. Cards/Containers

```css
.card {
  @apply bg-[#15151c] rounded-xl p-6;
  @apply border border-[rgba(255,255,255,0.05)];
}

.card-header {
  @apply mb-6;
}

.card-title {
  @apply text-[#e631dc] text-2xl font-bold;
}

.card-content {
  @apply space-y-6;
}
```

### 8. Operator List Item

```css
.operator-item {
  @apply flex items-center justify-between p-4 rounded-lg;
  @apply hover:bg-[rgba(255,255,255,0.05)] transition-colors cursor-pointer;
}

.operator-details {
  @apply flex flex-col;
}

.operator-name {
  @apply text-white font-semibold;
}

.operator-fee {
  @apply text-[#9999aa] text-sm;
}

.operator-apy {
  @apply text-[#00e5ff] font-medium;
}
```

### 9. Sortable Header

```css
.sort-header {
  @apply flex items-center justify-between p-4;
  @apply border-b border-[rgba(255,255,255,0.05)];
}

.sort-title {
  @apply text-[#e631dc] text-xl font-bold;
}

.sort-options {
  @apply flex items-center space-x-4;
}

.sort-option {
  @apply text-[#9999aa] hover:text-white transition-colors;
  @apply flex items-center;
}

.sort-option-active {
  @apply text-white;
}

.sort-icon {
  @apply ml-1 h-4 w-4;
}
```

## Tailwind Configuration

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#e631dc',
        accent: '#00e5ff',
        background: {
          DEFAULT: '#000000',
          card: '#15151c',
          modal: '#1a1a24',
          input: '#0f0f14',
          selected: '#292936',
        },
        text: {
          primary: '#ffffff',
          secondary: '#9999aa',
          accent: '#00e5ff',
          success: '#00dc82',
          error: '#ff3c5c',
        },
      },
      borderRadius: {
        'xl': '1rem',
      },
      boxShadow: {
        modal: '0 10px 25px rgba(0, 0, 0, 0.5)',
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
```

## Appendix: Uniswap-Inspired Aesthetic Reference

The following aesthetic guidelines and examples are inspired by Uniswap's interface and can be used as a reference for future enhancements to the Imua design system.

### Animation Guidelines

```markdown
## Animation Guidelines

### Micro-interactions
- **Hover States**: Elements should respond subtly to hover with scale transformations (102-105%)
- **Active States**: Elements should respond to clicks with slight compression (97-98% scale)
- **Transitions**: All color/opacity changes should have 150-300ms transitions with ease-in-out timing

### Page Transitions
- **Page Entry**: Fade-in (300ms) with slight upward movement (10-20px)
- **Modal Entry**: Scale from 95% to 100% with fade-in
- **Loading States**: Pulsing opacity (0.7 to 1) for placeholders

### Animation Libraries
- Use **Framer Motion** for component animations
- Use **react-spring** for more complex, physics-based animations
```

### Visual Effects

```markdown
## Visual Effects

### Glassmorphism
- **Modal Backgrounds**: Subtle transparency (5-10%) with backdrop blur (8-12px)
- **Card Overlays**: Use rgba backgrounds with low opacity for layered effects
- **Borders**: Subtle white borders (rgba(255,255,255,0.1)) to define boundaries

### Glow Effects
- **Primary Elements**: Apply subtle box shadows in primary color (0 0 15px rgba(230,49,220,0.3))
- **Accent Elements**: Apply subtle box shadows in accent color (0 0 15px rgba(0,229,255,0.3))
- **Focus States**: Increase glow intensity on focus/active states

### Gradients
- **Background Accents**: Subtle gradients from primary to transparent for section backgrounds
- **Button Backgrounds**: Optional subtle gradients for primary buttons
- **Card Backgrounds**: Consider subtle directional gradients for important cards
```

### Motion Principles

```markdown
## Motion Principles

### Natural Motion
- **Easing**: Use custom cubic-bezier curves (0.16, 1, 0.3, 1) for natural motion
- **Spring Physics**: Configure spring animations with low tension (120-180) and low friction (12-18)
- **Delay Patterns**: Use staggered delays (50-80ms) for lists and grouped elements

### Responsive Feedback
- **Input Feedback**: Visual confirmation for all user inputs within 100ms
- **Loading States**: Never show a static UI during async operations
- **Success States**: Celebrate completions with subtle animations
```

### Implementation Examples

```jsx
// Button Hover/Press Effect (Framer Motion)
import { motion } from 'framer-motion';

export const AnimatedButton = ({ children, ...props }) => (
  <motion.div 
    whileHover={{ scale: 1.03 }}
    whileTap={{ scale: 0.97 }}
    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
  >
    <button 
      className="bg-accent hover:bg-accent-hover text-black font-medium
                rounded-full py-3 px-6 transition-colors duration-200"
      {...props}
    >
      {children}
    </button>
  </motion.div>
);

// Card with Glow Effect
export const GlowCard = ({ children, glow = 'primary', ...props }) => {
  const glowColors = {
    primary: 'rgba(230,49,220,0.25)',
    accent: 'rgba(0,229,255,0.25)',
    none: 'transparent'
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative"
    >
      <div 
        className="absolute inset-0 rounded-xl blur-lg opacity-50"
        style={{ 
          background: glow !== 'none' ? glowColors[glow] : 'transparent',
          transform: 'translateY(4px) scale(0.95)'
        }}
      />
      <div 
        className="bg-background-card relative z-10 rounded-xl p-6
                  border border-[rgba(255,255,255,0.05)]"
        {...props}
      >
        {children}
      </div>
    </motion.div>
  );
};

// Modal with Glassmorphism
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';

export const GlassModal = ({ isOpen, onClose, children }) => (
  <AnimatePresence>
    {isOpen && (
      <Dialog as="div" className="fixed inset-0 z-50" onClose={onClose}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md"
          >
            <Dialog.Panel className="bg-background-modal/95 backdrop-blur-md rounded-xl
                                    border border-[rgba(255,255,255,0.1)]
                                    shadow-lg shadow-black/50 p-6">
              {children}
            </Dialog.Panel>
          </motion.div>
        </div>
      </Dialog>
    )}
  </AnimatePresence>
);

// Animated List Items
import { motion } from 'framer-motion';

export const AnimatedList = ({ items }) => (
  <div className="space-y-2">
    {items.map((item, i) => (
      <motion.div
        key={item.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          duration: 0.3,
          delay: i * 0.05, // Staggered effect
          ease: [0.16, 1, 0.3, 1]
        }}
        whileHover={{ 
          backgroundColor: 'rgba(255,255,255,0.05)',
          transition: { duration: 0.15 }
        }}
        className="w-full flex items-center p-4 rounded-lg cursor-pointer"
      >
        <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
          <img src={item.icon} alt={item.name} />
        </div>
        <div className="flex-1">
          <div className="font-bold text-white">{item.name}</div>
          <div className="text-text-secondary text-sm">{item.description}</div>
        </div>
        <div className="text-accent">{item.value}</div>
      </motion.div>
    ))}
  </div>
);

// Background Gradient Effect
export const GradientBackground = ({ children }) => (
  <div className="relative">
    <div 
      className="absolute top-0 left-0 right-0 h-[500px] opacity-30 pointer-events-none"
      style={{
        background: 'radial-gradient(60% 50% at 50% 0%, rgba(230,49,220,0.12) 0%, transparent 100%)'
      }}
    />
    <div className="relative z-10">
      {children}
    </div>
  </div>
);
```

### Extended Tailwind Configuration

```js
// Extended Tailwind configuration with animation properties
module.exports = {
  theme: {
    extend: {
      // Existing config...
      
      // Animation extensions
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(0,229,255,0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(0,229,255,0.6)' },
        }
      },
      transitionTimingFunction: {
        'bounce-in-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'), // For more animation utilities
  ],
};
```
```