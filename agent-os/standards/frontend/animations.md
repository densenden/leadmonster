## Animation Standards (Brand OS)

### Motion Principles
- **Purposeful**: Every animation serves feedback, guidance, continuity, or brand expression
- **Fluid**: iOS26-inspired organic motion with physics-based springs
- **Subtle**: Enhance without distraction; UI remains simple
- **Accessible**: Support prefers-reduced-motion; never block interaction

### Timing Scale
```css
--duration-instant: 100ms;   /* Micro-feedback (button state) */
--duration-fast: 150ms;      /* Standard interactions */
--duration-normal: 250ms;    /* Page/modal transitions */
--duration-slow: 350ms;      /* Complex sequences */
--duration-slower: 500ms;    /* Dramatic emphasis */
```

### Easing Functions
```css
/* Primary - smooth deceleration */
--ease-standard: cubic-bezier(0.25, 0.46, 0.45, 0.94);

/* Decelerate - coming to rest */
--ease-decelerate: cubic-bezier(0.0, 0.0, 0.2, 1);

/* Accelerate - leaving */
--ease-accelerate: cubic-bezier(0.4, 0.0, 1, 1);

/* Never use linear for UI animations */
```

### Spring Configurations (Framer Motion)
```javascript
// Snappy - buttons, toggles
{ stiffness: 400, damping: 30 }

// Smooth - modals, panels
{ stiffness: 280, damping: 60 }

// Gentle - page transitions
{ stiffness: 120, damping: 14 }
```

### Common Animation Patterns

#### Button Press
```css
transform: scale(0.97);
transition: transform 100ms var(--ease-standard);
```

#### Modal Open
```css
/* Backdrop */
opacity: 0 → 1;
backdrop-filter: blur(0) → blur(16px);
transition: 250ms;

/* Content */
opacity: 0 → 1;
transform: scale(0.95) → scale(1);
transition: spring(280, 60);
```

#### Screen Transition (Swipe)
```css
transform: translateX(100%) → translateX(0);
transition: spring(280, 60);
/* Parallax background at 30% speed */
```

#### Long Press Preview
```css
/* Press feedback */
transform: scale(0.97);

/* Preview appear */
transform: scale(0.8) → scale(1);
opacity: 0 → 1;
transition: spring(400, 25);
```

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Performance Rules
- Only animate `transform` and `opacity` (GPU-accelerated)
- Use `will-change` sparingly, only during active animation
- Maximum 3 concurrent complex animations
- Target 60fps; test on low-end devices
- Cancel animations on route change

### Don'ts
- Linear easing (feels mechanical)
- Bounce/overshoot without purpose
- Animations longer than 500ms for common actions
- Blocking user interaction during animation
- Rapid flashing (accessibility hazard)
