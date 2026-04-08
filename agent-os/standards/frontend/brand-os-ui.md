## Brand OS UI Standards

### Core Design Principles
- **Minimal**: Black and white foundation, Studio Sen accents used sparingly (max 10%)
- **OS Metaphors**: Homescreen, apps, files, modals, long-press previews
- **Typography**: Inter font family exclusively
- **Microanimations**: Purposeful motion on all interactions, but UI remains simple

### Typography System
```css
/* Font family */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

/* Font weights */
--font-light: 300;      /* Body text */
--font-regular: 400;    /* Secondary text */
--font-medium: 500;     /* Emphasis */
--font-semibold: 600;   /* Headings */

/* Letter spacing */
--tracking-tight: -0.02em;   /* Large headings */
--tracking-normal: 0;        /* Body */
--tracking-wide: 0.02em;     /* Labels, captions */
```

### Color Palette
```css
/* Foundation */
--color-black: #000000;
--color-white: #FFFFFF;

/* Gray scale (5 grays max) */
--gray-100: #F5F5F5;
--gray-300: #D4D4D4;
--gray-500: #737373;
--gray-700: #404040;
--gray-900: #171717;

/* Studio Sen accents - from brand guidelines */
/* Applied sparingly: buttons, links, highlights */
```

### Navigation Patterns

#### Horizontal Screen Navigation
- Swipe left/right between screens
- Keyboard: Arrow keys, Cmd+Left/Right
- Visual indicator showing current position
- Parallax depth effect on transitions

#### App Grid (Homescreen)
- App icons in consistent grid layout
- Icon style: Rounded square (22.37% border-radius)
- Touch/click targets: minimum 44x44px
- Long-press reveals quick preview modal

#### File Layer System
- Document hierarchy shown through nesting
- File type icons with consistent stroke weight
- Breadcrumb navigation for deep hierarchies
- Drag-drop for organization (v2)

### Modal System
- **Sheet modals**: Slide up from bottom, drag to dismiss
- **Center modals**: Scale + fade animation
- **Full-screen modals**: Horizontal slide transition
- Frosted glass backdrop blur
- Focus trap when open
- Escape key to close

### Touch & Interaction
- **Tap feedback**: Scale to 0.97 + subtle opacity
- **Long press**: 500ms hold → preview activation
- **Swipe**: Natural physics with resistance at edges
- **Hover states**: Desktop only, subtle background change

### Spacing System (4px base)
```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-6: 24px;
--space-8: 32px;
--space-12: 48px;
--space-16: 64px;
```

### Border Radius Scale
```css
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
--radius-2xl: 24px;
--radius-full: 9999px;

/* iOS app icon radius */
--radius-app-icon: 22.37%;
```

### Responsive Breakpoints
- **Mobile**: < 640px (single column, swipe navigation primary)
- **Tablet**: 640-1024px (two column layouts)
- **Desktop**: > 1024px (full layout, hover states enabled)
