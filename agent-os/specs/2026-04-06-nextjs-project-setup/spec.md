# Specification: Next.js Project Setup with Design Tokens

## Goal
Replace the existing Vite boilerplate with a Next.js 14+ App Router project configured with TypeScript strict mode, Tailwind CSS extended with all design tokens from `design-tokens/tokens.json`, and the full directory scaffold defined in `CLAUDE.md`.

## User Stories
- As a developer, I want a clean Next.js App Router project so that all future features can be built on the correct SEO-capable foundation.
- As a developer, I want design tokens wired into Tailwind so that every component uses the brand palette and typography without hard-coding values.

## Specific Requirements

**Remove Vite Boilerplate**
- Delete `src/`, `index.html`, `eslint.config.js`, and `vite.config.js` entirely before scaffolding Next.js
- Remove Vite-related devDependencies (`vite`, `@vitejs/plugin-react`, `eslint-plugin-react-refresh`) from `package.json`
- The `node_modules/` folder must be re-installed after replacing `package.json`

**Initialize Next.js 14+ with App Router**
- Use `create-next-app` output conventions: App Router enabled, TypeScript strict mode, `src/` directory disabled (root-level `app/`)
- Set `"strict": true` in `tsconfig.json`; no `any` types without explicit justification
- Configure path alias `@/` pointing to project root so all internal imports use absolute paths
- `next.config.ts` must enable `images.remotePatterns` for `images.unsplash.com`

**Install and Configure Tailwind CSS**
- Install Tailwind CSS v3 with PostCSS and Autoprefixer as devDependencies
- Import Tailwind directives in `app/globals.css` (`@tailwind base`, `@tailwind components`, `@tailwind utilities`)
- Configure `content` array in `tailwind.config.ts` to cover `app/**`, `components/**`, and `lib/**`

**Map Design Tokens into `tailwind.config.ts`**
- Extend `theme.colors` using the exact hex values from `design-tokens/tokens.json` under a `brand` namespace, matching the structure already defined in `design-tokens/tailwind-config-snippet.js`
- Navy + Gold product-theme values from `sterbegeld24plus-recreation/styles.css` (navy `#1a365d`, navy-light `#2c5282`, gold `#d4af37`, gold-hover `#b8860b`) must be added as a `product` color group alongside `brand`
- Extend `theme.fontFamily` with `heading: ['Roboto', 'sans-serif']` and `body: ['"Nunito Sans"', 'sans-serif']` as defined in tokens
- Extend `theme.fontSize` with the named scale (`h1-desktop`, `h2-desktop`, `h3`, `h4`, `h5`, `body`) from `tailwind-config-snippet.js`
- Extend `theme.spacing` with `ft-base`, `ft-grid`, `ft-block` tokens; extend `theme.boxShadow` with `ft-default`
- `theme.borderRadius` default must be `0px` matching the token (sharp corners, no rounding on brand components)

**Root Layout (`app/layout.tsx`)**
- Load `Inter`, `Roboto`, and `Nunito Sans` via `next/font/google`; expose each as a CSS variable (`--font-inter`, `--font-roboto`, `--font-nunito`) applied to `<html>`; Tailwind font families reference these variables
- Set global SEO defaults using Next.js `Metadata` export: `title` template `%s | LeadMonster`, `description`, `robots` (index, follow), `openGraph` with site name and locale `de_DE`
- Apply `font-body bg-white text-brand-neutral-base` classes to `<body>` using Tailwind token classes
- Import `app/globals.css`

**Homepage (`app/page.tsx`)**
- Server Component rendering a placeholder product overview page
- Display the logo from `public/logo.png` using `next/image` with explicit `width` and `height` props
- Include a heading "LeadMonster — Ihre Versicherungsprodukte" and a short placeholder paragraph in German
- Static `Metadata` export with title "Produktübersicht" and a descriptive German meta description

**`public/` Folder Setup**
- Copy `assets/logo.png` to `public/logo.png` so it is served by Next.js
- Create `public/llms.txt` as an empty placeholder file (content to be filled in the SEO spec)
- Do not create `public/robots.txt` — it will be handled by `app/robots.ts` in the SEO spec

**ESLint + TypeScript Configuration**
- Use the Next.js default ESLint config (`eslint-config-next`) extended with `"plugin:@typescript-eslint/recommended"`
- Configure Prettier with: 2-space indentation, single quotes, no semicolons, trailing commas (`"all"`)
- `tsconfig.json`: `target` ES2017+, `moduleResolution` bundler, `paths` alias `@/*` to `./*`, `strict` true, `noEmit` true for type-check runs

**Environment Variable Structure**
- Create `.env.example` committed to the repo with all variable keys and empty values, matching the full list in `CLAUDE.md`: `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `CONFLUENCE_BASE_URL`, `CONFLUENCE_EMAIL`, `CONFLUENCE_API_TOKEN`, `CONFLUENCE_SPACE_KEY`, `CONFLUENCE_PARENT_PAGE_ID`, `UNSPLASH_ACCESS_KEY`
- `.env.local` is gitignored and populated locally by the developer

**Directory Scaffold**
- Create the full empty directory structure defined in `CLAUDE.md`: `app/[produkt]/`, `app/admin/`, `app/api/`, `components/ui/`, `components/sections/`, `components/admin/`, `lib/supabase/`, `lib/anthropic/`, `lib/confluence/`, `lib/resend/`, `lib/seo/`
- Each empty directory should contain a `.gitkeep` file where no implementation files are created in this spec
- `next.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `tsconfig.json`, `.eslintrc.json`, `.prettierrc` must all be present at project root

## Visual Design
No visual mockups provided for this spec.

## Existing Code to Leverage

**`design-tokens/tailwind-config-snippet.js`**
- Contains the exact `theme.extend` structure for colors, fontFamily, fontSize, spacing, borderRadius, and boxShadow that must be merged verbatim into the new `tailwind.config.ts`
- Use this as the authoritative source; do not re-derive values from `tokens.json` independently

**`design-tokens/tokens.json`**
- Source of truth for all color hex values, typography families and weights, spacing values, and shadow definition
- Reference for confirming all `brand.*` token values are correctly mapped in Tailwind

**`sterbegeld24plus-recreation/styles.css`**
- Contains the Navy + Gold CSS variable definitions (`--primary: #1a365d`, `--primary-light: #2c5282`, `--accent: #d4af37`, `--accent-hover: #b8860b`) to be added as `product.*` Tailwind color tokens
- Confirms `border-radius: 12px` for product card components; add as a `product-card` radius token alongside the global `0px` brand default

**`assets/logo.png`**
- Existing logo asset; copy to `public/logo.png` without modification and reference via `next/image`

## Out of Scope
- Supabase client setup or any database integration
- Supabase Auth or admin route protection
- Any API routes under `app/api/`
- Claude AI content generation pipeline
- Lead form components or lead capture logic
- Confluence or Resend integration
- Any public product pages under `app/[produkt]/`
- Admin UI pages or components
- `sitemap.ts`, `robots.ts`, or schema.org markup generation
- Wissensfundus or content management features
- Vitest or Playwright test configuration
