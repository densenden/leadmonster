# Task Breakdown: Next.js Project Setup with Design Tokens

## Overview
Total Tasks: 6 task groups, 30 sub-tasks

## Task List

---

### Task Group 1: Remove Vite Boilerplate
**Dependencies:** None

- [x] 1.0 Complete Vite removal
  - [x] 1.1 Delete Vite source files
    - Delete `src/` directory entirely
    - Delete `index.html` from project root
    - Delete `eslint.config.js` from project root
    - Delete `vite.config.js` from project root
  - [x] 1.2 Strip Vite devDependencies from `package.json`
    - Remove `vite`, `@vitejs/plugin-react`, `eslint-plugin-react-refresh` from `devDependencies`
    - Remove `@eslint/js`, `eslint-plugin-react-hooks`, `globals` (Vite-era ESLint deps)
    - Remove Vite scripts (`dev: vite`, `build: vite build`, `preview: vite preview`) from `scripts`
    - Keep `react` and `react-dom` dependencies — Next.js will continue to use them
  - [x] 1.3 Verify working directory is clean
    - Confirm no Vite-related files remain at project root or in any subdirectory
    - Do not run `npm install` yet — this happens in Task Group 2

**Acceptance Criteria:**
- `src/`, `index.html`, `eslint.config.js`, `vite.config.js` are deleted
- `package.json` contains no references to `vite`, `@vitejs/plugin-react`, or `eslint-plugin-react-refresh`

---

### Task Group 2: Initialize Next.js 14+ App Router Project
**Dependencies:** Task Group 1

- [x] 2.0 Complete Next.js initialization
  - [x] 2.1 Write `package.json` with Next.js dependencies
    - Set `name: "leadmonster"`, remove `"type": "module"` (Next.js uses CommonJS config files)
    - Add `next@14`, `react@18`, `react-dom@18` as production dependencies
    - Add `@types/node`, `@types/react`, `@types/react-dom`, `typescript` as devDependencies
    - Add scripts: `dev: next dev`, `build: next build`, `start: next start`, `lint: next lint`, `type-check: tsc --noEmit`
  - [x] 2.2 Create `tsconfig.json`
    - Set `"target": "ES2017"`, `"lib": ["dom", "dom.iterable", "esnext"]`
    - Set `"moduleResolution": "bundler"`, `"module": "esnext"`
    - Set `"strict": true`, `"noEmit": true`
    - Add `"paths": { "@/*": ["./*"] }` for absolute imports from project root
    - Include `"jsx": "preserve"`, `"incremental": true`, `"plugins": [{ "name": "next" }]`
    - Set `"include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"]`
    - Set `"exclude": ["node_modules"]`
  - [x] 2.3 Create `next.config.mjs`
    - Enable `images.remotePatterns` for `images.unsplash.com` (hostname: `images.unsplash.com`, protocol: `https`)
    - Note: Next.js 14 does not support `next.config.ts`; using `next.config.mjs` instead
  - [x] 2.4 Run `npm install` to install all dependencies
    - Run from project root after `package.json` is fully written
    - Verify `node_modules/` is created and `package-lock.json` is updated

**Acceptance Criteria:**
- `package.json` contains Next.js 14, React 18, TypeScript, and correct scripts
- `tsconfig.json` has strict mode enabled and `@/*` path alias
- `next.config.mjs` is present with Unsplash remote pattern
- `npm install` completes without errors

---

### Task Group 3: Tailwind CSS Installation and Design Token Mapping
**Dependencies:** Task Group 2

- [x] 3.0 Complete Tailwind CSS setup with design tokens
  - [x] 3.1 Install Tailwind CSS and PostCSS
    - Install `tailwindcss@3`, `postcss`, `autoprefixer` as devDependencies via `npm install`
  - [x] 3.2 Create `postcss.config.js`
    - Export `{ plugins: { tailwindcss: {}, autoprefixer: {} } }` using CommonJS module syntax
  - [x] 3.3 Create `tailwind.config.ts`
    - Set `content` array to: `['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}']`
    - Merge `theme.extend.colors.brand` verbatim from `design-tokens/tailwind-config-snippet.js`:
      - `brand.blue.DEFAULT: '#abd5f4'`, `brand.blue.light: '#e1f0fb'`
      - `brand.orange.DEFAULT: '#ff9651'`, `brand.orange.dark: '#e07d3b'`
      - `brand.link.DEFAULT: '#36afeb'`, `brand.link.hover: '#1e85c8'`
      - `brand.neutral.base: '#666666'`, `brand.neutral.heading: '#333333'`, `brand.neutral.muted: '#999999'`, `brand.neutral.emphasis: '#000000'`
    - Add `theme.extend.colors.product` group from `sterbegeld24plus-recreation/styles.css`:
      - `product.navy.DEFAULT: '#1a365d'`, `product.navy.light: '#2c5282'`
      - `product.gold.DEFAULT: '#d4af37'`, `product.gold.hover: '#b8860b'`
    - Extend `theme.fontFamily` with `heading: ['var(--font-roboto)', 'sans-serif']` and `body: ['var(--font-nunito)', 'sans-serif']`
    - Extend `theme.fontSize` with named scale from snippet: `h1-desktop`, `h1-mobile`, `h2-desktop`, `h3`, `h4`, `h5`, `body` (with lineHeight and fontWeight tuples)
    - Extend `theme.spacing` with `ft-base: '20px'`, `ft-grid: '30px'`, `ft-block: '40px'`
    - Extend `theme.boxShadow` with `ft-default: '0 2px 8px rgba(0,0,0,.08)'`
    - Set `theme.borderRadius` default to `none: '0px'` (sharp brand corners)
    - Add `product-card: '12px'` to `theme.borderRadius` (from `sterbegeld24plus-recreation/styles.css`)
    - Set `plugins: []`
  - [x] 3.4 Create `app/globals.css`
    - Add `@tailwind base;`, `@tailwind components;`, `@tailwind utilities;` directives at the top
    - No other global styles at this stage; CSS variables will be added from font setup in Task Group 4
  - [x] 3.5 Verify Tailwind configuration is valid
    - Run `npx tailwindcss --dry-run` or check for config parse errors via `npm run build` dry run
    - Confirm all token keys are correctly nested (brand vs product namespaces)

**Acceptance Criteria:**
- `tailwind.config.ts` includes all `brand.*` and `product.*` color tokens, font families, font sizes, spacing, shadow, and border radius values
- `postcss.config.js` is present
- `app/globals.css` has Tailwind directives
- No Tailwind config parse errors

---

### Task Group 4: Root Layout, Fonts, and Homepage
**Dependencies:** Task Group 3

- [x] 4.0 Complete root layout and homepage
  - [x] 4.1 Copy `assets/logo.png` to `public/logo.png`
    - Copy the file without modification; do not rename or compress
    - Create `public/llms.txt` as an empty placeholder file (a single blank line is sufficient)
    - Do NOT create `public/robots.txt` — this is handled by `app/robots.ts` in a later spec
  - [x] 4.2 Create `app/layout.tsx`
    - Load `Inter`, `Roboto`, and `Nunito_Sans` via `next/font/google`
    - Expose each font as a CSS variable: `--font-inter`, `--font-roboto`, `--font-nunito`
    - Apply all three CSS variables to the `<html>` element's `className`
    - Update `tailwind.config.ts` `fontFamily` values to reference CSS variables:
      - `heading: ['var(--font-roboto)', 'sans-serif']`
      - `body: ['var(--font-nunito)', 'sans-serif']`
    - Export `const metadata: Metadata` with:
      - `title: { template: '%s | LeadMonster', default: 'LeadMonster' }`
      - `description`: a concise German description of the system
      - `robots: { index: true, follow: true }`
      - `openGraph: { siteName: 'LeadMonster', locale: 'de_DE', type: 'website' }`
    - Apply `className="font-body bg-white text-brand-neutral-base"` to `<body>`
    - Import `'./globals.css'` at the top of the file
    - Accept `{ children: React.ReactNode }` as props; this is a Server Component (no `'use client'`)
  - [x] 4.3 Create `app/page.tsx`
    - Server Component — no `'use client'` directive
    - Export `const metadata: Metadata` with:
      - `title: 'Produktubersicht'`
      - `description`: a descriptive German meta description about the product overview
    - Render a placeholder page structure:
      - Display `<Image>` from `next/image` pointing to `/logo.png` with explicit `width` and `height` props (inspect actual pixel dimensions of `assets/logo.png` to set correct values)
      - Render `<h1>LeadMonster — Ihre Versicherungsprodukte</h1>` using `font-heading` Tailwind class
      - Render a short placeholder paragraph in German explaining the system purpose
    - Use `@/` absolute import for `next/image` and `next/navigation` if needed (follow `@/*` alias convention)

**Acceptance Criteria:**
- `public/logo.png` exists, `public/llms.txt` exists as an empty file
- `app/layout.tsx` exports correct `Metadata`, loads all three fonts as CSS variables, applies correct `<body>` classes
- `app/page.tsx` renders logo, German heading, and placeholder paragraph as a Server Component
- `npm run dev` starts without errors and the homepage loads in the browser

---

### Task Group 5: ESLint, Prettier, and Environment Configuration
**Dependencies:** Task Group 2

- [x] 5.0 Complete tooling and environment setup
  - [x] 5.1 Install ESLint and Prettier packages
    - Install `eslint-config-next` (bundled with Next.js install — verify it is present)
    - Install `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser` as devDependencies
    - Install `prettier` as a devDependency
    - Add `lint:fix` script to `package.json`: `"eslint . --fix"`
    - Add `format` script to `package.json`: `"prettier --write ."`
  - [x] 5.2 Create `.eslintrc.json`
    - Extend: `["next/core-web-vitals", "plugin:@typescript-eslint/recommended"]`
    - Set `parser: "@typescript-eslint/parser"`
    - Add `plugins: ["@typescript-eslint"]`
    - Configure rule `"@typescript-eslint/no-explicit-any": "error"` to enforce no `any` types
  - [x] 5.3 Create `.prettierrc`
    - Set `"tabWidth": 2`, `"useTabs": false`
    - Set `"singleQuote": true`
    - Set `"semi": false`
    - Set `"trailingComma": "all"`
    - Set `"printWidth": 100`
  - [x] 5.4 Create `.env.example`
    - Committed to the repo with all keys and empty values in the order defined in `CLAUDE.md`:
      ```
      ANTHROPIC_API_KEY=
      NEXT_PUBLIC_SUPABASE_URL=
      NEXT_PUBLIC_SUPABASE_ANON_KEY=
      SUPABASE_SERVICE_ROLE_KEY=
      RESEND_API_KEY=
      CONFLUENCE_BASE_URL=
      CONFLUENCE_EMAIL=
      CONFLUENCE_API_TOKEN=
      CONFLUENCE_SPACE_KEY=
      CONFLUENCE_PARENT_PAGE_ID=
      UNSPLASH_ACCESS_KEY=
      ```
    - Note: `NEXT_PUBLIC_SUPABASE_URL` has a known value in `CLAUDE.md` but must be left empty in `.env.example`
  - [x] 5.5 Verify `.gitignore` covers `.env.local`
    - Check that `.gitignore` (already present) includes `.env.local` and `node_modules/`
    - If missing, add the necessary entries
  - [x] 5.6 Run `npm run lint` and `npm run type-check`
    - Fix any ESLint errors introduced by the new config
    - Fix any TypeScript errors in `app/layout.tsx` or `app/page.tsx`
    - All checks must pass with zero errors before this task group is complete

**Acceptance Criteria:**
- `.eslintrc.json` extends `next/core-web-vitals` and `@typescript-eslint/recommended`
- `.prettierrc` enforces 2-space indent, single quotes, no semicolons, trailing commas
- `.env.example` is present with all 11 keys and empty values
- `npm run lint` and `npm run type-check` both exit with zero errors

---

### Task Group 6: Directory Scaffold
**Dependencies:** Task Group 4

- [x] 6.0 Complete full directory scaffold
  - [x] 6.1 Create App Router subdirectories with `.gitkeep`
    - `app/[produkt]/` — dynamic product route placeholder
    - `app/admin/` — admin area placeholder
    - `app/api/` — API routes placeholder
    - Place a `.gitkeep` in each directory (no implementation files)
  - [x] 6.2 Create component subdirectories with `.gitkeep`
    - `components/ui/` — atomic UI components
    - `components/sections/` — reusable page sections
    - `components/admin/` — admin-specific components
    - Place a `.gitkeep` in each directory
  - [x] 6.3 Create lib subdirectories with `.gitkeep`
    - `lib/supabase/`
    - `lib/anthropic/`
    - `lib/confluence/`
    - `lib/resend/`
    - `lib/seo/`
    - Place a `.gitkeep` in each directory
  - [x] 6.4 Verify all required config files exist at project root
    - Confirm presence of: `next.config.mjs`, `tailwind.config.ts`, `postcss.config.js`, `tsconfig.json`, `.eslintrc.json`, `.prettierrc`
    - Confirm presence of: `app/globals.css`, `app/layout.tsx`, `app/page.tsx`
    - Confirm presence of: `public/logo.png`, `public/llms.txt`, `.env.example`
    - Confirm absence of: `src/`, `index.html`, `eslint.config.js`, `vite.config.js`
  - [x] 6.5 Final build verification
    - Run `npm run build` to confirm the project compiles to a static Next.js build without errors
    - A successful build with zero errors is the definition of done for this spec

**Acceptance Criteria:**
- All 8 subdirectories exist with `.gitkeep` files
- All 6 required config files exist at project root
- `npm run build` completes with zero errors
- Project directory contains no Vite artifacts

---

## Execution Order

Recommended implementation sequence:

1. **Task Group 1** — Remove Vite Boilerplate (no dependencies)
2. **Task Group 2** — Initialize Next.js + TypeScript (depends on: Group 1)
3. **Task Group 3** — Tailwind CSS + Design Tokens (depends on: Group 2)
4. **Task Group 5** — ESLint + Prettier + `.env.example` (depends on: Group 2; can run in parallel with Group 3)
5. **Task Group 4** — Root Layout + Fonts + Homepage (depends on: Group 3)
6. **Task Group 6** — Directory Scaffold + Final Verification (depends on: Group 4)

Groups 3 and 5 can be executed in parallel once Group 2 is complete.
