# Invenio — Coding Standards

This document defines the engineering conventions for all code contributed to Project Invenio. All developers must follow these standards. Code reviews will enforce them.

---

## General Principles

1. **Clarity over cleverness** — Write code that can be understood at 2am by a tired developer
2. **Explicit over implicit** — Name things what they are; avoid magic
3. **Single responsibility** — Every module, class, and function has one clear job
4. **Comment the why, not the what** — Code explains what; comments explain why
5. **Every file has a header comment** — Explain the module's purpose and future responsibilities

---

## TypeScript / Frontend

### File Structure

```
ComponentName/
  ComponentName.tsx     — Component implementation
  ComponentName.test.tsx — Unit tests
  index.ts              — Re-export
```

### Naming Conventions

| Type | Convention | Example |
|---|---|---|
| Components | PascalCase | `ResearchCard` |
| Hooks | camelCase with `use` prefix | `useSearchState` |
| Types/Interfaces | PascalCase | `ResearchPaper` |
| Constants | SCREAMING_SNAKE_CASE | `DEFAULT_PAGE_SIZE` |
| File names | Match export name | `ResearchCard.tsx` |
| CSS classes | kebab-case | `research-card` |

### TypeScript Rules

- **Strict mode is mandatory.** `tsconfig.json` has `"strict": true`.
- **No `any`.** Use `unknown` and narrow types explicitly.
- **No non-null assertions (`!`)** except in test files.
- **Prefer `interface` over `type`** for object shapes.
- **All functions must have explicit return types.**

### React Conventions

- **Functional components only.** No class components.
- **Props interface above component.** Define `interface Props` before the function.
- **No prop drilling beyond 2 levels.** Use context or state management.
- **All interactive elements must have unique `id` attributes** for testability.
- **No inline styles.** Use Tailwind classes or CSS variables.

### Component Template

```tsx
/**
 * ComponentName — Short Description
 *
 * Responsibilities:
 * - What this component does
 *
 * Future:
 * - What will be added in future phases
 */

interface ComponentNameProps {
  propA: string
  propB?: number
}

export function ComponentName({ propA, propB = 0 }: ComponentNameProps) {
  return (
    <div id="component-name-root">
      {/* Implementation */}
    </div>
  )
}
```

---

## Python / Backend

### File Structure

```
app/
  routers/     — Thin route handlers only (no business logic)
  services/    — All business logic here
  models/      — SQLAlchemy models only (no logic)
  schemas/     — Pydantic schemas only
  core/        — Infrastructure (DB, cache, config, security)
  utils/       — Pure utility functions
```

### Naming Conventions

| Type | Convention | Example |
|---|---|---|
| Files | snake_case | `research_service.py` |
| Classes | PascalCase | `ResearchService` |
| Functions | snake_case | `search_papers` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_PAGE_SIZE` |
| Type hints | Always required | `def get(id: str) -> Paper:` |

### Python Rules

- **Python 3.11+ required.** Use match statements, `tomllib`, etc.
- **All functions have type hints.** Return types are explicit.
- **All public functions have docstrings.**
- **Use `async/await` everywhere.** No blocking I/O in route handlers.
- **Pydantic for all data validation.** Never validate manually.
- **Dependency injection via FastAPI `Depends()`.** No global state.

### Docstring Convention

```python
def search_papers(
    query: str,
    page: int = 1,
    page_size: int = 20,
) -> PaginatedResponse[Paper]:
    """
    Search scientific papers using semantic similarity.

    Args:
        query: Natural language research query.
        page: Page number (1-indexed).
        page_size: Number of results per page (max 100).

    Returns:
        PaginatedResponse containing matching Paper entities.

    Raises:
        ValidationError: If query is empty or page_size > 100.
        ExternalAPIError: If OpenAlex API is unavailable.
    """
```

---

## Git Conventions

### Branch Naming

```
feature/phase-2-research-router
fix/sidebar-collapse-animation
docs/add-architecture-section
chore/update-dependencies
```

### Commit Messages (Conventional Commits)

```
feat(research): add OpenAlex paper search endpoint
fix(sidebar): correct collapsed width on mobile
docs(arch): add Neo4j schema section
chore(deps): upgrade framer-motion to 12.x
test(research): add unit tests for ResearchService
```

### Pull Request Rules

1. Every PR must reference a phase and task
2. Every PR must have at least one reviewer
3. CI must pass before merge
4. No force pushes to `main`
5. Squash and merge for feature PRs; merge commit for release PRs

---

## Testing Standards

### Frontend (Vitest)

- Every component must have a render test
- Every custom hook must have a behavior test
- Test files co-located with source: `Component.test.tsx`
- Coverage target: 80% (enforced in Phase 2)

### Backend (Pytest)

- Every endpoint must have an integration test using `httpx.AsyncClient`
- Every service method must have a unit test with mocked dependencies
- Coverage target: 80% (enforced in Phase 2)
- Use `pytest-asyncio` for all async tests

---

## Documentation Standards

- **Every new file must have a header comment** explaining its purpose and future responsibilities
- **Every new module/feature must update** the relevant doc in `docs/`
- **Breaking changes must be added** to `docs/CHANGELOG.md`
- **Architecture changes must update** `docs/ARCHITECTURE.md`

---

## Environment & Configuration

- **Never commit `.env` files.** All secrets via environment variables.
- **All env vars documented** in `.env.example` with descriptions.
- **Feature flags** via environment variables, not code comments.
- **No hardcoded URLs, ports, or credentials** in source code.
