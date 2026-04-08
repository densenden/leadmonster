## CSS best practices

- **Tailwind CSS with CSS Variables**: Use Tailwind utility classes as primary styling method; define theme colors and design tokens as CSS variables in globals.css
- **Theme System**: Support light, dark, and "code" themes using CSS custom properties (--background, --foreground, --primary, etc.)
- **Glass Morphism Effects**: Use predefined utility classes (.glass-primary, .glass-secondary, .glass-accent) with backdrop-filter blur for consistent glass effects
- **Color Palette**:
  - Primary: #6B3E52 (mauve) - brand color
  - Secondary: #0F0520 (deep purple) - contrast
  - Accent: #F97316 (orange) - highlights
  - Use rgba() variants for glass effects and borders
- **Typography**:
  - Sans: Inter with font-light weight default
  - Mono: Fira Code, JetBrains Mono, Cascadia Code
  - Apply tracking-wide for readability
- **Animations**: Use smooth cubic-bezier(0.25, 0.46, 0.45, 0.94) transitions (0.8s) for theme changes, color, background, borders
- **Border Radius**: Default to 0.75rem (--radius), use calculated variants (sm: -4px, md: -2px, lg: default, xl: +4px)
- **Minimal Custom CSS**: Leverage Tailwind utilities; only add custom CSS for complex effects (theme transitions, glass morphism)
- **Performance**: Tailwind purges unused styles automatically in production
- **Avoid Overriding Framework**: Use shadcn/ui components as-is; customize via CSS variables in theme, not component overrides
- **Consistent Utility Pattern**: Prefer .glass-primary over inline backdrop-filter; define reusable utilities in @layer utilities
