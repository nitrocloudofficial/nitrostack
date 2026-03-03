# Contributing to NitroStack

First off, thank you for considering contributing to NitroStack! Every contribution matters — whether it's a bug report, a feature request, documentation improvements, or code.

This guide will help you get up and running.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Workflow](#workflow)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)
- [License](#license)

## Code of Conduct

This project is governed by the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [oss@nitrostack.ai](mailto:oss@nitrostack.ai).

## How Can I Contribute?

### Good First Issues

New to the codebase? Start with issues labeled [**good first issue**](https://github.com/nitrocloudofficial/nitrostack/labels/good%20first%20issue) — these are scoped, well-documented tasks that don't require deep knowledge of the internals.

### Bug Fixes

Found a bug? Check the [open issues](https://github.com/nitrocloudofficial/nitrostack/issues) first. If it's not already reported, [open a new issue](#reporting-bugs) before submitting a fix so we can triage and discuss.

### Features

Have an idea? Open a [feature request](#requesting-features) or join [GitHub Discussions](https://github.com/nitrocloudofficial/nitrostack/discussions) to propose larger changes. For significant features, we recommend discussing the approach before writing code.

### Documentation

Docs live in the `docs/` directory. Typo fixes, clarifications, new guides — all welcome. No issue required for docs-only changes.

## Development Setup

### Prerequisites

| Requirement | Version |
|:---|:---|
| Node.js | >= 20.18.1 (use [nvm](https://github.com/nvm-sh/nvm) to manage versions) |
| npm | >= 9 |
| tsx | Install globally: `npm i tsx -g` |
| Git | Latest stable |

### Getting Started

```bash
# 1. Fork and clone the repo
git clone https://github.com/<your-username>/nitrostack.git
cd nitrostack

# 2. Enter the TypeScript workspace
cd typescript

# 3. Install dependencies
npm install

# 4. Build all packages
npm run build

# 5. Run the dev server
npm run dev

# 6. Run the test suite
npm test
```

### Useful Commands

| Command | What it does |
|:---|:---|
| `npm run build` | Build all packages |
| `npm run dev` | Start dev server with hot reload |
| `npm test` | Run the full test suite |
| `npm run lint` | Lint the codebase |
| `npm run format` | Auto-format with Prettier |

## Project Structure

```
nitrostack/
├── docs/             # Documentation source
├── .github/          # Issue templates, PR template, CI workflows
├── typescript/       # TypeScript monorepo workspace
│   ├── packages/
│   │   ├── core/     # @nitrostack/core — Framework engine, decorators, DI
│   │   ├── cli/      # @nitrostack/cli — Scaffolding, dev server, generators
│   │   └── widgets/  # @nitrostack/widgets — React SDK for UI widgets
│   └── package.json  # Monorepo workspace root
├── CONTRIBUTING.md   # This file
├── CODE_OF_CONDUCT.md
├── SECURITY.md
├── LICENSE           # Apache 2.0
└── README.md
```

### Working with Individual Packages

This is a monorepo. To work on a specific package:

```bash
# Navigate to the package
cd typescript/packages/core

# Run its tests
npm test

# Build just this package
npm run build
```

Changes in `typescript/packages/core` may affect `typescript/packages/cli` and `typescript/packages/widgets`. Run the full test suite from `typescript/` before submitting.

## Workflow

1. **Fork** the repository and clone your fork
2. **Create a branch** from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. **Make your changes** — write code, add tests, update docs if needed
4. **Add license headers** to any new source files (see [below](#license-headers))
5. **Run checks** before committing:
   ```bash
   cd typescript
   npm run lint && npm test
   ```
6. **Commit** using [conventional commits](#commit-messages)
7. **Push** your branch and open a Pull Request

### Branch Naming

| Prefix | Use for |
|:---|:---|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation changes |
| `refactor/` | Code refactoring |
| `test/` | Test additions or fixes |
| `chore/` | Build, CI, or tooling changes |

## Coding Standards

- **TypeScript** — All code is written in TypeScript with strict mode enabled
- **ESLint** — Run `npm run lint` to check for issues
- **Prettier** — Run `npm run format` to auto-format
- **ESM imports** — Always use `.js` extensions in imports for ESM compatibility:
  ```typescript
  import { UserService } from './user.service.js';
  ```
- **Tests** — All new features and bug fixes should include tests

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

<optional body>
```

### Types

| Type | When to use |
|:---|:---|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no logic change |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or updating tests |
| `chore` | Build, CI, tooling, or dependency changes |
| `perf` | Performance improvement |

### Examples

```
feat(core): add rate limiting decorator
fix(cli): resolve hot reload crash on Windows
docs: update authentication guide with OAuth 2.1 examples
```

## Pull Request Process

1. **Fill out the PR template** — it will be pre-populated when you open a PR
2. **Link related issues** — use `Closes #123` in the PR body
3. **Ensure CI passes** — all checks must be green
4. **Keep PRs focused** — one feature or fix per PR; split large changes into a series
5. **Respond to feedback** — maintainers may request changes; we aim to review within 48 hours

### What We Look For

- Tests for new functionality
- No regressions in existing tests
- Consistent coding style
- Clear commit history (squash messy commits before requesting review)
- Documentation updates if the change affects public API or behavior

## Reporting Bugs

[Open a bug report](https://github.com/nitrocloudofficial/nitrostack/issues/new?template=bug_report.md) and include:

- **NitroStack version** (`npm ls @nitrostack/core`)
- **Node.js version** (`node -v`)
- **Operating system** and version
- **Steps to reproduce** — minimal reproduction is highly appreciated
- **Expected vs. actual behavior**
- **Error messages or logs** (if applicable)

## Requesting Features

[Open a feature request](https://github.com/nitrocloudofficial/nitrostack/issues/new?template=feature_request.md) and include:

- **Problem statement** — what are you trying to solve?
- **Proposed solution** — how should it work?
- **Alternatives considered** — what else did you evaluate?
- **Use case** — a concrete example of how you'd use this

For larger proposals, start a thread in [GitHub Discussions](https://github.com/nitrocloudofficial/nitrostack/discussions).

## License Headers

All new source files must include the Apache 2.0 license header:

```typescript
/**
 * Copyright 2025 Nitrostack Inc
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
```

## License

By submitting a pull request, you agree that your contributions will be licensed under the [Apache License 2.0](./LICENSE).

## Questions?

- **Discord** — [discord.gg/5fMj9FUA](https://discord.gg/5fMj9FUA)
- **GitHub Discussions** — [github.com/nitrocloudofficial/nitrostack/discussions](https://github.com/nitrocloudofficial/nitrostack/discussions)
- **Twitter / X** — [x.com/nitrostackai](https://x.com/nitrostackai)
- **YouTube** — [youtube.com/@nitrostackai](https://www.youtube.com/@nitrostackai)
- **LinkedIn** — [linkedin.com/company/nitrostack-ai](https://linkedin.com/company/nitrostack-ai/)
- **GitHub** — [github.com/nitrostackai](https://github.com/nitrostackai)
- **Email** — [oss@nitrostack.ai](mailto:oss@nitrostack.ai)

---

Thank you for helping make NitroStack better.
