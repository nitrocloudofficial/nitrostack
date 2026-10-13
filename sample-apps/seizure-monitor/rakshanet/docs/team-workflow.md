# RakshaNet Team Workflow

## Branch Strategy

main
- Stable releases only.

development
- Active development branch.
- Only the Project Lead merges into this branch.

feature/*
- Every team member develops in their own feature branch.

Examples

feature/threat-service

feature/location-service

feature/communication-service

feature/dashboard

---

# Starting Work

Always begin with

```bash
git checkout development
git pull origin development
git checkout -b feature/<feature-name>
```

Example

```bash
git checkout -b feature/location-service
```

---

# During Development

Commit frequently.

Example

```bash
git add .
git commit -m "Implement route deviation detection"
```

---

# Finishing Work

Push your feature branch.

```bash
git push origin feature/<feature-name>
```

Open a Pull Request

feature/<feature-name>

↓

development

---

# Pull Requests

Do NOT merge your own Pull Request.

Wait for the Project Lead to review it.

---

# Project Lead Responsibilities

Review Pull Requests.

Check

- Project builds.
- Shared DTOs used.
- Shared Types used.
- Architecture followed.

Merge only after approval.

---

# Team Rules

Never push directly to development.

Never modify unrelated files.

Keep services independent.

Run

npm run dev

before every push.

Keep commits focused on one feature.