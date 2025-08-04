# Visa Product Design System (VDS) Reference

This document contains design tokens, components, and implementation notes for integrating the Visa Product Design System into the Alpha Scanner project.

**Note**: This is prepared for future implementation as specified in the PRD. VDS integration is planned for Task 8 after core functionality is complete.

## Overview

The Visa Product Design System provides a comprehensive set of design tokens, components, and patterns for building consistent financial applications.

**Primary Resources**:
- **VDS Home**: https://design.visa.com/
- **Getting Started**: https://design.visa.com/designing/
- **Component Library**: https://design.visa.com/components/
- **Design Tokens**: https://design.visa.com/tokens/

## Design Tokens

### Color Palette

```css
/* Primary Brand Colors */
:root {
  --vds-color-brand-primary: #1A1F71;      /* Visa Deep Blue */
  --vds-color-brand-secondary: #F7931A;    /* Visa Gold/Orange */
  
  /* Neutral Colors */
  --vds-color-neutral-50: #F8F9FA;
  --vds-color-neutral-100: #F1F3F4;
  --vds-color-neutral-200: #E8EAED;
  --vds-color-neutral-300: #DADCE0;
  --vds-color-neutral-400: #BDC1C6;
  --vds-color-neutral-500: #9AA0A6;
  --vds-color-neutral-600: #80868B;
  --vds-color-neutral-700: #5F6368;
  --vds-color-neutral-800: #3C4043;
  --vds-color-neutral-900: #202124;
  
  /* Semantic Colors */
  --vds-color-success: #137333;
  --vds-color-success-light: #E6F4EA;
  --vds-color-warning: #F9AB00;
  --vds-color-warning-light: #FEF7E0;
  --vds-color-error: #D93025;
  --vds-color-error-light: #FCE8E6;
  --vds-color-info: #1A73E8;
  --vds-color-info-light: #E8F0FE;
}
```

### Typography

```css
/* Font Families */
:root {
  --vds-font-family-primary: 'VisaFont', 'Helvetica Neue', Arial, sans-serif;
  --vds-font-family-mono: 'SF Mono', Consolas, 'Liberation Mono', monospace;
  
  /* Font Weights */
  --vds-font-weight-light: 300;
  --vds-font-weight-regular: 400;
  --vds-font-weight-medium: 500;
  --vds-font-weight-semibold: 600;
  --vds-font-weight-bold: 700;
  
  /* Font Sizes */
  --vds-font-size-xs: 0.75rem;    /* 12px */
  --vds-font-size-sm: 0.875rem;   /* 14px */
  --vds-font-size-base: 1rem;     /* 16px */
  --vds-font-size-lg: 1.125rem;   /* 18px */
  --vds-font-size-xl: 1.25rem;    /* 20px */
  --vds-font-size-2xl: 1.5rem;    /* 24px */
  --vds-font-size-3xl: 1.875rem;  /* 30px */
  --vds-font-size-4xl: 2.25rem;   /* 36px */
  
  /* Line Heights */
  --vds-line-height-tight: 1.25;
  --vds-line-height-normal: 1.5;
  --vds-line-height-relaxed: 1.75;
}
```

### Spacing Scale

```css
:root {
  --vds-space-1: 0.25rem;   /* 4px */
  --vds-space-2: 0.5rem;    /* 8px */
  --vds-space-3: 0.75rem;   /* 12px */
  --vds-space-4: 1rem;      /* 16px */
  --vds-space-5: 1.25rem;   /* 20px */
  --vds-space-6: 1.5rem;    /* 24px */
  --vds-space-8: 2rem;      /* 32px */
  --vds-space-10: 2.5rem;   /* 40px */
  --vds-space-12: 3rem;     /* 48px */
  --vds-space-16: 4rem;     /* 64px */
  --vds-space-20: 5rem;     /* 80px */
  --vds-space-24: 6rem;     /* 96px */
}
```

### Border Radius

```css
:root {
  --vds-radius-none: 0;
  --vds-radius-sm: 0.125rem;    /* 2px */
  --vds-radius-base: 0.25rem;   /* 4px */
  --vds-radius-md: 0.375rem;    /* 6px */
  --vds-radius-lg: 0.5rem;      /* 8px */
  --vds-radius-xl: 0.75rem;     /* 12px */
  --vds-radius-2xl: 1rem;       /* 16px */
  --vds-radius-full: 9999px;
}
```

### Shadows

```css
:root {
  --vds-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --vds-shadow-base: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  --vds-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --vds-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --vds-shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}
```

## Component Patterns

### Button Components

```css
/* Base Button Styles */
.vds-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--vds-space-3) var(--vds-space-6);
  font-family: var(--vds-font-family-primary);
  font-size: var(--vds-font-size-base);
  font-weight: var(--vds-font-weight-medium);
  line-height: var(--vds-line-height-tight);
  border-radius: var(--vds-radius-md);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  text-decoration: none;
}

/* Primary Button */
.vds-button--primary {
  background-color: var(--vds-color-brand-primary);
  color: white;
  border-color: var(--vds-color-brand-primary);
}

.vds-button--primary:hover {
  background-color: var(--vds-color-brand-primary);
  transform: translateY(-1px);
  box-shadow: var(--vds-shadow-md);
}

/* Secondary Button */
.vds-button--secondary {
  background-color: transparent;
  color: var(--vds-color-brand-primary);
  border-color: var(--vds-color-brand-primary);
}

.vds-button--secondary:hover {
  background-color: var(--vds-color-brand-primary);
  color: white;
}
```

### Card Components

```css
.vds-card {
  background-color: white;
  border-radius: var(--vds-radius-lg);
  box-shadow: var(--vds-shadow-base);
  overflow: hidden;
  transition: box-shadow 0.2s ease-in-out;
}

.vds-card:hover {
  box-shadow: var(--vds-shadow-lg);
}

.vds-card__header {
  padding: var(--vds-space-6);
  border-bottom: 1px solid var(--vds-color-neutral-200);
}

.vds-card__body {
  padding: var(--vds-space-6);
}

.vds-card__footer {
  padding: var(--vds-space-6);
  border-top: 1px solid var(--vds-color-neutral-200);
  background-color: var(--vds-color-neutral-50);
}
```

### Form Components

```css
.vds-form-group {
  margin-bottom: var(--vds-space-6);
}

.vds-label {
  display: block;
  font-family: var(--vds-font-family-primary);
  font-size: var(--vds-font-size-sm);
  font-weight: var(--vds-font-weight-medium);
  color: var(--vds-color-neutral-700);
  margin-bottom: var(--vds-space-2);
}

.vds-input {
  width: 100%;
  padding: var(--vds-space-3) var(--vds-space-4);
  font-family: var(--vds-font-family-primary);
  font-size: var(--vds-font-size-base);
  border: 1px solid var(--vds-color-neutral-300);
  border-radius: var(--vds-radius-md);
  transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.vds-input:focus {
  outline: none;
  border-color: var(--vds-color-brand-primary);
  box-shadow: 0 0 0 3px rgba(26, 31, 113, 0.1);
}

.vds-input--error {
  border-color: var(--vds-color-error);
}

.vds-input--error:focus {
  box-shadow: 0 0 0 3px rgba(217, 48, 37, 0.1);
}
```

## Alpha Scanner Integration Plan

### Component Mapping

**Dashboard Components**:
```css
/* Opportunity Cards */
.opportunity-card {
  @apply vds-card;
  /* Custom styling for signal scores, prices, etc. */
}

/* Top Navigation */
.app-header {
  background-color: var(--vds-color-brand-primary);
  color: white;
  padding: var(--vds-space-4) var(--vds-space-6);
}

/* Data Tables */
.opportunity-table {
  /* Apply VDS table styling */
  border: 1px solid var(--vds-color-neutral-200);
  border-radius: var(--vds-radius-lg);
}
```

**Risk Sandbox Components**:
```css
/* Parameter Controls */
.risk-controls {
  @apply vds-card;
  display: grid;
  gap: var(--vds-space-4);
}

/* Chart Containers */
.chart-container {
  @apply vds-card;
  padding: var(--vds-space-6);
}

/* Simulation Results */
.simulation-stats {
  display: flex;
  gap: var(--vds-space-4);
  margin-top: var(--vds-space-6);
}

.stat-card {
  @apply vds-card;
  text-align: center;
  padding: var(--vds-space-4);
  flex: 1;
}
```

### Dark Mode Adaptation

```css
/* Dark mode token overrides */
[data-theme="dark"] {
  --vds-color-neutral-50: #202124;
  --vds-color-neutral-100: #3C4043;
  --vds-color-neutral-200: #5F6368;
  --vds-color-neutral-300: #80868B;
  --vds-color-neutral-800: #F1F3F4;
  --vds-color-neutral-900: #F8F9FA;
  
  /* Background colors */
  --vds-bg-primary: var(--vds-color-neutral-50);
  --vds-bg-secondary: var(--vds-color-neutral-100);
  
  /* Text colors */
  --vds-text-primary: var(--vds-color-neutral-900);
  --vds-text-secondary: var(--vds-color-neutral-800);
}
```

### Financial Data Visualization

**Price/Score Indicators**:
```css
.score-indicator {
  display: inline-flex;
  align-items: center;
  padding: var(--vds-space-1) var(--vds-space-3);
  border-radius: var(--vds-radius-full);
  font-size: var(--vds-font-size-sm);
  font-weight: var(--vds-font-weight-medium);
}

.score-indicator--high {
  background-color: var(--vds-color-success-light);
  color: var(--vds-color-success);
}

.score-indicator--medium {
  background-color: var(--vds-color-warning-light);
  color: var(--vds-color-warning);
}

.score-indicator--low {
  background-color: var(--vds-color-error-light);
  color: var(--vds-color-error);
}
```

**Price Movement Indicators**:
```css
.price-change {
  display: flex;
  align-items: center;
  gap: var(--vds-space-1);
  font-weight: var(--vds-font-weight-medium);
}

.price-change--positive {
  color: var(--vds-color-success);
}

.price-change--negative {
  color: var(--vds-color-error);
}

.price-change__arrow {
  font-size: var(--vds-font-size-xs);
}
```

## React Component Examples

### VDS Button Component

```typescript
// components/ui/VDSButton.tsx
import React from 'react';
import clsx from 'clsx';

interface VDSButtonProps {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

export const VDSButton: React.FC<VDSButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  disabled = false,
  onClick,
  className,
  ...props
}) => {
  return (
    <button
      className={clsx(
        'vds-button',
        `vds-button--${variant}`,
        `vds-button--${size}`,
        disabled && 'vds-button--disabled',
        className
      )}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};
```

### VDS Card Component

```typescript
// components/ui/VDSCard.tsx
import React from 'react';
import clsx from 'clsx';

interface VDSCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

interface VDSCardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface VDSCardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export const VDSCard: React.FC<VDSCardProps> = ({ children, className, hover = false }) => {
  return (
    <div className={clsx('vds-card', hover && 'vds-card--hover', className)}>
      {children}
    </div>
  );
};

export const VDSCardHeader: React.FC<VDSCardHeaderProps> = ({ children, className }) => {
  return (
    <div className={clsx('vds-card__header', className)}>
      {children}
    </div>
  );
};

export const VDSCardBody: React.FC<VDSCardBodyProps> = ({ children, className }) => {
  return (
    <div className={clsx('vds-card__body', className)}>
      {children}
    </div>
  );
};
```

## Implementation Roadmap

### Phase 1: Token Integration
1. Install VDS tokens as CSS custom properties
2. Update existing components to use VDS color scheme
3. Implement dark mode toggle with VDS tokens

### Phase 2: Component Migration
1. Replace existing buttons with VDS button variants
2. Migrate cards and data display components
3. Update form components with VDS styling

### Phase 3: Advanced Patterns
1. Implement VDS navigation patterns
2. Add VDS data visualization components
3. Integrate financial-specific VDS patterns

### Phase 4: Accessibility & Polish
1. Ensure WCAG 2.1 AA compliance with VDS patterns
2. Add VDS animations and transitions
3. Optimize for screen readers and keyboard navigation

## Development Tools

### CSS Preprocessor Setup

```scss
// styles/tokens/_vds-tokens.scss
@import url('https://cdn.design.visa.com/tokens/v1/tokens.css');

// styles/components/_vds-components.scss
@import './buttons';
@import './cards';
@import './forms';
@import './navigation';

// styles/main.scss
@import './tokens/vds-tokens';
@import './components/vds-components';
@import './overrides/alpha-scanner-custom';
```

### PostCSS Configuration

```javascript
// postcss.config.js
module.exports = {
  plugins: {
    'postcss-import': {},
    'postcss-nested': {},
    'postcss-custom-properties': {
      preserve: false,
    },
    autoprefixer: {},
    cssnano: process.env.NODE_ENV === 'production' ? {} : false,
  },
};
```

## Resources

- **VDS Documentation**: https://design.visa.com/
- **Component Library**: https://design.visa.com/components/
- **Design Tokens**: https://design.visa.com/tokens/
- **Accessibility Guidelines**: https://design.visa.com/accessibility/
- **Brand Guidelines**: https://brand.visa.com/

---

**Last Updated**: 2025-01-04  
**Implementation Status**: Planned for Task 8 (Future Implementation)