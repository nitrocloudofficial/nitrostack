# RakshaNet Integration Checklist

This checklist must be completed before merging any Pull Request into the `development` branch.

---

# General

- [ ] Project builds successfully (`npm run dev`)
- [ ] No TypeScript errors
- [ ] No unrelated files modified
- [ ] No merge conflicts
- [ ] Code follows project architecture

---

# Services

- [ ] Uses Dependency Injection
- [ ] No business logic inside MCP tools
- [ ] No duplicated services
- [ ] Single responsibility maintained

---

# DTOs

- [ ] Uses existing DTOs
- [ ] Does not redefine interfaces
- [ ] Imports from `dto/`

---

# Types

- [ ] Uses shared enums
- [ ] No duplicated enums
- [ ] Imports from `types/`

---

# Code Quality

- [ ] Proper naming
- [ ] Small reusable methods
- [ ] No unnecessary comments
- [ ] No dead code

---

# Testing

- [ ] `npm run dev` succeeds
- [ ] NitroStudio loads
- [ ] Existing MCP tools still work

---

# Pull Request Decision

## Approve

- Architecture followed
- No duplicated code
- Build passes

## Request Changes

- Architecture violated
- Duplicate DTOs
- Duplicate Types
- Build failure
- Unrelated modifications