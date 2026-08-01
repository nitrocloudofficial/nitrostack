# CONTRIBUTING.md

**Purpose:** Guide collaborators and AI agents on team workflow, code style, and conventions.

## Team Roles

| Team Member | Role | Responsibilities |
|---|---|---|
| Harshavardhan | Frontend Dev | Canvas UI, React Flow, accessibility |
| Vamsi | Backend Dev | NitroStack modules and tool logic |
| M V Sai Kartik | AI Engineer | Prompt design, agent workflows, API integration |
| Joy Sandeep | DevOps/QA | Deployment scripts, CI, testing |

## Workflow

- Use branches: `dev`, `feature/*`, `main`.
- Create a PR for each feature.
- Review code before merging.

## Commit Conventions

Use Conventional Commits:
- `feat: add patient history tool`
- `fix: correct clinical summary output`
- `docs: update architecture guide`

## Code Style

- TypeScript: `async/await`, strict typing, no `any` unless necessary.
- React: use functional components and hooks.
- Keep code modular and reusable.

## Pull Request Checklist

- [ ] Title follows Conventional Commits
- [ ] Lint and tests pass
- [ ] No debug `console.log`
- [ ] Relevant docs updated
- [ ] Comments explain complex logic

## Documentation

Update docs when adding features or changing architecture.
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/TOOLS.md`

## Communication

Coordinate before starting major changes to avoid duplicate work.

This file defines the project process and conventions for future contributors and AI coding assistants.
