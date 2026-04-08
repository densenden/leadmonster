## Tech stack

Define your technical stack below. This serves as a reference for all team members and helps maintain consistency across the project.

### Framework & Runtime
- **Application Framework:** Next.js 14+ (frontend), Express.js (Node backend), Django/FastAPI (Python backend, Flask for small projects)
- **Language/Runtime:** TypeScript, Node.js 20+, Python 3.11+
- **Package Manager:** npm (preferred), pnpm (large monorepos)

### Frontend
- **JavaScript Framework:** React 18+
- **CSS Framework:** Tailwind CSS with CSS variables for theming
- **UI Components:** shadcn/ui (New York style), custom components following Vibe Coding principles
- **State Management:** React Context, Zustand (complex state), TanStack Query (server state)
- **Typography:** Inter (sans-serif), Fira Code/JetBrains Mono (monospace)

### Database & Storage
- **Database:** PostgreSQL (primary), Supabase (BaaS)
- **ORM/Query Builder:** Prisma (Node.js), SQLAlchemy (Python)
- **Caching:** Redis (when needed)

### Testing & Quality
- **Test Framework:** Vitest (frontend), Playwright (e2e), pytest (Python)
- **Linting/Formatting:** ESLint, Prettier, Ruff (Python)
- **Type Checking:** TypeScript strict mode, mypy (Python)

### Deployment & Infrastructure
- **Hosting:** Vercel (frontend/fullstack), Railway/Render (backend services)
- **CI/CD:** GitHub Actions
- **Analytics:** Google Analytics, Vercel Analytics

### Third-Party Services
- **Authentication:** Supabase Auth, NextAuth.js
- **Email:** SendGrid, Resend
- **Payments:** Stripe (via Medusa for e-commerce)
- **E-commerce:** Medusa.js (headless commerce platform)
- **Monitoring:** Vercel monitoring, Sentry (when needed)

### Design System
- **Theme Support:** Light, dark, and "code" themes
- **Color Palette:**
  - Primary: #6B3E52 (mauve)
  - Secondary: #0F0520 (deep purple)
  - Accent: #F97316 (orange)
  - Glass morphism with backdrop blur effects
- **Border Radius:** 0.75rem default
- **Animations:** Smooth cubic-bezier transitions (0.8s), theme blur effects
- **Philosophy:** "Vibe Coding" - emotional design with robust technical implementation
