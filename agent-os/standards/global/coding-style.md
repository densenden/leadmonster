## Coding style best practices

### General Principles
- **Meaningful Names**: Choose descriptive names that reveal intent; avoid abbreviations except common ones (e.g., `id`, `url`, `api`)
- **Small, Focused Functions**: Keep functions small and focused on a single task for better readability and testability
- **Remove Dead Code**: Delete unused code, commented-out blocks, and imports rather than leaving them as clutter
- **Backward Compatibility**: Only handle backward compatibility when specifically instructed
- **DRY Principle**: Avoid duplication by extracting common logic into reusable functions or modules

### TypeScript/JavaScript
- **Naming Conventions**:
  - PascalCase: Components, types, interfaces, classes (`UserProfile`, `ApiResponse`)
  - camelCase: Variables, functions, props (`isLoading`, `fetchUserData`)
  - UPPER_SNAKE_CASE: Constants (`API_BASE_URL`, `MAX_RETRIES`)
  - kebab-case: File names (`user-profile.tsx`, `api-utils.ts`)
- **File Organization**: Group by feature/route, not by type (`app/dashboard/` not `components/`, `hooks/`, `utils/`)
- **Imports**: Absolute imports with path aliases (`@/components/ui/button` not `../../../components/ui/button`)
- **TypeScript**: Use strict mode; prefer `interface` for object shapes, `type` for unions/intersections; avoid `any`
- **Formatting**: Prettier with 2-space indentation, single quotes, no semicolons (unless needed), trailing commas
- **Async/Await**: Prefer over `.then()` chains for readability
- **Error Handling**: Use try/catch for async operations; provide user-friendly error messages

### Python
- **Naming Conventions**:
  - PascalCase: Classes (`UserProfile`, `ApiClient`)
  - snake_case: Functions, variables, modules (`fetch_user_data`, `is_loading`)
  - UPPER_SNAKE_CASE: Constants (`API_BASE_URL`, `MAX_RETRIES`)
- **Frameworks**:
  - Django: Follow Django conventions (class-based views, ORM patterns, signals)
  - FastAPI: Use Pydantic models for validation; async def for async operations
  - Flask: Blueprint organization for small projects
- **Type Hints**: Always use type hints for function signatures; run mypy for validation
- **Formatting**: Ruff for linting/formatting (replaces Black, isort, flake8); 4-space indentation
- **Docstrings**: Use for public functions/classes; follow Google or NumPy style
- **Error Handling**: Raise specific exceptions; use FastAPI HTTPException for API errors

### Automated Tooling
- **Linting**: ESLint (TypeScript), Ruff (Python)
- **Formatting**: Prettier (TypeScript), Ruff (Python)
- **Pre-commit Hooks**: Auto-format on commit; run type checks
- **Editor Config**: VSCode settings for consistent indentation, formatting on save
