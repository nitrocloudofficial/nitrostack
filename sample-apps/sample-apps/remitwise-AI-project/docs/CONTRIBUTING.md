# Contributing Guidelines – RemitWise AI

Thank you for contributing to **RemitWise AI**! This project is submitted for the **NitroStack × Amrita University Hackathon**.

Please review these guidelines to ensure code quality, repository cleanliness, and compliance with official hackathon rules.

---

## 👥 Core Team Members & GitHub Identifiers

- **A-GOWSHIK**: [@A-GOWSHIK](https://github.com/A-GOWSHIK)
- **vijay45057**: [@vijay45057](https://github.com/vijay45057)
- **Kavin-2806**: [@Kavin-2806](https://github.com/Kavin-2806)

---

## 🚨 Security & Git Best Practices (Hackathon Rules)

> [!CAUTION]
> **Strict Security Rules**:
> 1. **NEVER** upload `.env` files, API keys, passwords, credentials, or secret access tokens to GitHub.
> 2. **NEVER** commit `node_modules`, `venv`, `.pytest_cache`, or `__pycache__` directories.
> 3. Verify `.gitignore` rules before pushing any commit.

### Commit Guidelines
- Use clear, descriptive, and meaningful commit messages (e.g. `feat: add provider comparison calculation`, `fix: handle missing exchange rates gracefully`).
- Push changes frequently to maintain a stable, deployable `main` branch.

---

## 🛠️ Development & Testing Workflow

### 1. Backend Setup & Verification
```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/macOS
source venv/bin/activate

pip install -r requirements.txt
python -m pytest tests/ -v
```

### 2. Frontend Setup & Verification
```bash
cd frontend
npm install
npm run lint
npm run build
```

---

## 🧪 Code Quality Standards

- **Modular Architecture**: Keep services, routes, and agents modular and decoupled.
- **Type Annotations**: Use Python type hints (`pydantic`, `typing`) and TypeScript interfaces for all components.
- **Resilience**: Ensure functions handle null/offline states gracefully without raising unhandled exceptions or crashing the UI.
