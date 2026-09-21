# 🚀 ZeroOps — Closing the Gap Between 'It Works Locally' and 'It's in Production

**A NitroStack MCP server that turns "push this" and "deploy this" into one conversation.**

Connect it to any MCP-compatible AI agent (Claude, ChatGPT, Gemini, and others) and give it the ability to read your repos, commit code, open PRs, wire up CI, and ship to Vercel, Netlify, Cloudflare Pages, or Render — without you ever leaving the chat.

---

## ✨ What it does

### 🔎 Repository intelligence
- GitHub PAT and OAuth (device-code + browser redirect) authentication with account verification
- Create, list, and look up repositories
- Read trees, files, and directories; search code across a repo
- **`repo_onboarding_summary`** — one call to detect the tech stack, surface the important files, and suggest safe next steps in a new repo

### 🌿 Git workflow
- Create and delete branches
- List commit history
- Commit single or multiple files, update branch refs
- Create, list, and merge pull requests
- **`apply_code_patch`** — the tool behind "push/save/commit this code for me"
- **`create_feature_branch_and_pr`** — branch → commit → PR in one workflow

### 📦 Deploy readiness
- Repository analyzer detects framework, language, and package manager automatically
- **`prepare_deploy_plan`** — checks deploy readiness, generates build/start commands and a Dockerfile
- **`setup_ci_deployment_gate`** — generates stack-aware GitHub Actions CI that gates deployment on passing tests

### ☁️ One-click deployment
| Provider | Tool | Integration |
|---|---|---|
| Vercel | `deploy_to_vercel` | Git integration |
| Netlify | `deploy_to_netlify` | Git integration |
| Cloudflare Pages | `deploy_to_cloudflare_pages` | Git integration |
| Render | `render_list_services`, `render_trigger_deploy`, `render_get_deploy_status` | Service integration |

### 🧭 Guided prompts
- **`safe_deployment_pipeline`** — a strict, best-practice sequence: check repo structure → ensure containerization → set up test-gated CI → trigger deploy

### 🖼️ Interactive widgets
Rich UI rendered straight into the agent conversation:
- **Calculator Result** — shows the operation, operands, and result of a calculation
- **Deployment Status** — live status, logs, and links for a running deployment

---

## 🧱 Tech Stack

Built on [`@nitrostack/core`](https://www.npmjs.com/package/@nitrostack) and `@nitrostack/cli`, with TypeScript, Zod schema validation, and `@modelcontextprotocol/ext-apps` for the widget layer.

---

## ⚙️ Setup

No credentials are required just to start the server. Add the following depending on which features you want to enable.

### Deployment tokens
Can be set as environment variables, or passed dynamically in the tool payload itself:

```bash
VERCEL_TOKEN=...              # Vercel Personal Access Token
NETLIFY_TOKEN=...             # Netlify Personal Access Token
CLOUDFLARE_API_TOKEN=...      # Cloudflare API Token
RENDER_API_KEY=rnd_...        # Required for Render integration
```

### GitHub browser login
Required only if you want the interactive browser OAuth flow:

```bash
GITHUB_OAUTH_CLIENT_ID=your_github_oauth_app_client_id
GITHUB_OAUTH_CLIENT_SECRET=your_github_oauth_app_client_secret

# Required unless NITROSTACK_PUBLIC_URL is provided by the platform
RESOURCE_URI=https://your-app.nitrocloud.app
```

Your GitHub OAuth App's callback URL must be:

```text
https://your-app.nitrocloud.app/auth/github/callback
```

Override it explicitly with `GITHUB_OAUTH_REDIRECT_URI` if needed.

### Non-interactive fallback

```bash
GITHUB_TOKEN=your_github_personal_access_token
```

> The dynamic user token created by `authenticate_github` is session-based — never hardcode it as an environment variable.

### Optional OAuth 2.1 metadata overrides

```bash
AUTH_SERVER_URL=https://github.com
OAUTH_REQUIRED=false
HOST=0.0.0.0
```

Only set `OAUTH_REQUIRED=true` after configuring `JWKS_URI` or the introspection variables.

---

## 🔐 Authenticating with GitHub

**Browser login**
1. Call `authenticate_github` with `{ "action": "browser_start" }`
2. Open `authorization_url` and approve access
3. Call `authenticate_github` with `{ "action": "browser_poll", "state": "..." }` until `status` is `authenticated`

**Device-code login**
1. Call `authenticate_github` with `{ "action": "start" }`
2. Open `verification_uri` and enter `user_code`
3. Call `authenticate_github` with `{ "action": "poll", "device_code": "..." }` until `status` is `authenticated`

---

## ▶️ Run

```bash
npm run dev
```

## 🏗️ Build

```bash
npm run build
```

## 🚢 Production start

```bash
npm run start
```

---

## 📄 License

Add your license here.
