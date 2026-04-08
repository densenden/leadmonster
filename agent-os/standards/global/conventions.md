## General development conventions

### Project Organization
- **Consistent Project Structure**:
  - Next.js: App router structure (`app/[route]/page.tsx`, `app/api/`, route-specific components in `_components/`)
  - Backend: Feature-based modules (Django apps, FastAPI routers)
- **File Naming**: kebab-case for files/folders (`user-profile.tsx`, `api-client.ts`)
- **Path Aliases**: Use `@/` for imports (`@/components/ui/button`, `@/lib/utils`)

### Version Control
- **Commit Messages**: Short, imperative, list all changes; no Claude Code signature
  - Good: "add user authentication, update profile page styling, fix navigation bug"
  - Avoid: "feat: add user authentication 🤖 Generated with Claude Code"
- **Branching**: Feature branches from `main`; use descriptive names (`feature/user-auth`, `fix/navigation-bug`)
- **Pull Requests**: Clear title and description; link related issues; request reviews before merging

### Configuration & Security
- **Environment Variables**: Use `.env.local` (Next.js), `.env` (backend); never commit secrets
- **Environment Files**:
  - `.env.example`: Template with placeholder values
  - `.env.local`: Local development (gitignored)
  - `.env.production`: Production secrets (not in repo)
- **Secrets Management**: Vercel env vars (frontend), Railway/Render secrets (backend)

### Dependencies
- **Dependency Management**: Keep dependencies minimal and up-to-date; use npm for Node, pip/poetry for Python
- **Documentation**: Document major dependencies and why they're used (in README or separate DEPENDENCIES.md)
- **Security**: Run `npm audit` / `pip-audit` regularly; update vulnerable packages promptly

### Code Quality
- **Code Review**: All code requires review before merging; focus on logic, readability, security
- **Testing Requirements**:
  - Frontend: Unit tests for utilities, e2e tests for critical flows (Vitest + Playwright)
  - Backend: Unit tests for business logic, integration tests for APIs (pytest)
- **Linting/Formatting**: Auto-format on save (Prettier, Ruff); fix linting errors before committing
- **Type Safety**: No `any` types without justification; run `tsc --noEmit` and `mypy` in CI

### Documentation
- **README**: Setup instructions, tech stack, environment variables, development commands
- **Code Comments**: Explain "why" not "what"; use JSDoc/docstrings for public APIs
- **Changelog**: Not required; git commit history serves as changelog
- **Feature Flags**: Use for incomplete features; implement via environment variables or feature flag service
