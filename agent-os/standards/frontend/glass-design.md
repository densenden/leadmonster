## iOS26 Glass Design Standards (Brand OS)

### Frosted Glass Implementation
- **Backdrop Blur**: Use `backdrop-filter: blur(16px)` as default, range 8-24px based on depth
- **Glass Background**: `rgba(255, 255, 255, 0.8)` light mode, `rgba(0, 0, 0, 0.8)` dark mode
- **Vibrancy**: Subtle transparency that hints at underlying content without obscuring
- **Borders**: 1px solid at 10-20% opacity (`rgba(255, 255, 255, 0.1)`)

### Glass Component Variants
```css
/* Light glass - primary surfaces */
.glass-light {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* Dark glass - elevated surfaces */
.glass-dark {
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Minimal glass - subtle depth */
.glass-minimal {
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(8px);
}
```

### Depth & Layering
- Use glass effects to create visual hierarchy through depth
- Avoid drop shadows; prefer blur-based depth cues
- Maximum 3 glass layers to prevent visual noise
- Ensure text remains legible on all glass surfaces (test with various backgrounds)

### Performance Considerations
- `backdrop-filter` is GPU-accelerated but expensive; use sparingly
- Apply `will-change: backdrop-filter` only when animating
- Consider fallback for browsers without support: solid semi-transparent background

### Accessibility
- Maintain WCAG AA contrast (4.5:1) on glass surfaces
- Test with high contrast mode
- Provide solid color fallback for reduced transparency preferences
