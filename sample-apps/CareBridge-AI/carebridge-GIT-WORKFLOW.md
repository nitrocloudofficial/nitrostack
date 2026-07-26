# CareBridge AI - Git Workflow Guide

## 📋 Overview

This guide ensures smooth collaboration during the hackathon using Git branches and pull requests.

---

## 🌳 Branch Strategy

```
main (production-ready)
├── develop (staging)
│   ├── feature/backend-setup
│   ├── feature/mcp-agents
│   ├── feature/frontend
│   └── feature/testing
└── hotfix/* (urgent fixes)
```

---

## 🚀 Getting Started

### Initial Setup (First Person)
```bash
git clone https://github.com/yourusername/CareBridge-AI
cd CareBridge-AI
git checkout -b develop
git push -u origin develop
```

### Team Members
```bash
git clone https://github.com/yourusername/CareBridge-AI
cd CareBridge-AI
git checkout develop
```

---

## 👨‍💻 Workflow for Each Team Member

### Member 1: Backend Developer
```bash
# Create feature branch
git checkout -b feature/backend-setup

# Work on backend files
# - server.js
# - config/
# - routes/

# Commit regularly
git add .
git commit -m "Add profile routes and database connection"

# Push to remote
git push origin feature/backend-setup

# Create Pull Request on GitHub
# → Compare: develop ← feature/backend-setup
```

**Key files:**
- `backend/server.js`
- `backend/config/db.js`
- `backend/config/nitrostack.js`
- All route files

---

### Member 2: MCP Developer
```bash
# Create feature branch
git checkout -b feature/mcp-agents

# Work on NitroStack configuration
# - Create Nitro Studio project
# - Build all agent files
# - Test agents locally

# Create agents directory
mkdir -p nitro-workflows/src/modules
touch nitro-workflows/src/modules/{symptom,ocr,analysis,trends,summary}.tools.ts

# Commit regularly
git add nitro-workflows/
git commit -m "Add MCP symptom guidance agent"
git commit -m "Add MCP OCR extraction agent"
git commit -m "Add MCP report analysis agent"

# Push to remote
git push origin feature/mcp-agents

# Create Pull Request
```

**Key files:**
- `nitro-workflows/src/modules/*.tools.ts`
- `nitro-workflows/src/app.module.ts`
- `nitro-workflows/package.json`

---

### Member 3: Database/Testing
```bash
# Create feature branch
git checkout -b feature/database-testing

# Work on:
# - Database schema design
# - Test scripts
# - Documentation

# Create test files
mkdir tests
touch tests/api.test.js
touch tests/integration.test.js

# Commit
git add tests/
git add docs/
git commit -m "Add API test suite"
git commit -m "Add integration tests"

# Push
git push origin feature/database-testing
```

**Key files:**
- `backend/tests/*.js`
- `docs/SCHEMA.md`
- `.env.template`

---

### Member 4: Integration & Deployment
```bash
# Create feature branch
git checkout -b feature/integration

# Work on:
# - Connecting all components
# - GitHub Actions CI/CD
# - Deployment scripts

# Create deployment configs
mkdir -p .github/workflows
touch .github/workflows/deploy.yml

# Commit
git add .github/
git commit -m "Add CI/CD pipeline"
git commit -m "Add deployment scripts"

# Push
git push origin feature/integration
```

**Key files:**
- `.github/workflows/*.yml`
- `deployment/`
- `docs/DEPLOYMENT.md`

---

## 📝 Commit Messages

### Format
```
<type>: <description>

<optional body>

<optional footer>
```

### Types
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `test:` Test addition
- `refactor:` Code refactoring
- `perf:` Performance improvement

### Examples
```
feat: Add symptom analysis endpoint
fix: Resolve Firebase connection timeout
docs: Update API documentation
test: Add MCP agent integration tests
refactor: Optimize database queries
```

---

## 🔄 Pull Request Process

### Step 1: Create PR
```bash
git push origin feature/your-feature
```

Then on GitHub:
1. Click "Compare & pull request"
2. Base: `develop` ← Compare: `feature/your-feature`
3. Add description:

```
## Description
What does this PR do?

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Documentation
- [ ] Testing

## Testing
How to test this?

## Checklist
- [ ] Code follows project style
- [ ] Tests pass
- [ ] Documentation updated
```

### Step 2: Review & Merge
- Team reviews code
- Approve and merge to `develop`
- Delete feature branch

```bash
# Delete locally
git branch -d feature/your-feature

# Delete remote
git push origin --delete feature/your-feature
```

---

## 🔀 Handling Merge Conflicts

### If conflicts occur
```bash
# Update your branch
git fetch origin
git rebase origin/develop

# Resolve conflicts in editor
# Then:
git add .
git rebase --continue

# Force push (only on feature branches!)
git push origin feature/your-feature --force
```

---

## 📅 Daily Workflow

### Morning
```bash
# Update develop
git checkout develop
git pull origin develop

# Create/update feature branch
git checkout feature/your-feature
git rebase origin/develop
```

### Throughout Day
```bash
# Commit frequently
git add .
git commit -m "Add symptom validation logic"

# Push at least once per day
git push origin feature/your-feature
```

### End of Day
```bash
# Push all changes
git push origin feature/your-feature

# Update others in Slack
# "Pushed symptom analysis features"
```

---

## 🚨 Emergency Fixes

### Hotfix from main
```bash
git checkout main
git pull origin main

# Create hotfix branch
git checkout -b hotfix/critical-bug

# Fix and commit
git add .
git commit -m "hotfix: Fix database connection leak"

# Push and create PR
git push origin hotfix/critical-bug
```

---

## 📊 Daily Commit Target

**Target:** 3-5 commits per developer per day

**Example day:**
```
Hour 1: Setup → git commit -m "Initial setup"
Hour 3: Feature 1 → git commit -m "Add database connection"
Hour 6: Feature 2 → git commit -m "Implement profile routes"
Hour 10: Tests → git commit -m "Add unit tests"
Hour 14: Documentation → git commit -m "Update API docs"
Hour 18: Bug fixes → git commit -m "Fix validation errors"
```

---

## 🎯 Hackathon Git Strategy

### Commit frequency: VERY HIGH (multiple per hour)

This lets everyone see progress in real-time.

### Example timeline:

**Hour 0**
```
commit: Initial project setup
```

**Hour 2**
```
commit: Add Firebase configuration
commit: Create database schema
```

**Hour 4**
```
commit: Implement profile API routes
commit: Add health history routes
```

**Hour 8**
```
commit: Add MCP symptom agent
commit: Implement OCR extraction
```

**Hour 12**
```
commit: Connect backend to MCP
commit: Add integration tests
```

**Hour 16**
```
commit: Fix database queries
commit: Optimize MCP calls
```

**Hour 20**
```
commit: Create React frontend
commit: Connect frontend to backend
```

**Hour 24**
```
commit: Final bug fixes
commit: Polish demo
merge: develop → main
```

---

## 📈 Monitoring Progress

### Daily standup format
```
Yesterday:
- Added symptom routes (2 commits)
- Tested MCP agents (1 commit)

Today:
- Fix database connection
- Complete report analysis agent
- Add integration tests

Blockers:
- Waiting for Firebase credentials
```

---

## 🔒 Best Practices

✅ **DO:**
- Commit frequently (hourly)
- Write clear commit messages
- Test before pushing
- Update teammates on progress
- Pull before pushing
- Use feature branches

❌ **DON'T:**
- Push directly to main/develop
- Commit without testing
- Use vague messages ("update" ❌ vs "Add symptom analysis" ✅)
- Leave uncommitted changes at day end
- Force push to shared branches

---

## 🚀 Final Push (Last 2 hours)

```bash
# Merge all features to develop
git checkout develop
git merge --no-ff feature/backend-setup
git merge --no-ff feature/mcp-agents
git merge --no-ff feature/frontend

# Merge to main for demo
git checkout main
git merge --no-ff develop

# Tag for hackathon
git tag -a v1.0-hackathon -m "CareBridge AI - Hackathon Version"
git push origin main --tags
```

---

## 📚 Resources

- Git Cheat Sheet: https://github.github.com/training-kit/
- GitHub Docs: https://docs.github.com
- Conventional Commits: https://www.conventionalcommits.org

---

## 💡 Tips for Success

1. **Push frequently** - Don't wait until end of day
2. **Communicate via commits** - Messages tell the story
3. **Review each other's code** - Catch issues early
4. **Merge often** - Reduce conflict size
5. **Test after merge** - Catch integration issues
6. **Document as you go** - Don't save for end

---

**Happy hacking! 🎉**
