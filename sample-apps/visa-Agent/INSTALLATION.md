# Visa Agent MCP Server

Visa Agent is a TypeScript-based Model Context Protocol (MCP) server built with NitroStack. It provides a complete visa-assistance demonstration: it collects onboarding details, creates and manages visa cases, resolves document requirements, processes uploaded documents, and recommends housing brokers through a NitroChat-ready interface. The project is designed to run locally with NitroStudio and deploy to NitroCloud.

> **For judges:** follow [Quick start](#quick-start) to run the project locally, then use the [Demo workflow](#demo-workflow) to exercise the end-to-end experience.

---

## Features

| Area | Implemented capability |
| --- | --- |
| Visa onboarding | Extracts origin, destination, visa type, and other intake details from a user message. |
| Visa case creation | Creates and retrieves structured visa cases. |
| Requirement resolution | Produces a visa-document checklist and timeline for a started case. |
| Document upload | Accepts documents for a case through MCP tools. |
| OCR | Extracts supported document details into a normalized result. |
| Document validation | Validates uploaded document information against expected requirements. |
| Housing preferences | Collects a student's destination, budget, and housing preferences. |
| Broker recommendation | Returns available brokers, including a deterministic demo-mode best-broker flow. |
| MCP server | Exposes the application as MCP tools over NitroStack transports. |
| NitroChat widget | Supplies an embedded chat/widget experience for MCP-capable clients. |

## Tech Stack

| Category | Technology |
| --- | --- |
| Language | TypeScript |
| Framework | NitroStack |
| Database | MongoDB |
| Authentication | OAuth 2.1 / OpenID Connect (Auth0-compatible) |
| Deployment | NitroCloud |
| AI | No LLM is required for the current deterministic demo flows. |
| MCP Framework | Model Context Protocol with `@nitrostack/core` |

## Repository Structure

```text
visa-Agent/
├── src/
│   ├── index.ts                 # Application entry point
│   ├── app.module.ts            # NitroStack and OAuth configuration
│   ├── modules/                 # MCP tools and domain workflows
│   ├── services/                # MongoDB and supporting services
│   └── widgets/                 # NitroChat/MCP widget source
├── .env.example                 # Environment-variable template
├── OAUTH_SETUP.md               # Auth0/OAuth setup guide
├── package.json                 # Scripts and server dependencies
└── INSTALLATION.md              # This guide
```

## Prerequisites

| Requirement | Recommended version / use |
| --- | --- |
| Node.js | **20.x LTS** recommended. |
| npm | **9+** (bundled with recent Node.js releases). |
| Git | Any current version. |
| MongoDB | Required for housing preferences and broker recommendation data. MongoDB Atlas or a local MongoDB instance both work. |
| NitroStudio | Optional, but recommended for interactive local testing of MCP tools, widgets, and chat. |
| OAuth provider | Optional for local development; required only when testing the OAuth-protected deployment. |
| Gemini API key | **Not required** for the current deterministic demo implementation. |

## Clone Repository

Replace the placeholder URL with the repository URL supplied to you.

```bash
git clone https://github.com/<organization>/<repository>.git
cd visa-Agent
```

## Install Dependencies

Install the server dependencies from the repository root:

```bash
npm install
```

Install the widget dependencies as well:

```bash
npm --prefix src/widgets install
```

`npm install` reads `package.json` and installs the TypeScript, NitroStack, MCP, MongoDB, and build dependencies needed by the server. The widget has its own package workspace, so it needs the second install command.

If you prefer the project-provided installer, run:

```bash
npm run install:all
```

## Environment Variables

Create a local environment file before starting the server.

```bash
cp .env.example .env
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
```

Configure only the values relevant to the flow you are testing. Never commit `.env` files or real credentials.

| Variable | Required | Description |
| --- | --- | --- |
| `NITRO_LOG_LEVEL` | No | Log verbosity, for example `info` or `debug`. |
| `NITROSTACK_APP_MODE` | No | NitroStack application mode; the project template uses `openai`. |
| `PORT` | No | Local HTTP port. Use a free port such as `<port>`. |
| `HOST` | No | Bind host, such as `localhost` for local development. |
| `MCP_TRANSPORT_TYPE` | No | MCP transport mode. Use the repository default locally; use `dual` when both supported HTTP transports are needed. |
| `RESOURCE_URI` | Required for OAuth | Public resource URI registered with the authorization server, such as `https://<your-domain>`. |
| `AUTH_SERVER_URL` | Required for OAuth | Authorization-server base URL, such as `https://<your-auth-domain>`. |
| `OAUTH_REQUIRED` | No | Set to `true` to require OAuth tokens; leave `false` or unset for an unauthenticated local demo. |
| `JWKS_URI` | Conditional | JSON Web Key Set endpoint used to validate JWT access tokens. |
| `TOKEN_AUDIENCE` | Conditional | Expected OAuth access-token audience. |
| `TOKEN_ISSUER` | Conditional | Expected OAuth token issuer. |
| `MONGODB_URI` | Yes for housing tools | MongoDB connection string, such as `mongodb+srv://<username>:<password>@<cluster>/<database>`. |
| `DB_NAME` | Yes for housing tools | MongoDB database name, for example `<database-name>`. |
| `ENABLE_CORS` | No | Set to `true` when a browser client needs cross-origin access. |
| `GEMINI_API_KEY` | No | Unused by the current deterministic demo; do not set it unless a future LLM feature explicitly requires it. |

### Minimal local configuration

For the core visa flow and a local MongoDB-backed housing demo, use placeholders like these in `.env`:

```dotenv
NITRO_LOG_LEVEL=info
OAUTH_REQUIRED=false
RESOURCE_URI=http://localhost:<port>
AUTH_SERVER_URL=http://localhost:<auth-port>/auth
MONGODB_URI=mongodb://<username>:<password>@<host>:<port>/<database>
DB_NAME=<database-name>
```

For an OAuth-enabled environment, follow [OAUTH_SETUP.md](OAUTH_SETUP.md) and set `OAUTH_REQUIRED=true` along with the issuer, audience, and key-discovery values supplied by the provider.

## Running Locally

### Quick start

```bash
npm install
npm --prefix src/widgets install
npm run build
npm start
```

`npm start` performs a production-style local start: it builds the project and then starts NitroStack. Use this path when validating the same build behavior used for deployment.

### NitroStack CLI equivalent

The npm scripts invoke the local NitroStack CLI. The equivalent commands are:

```bash
nitrostack-cli build
nitrostack-cli start
```

If the CLI is not installed globally, invoke the project-local binary instead:

```bash
npx nitrostack-cli build
npx nitrostack-cli start
```

### Development mode

For iterative local development, run:

```bash
npm run dev
```

Keep the terminal running while you connect with NitroStudio or another MCP client. The server startup log reports the active transport URLs.

## Running in NitroStudio

NitroStudio is the easiest way to inspect tools, invoke them manually, and test the widget/chat experience during development.

1. Start the server with `npm run dev`.
2. Open NitroStudio and select **Import Project** or open the cloned project folder.
3. Confirm the environment variables are available to the project, especially MongoDB settings when testing housing tools.
4. Run the project and wait for the MCP server to report that it is listening.
5. Open the **Tools** view and invoke an onboarding tool with:

   ```text
   I am from India. Going to Canada. Need student visa.
   ```

6. Verify that `onboarding_extract` returns either missing information or a started case, then invoke `resolve_requirements` for the returned case ID.
7. Open the widget preview to test the NitroChat widget. Test its onboarding prompt, document interactions, and the final response after requirements are resolved.
8. Open the AI chat view, choose the connected MCP server, and repeat the [Demo workflow](#demo-workflow).

> Widget rendering requires an MCP-capable host such as NitroStudio or NitroChat; it is not intended to be opened as a standalone static page.

## Deploying to NitroCloud

1. Push the repository to GitHub.
2. In NitroCloud, connect the GitHub repository and select the branch to deploy.
3. Add the production environment variables in NitroCloud. At minimum, configure the MongoDB values for housing tools and the OAuth values when OAuth protection is enabled.
4. Deploy the project.
5. Open the generated **NitroChat URL** to test the chat/widget experience.
6. Open the generated **MCP documentation URL** to review tool schemas and copy client connection settings.

NitroCloud builds the project automatically through the NitroStack build pipeline. The deployment pipeline compiles the TypeScript project, bundles widgets, creates a production Docker image, and starts the application with `nitrostack-cli start`.

## Connecting the MCP Server

After deployment, use the generated MCP documentation page as the source of truth for your deployment. It provides ready-to-copy connection JSON and lists every available MCP tool.

| Client | Connection approach |
| --- | --- |
| Cursor | Open **Settings → MCP**, add a server, and paste the generated connection JSON from the MCP documentation page. |
| Claude Desktop | Open the MCP developer configuration, add a server entry, and paste the generated connection JSON. |
| Codex | Add an MCP server in the Codex configuration and paste the generated connection JSON. |
| Raw SSE | Connect an SSE client to `https://<your-nitrocloud-domain>/sse`; include OAuth authorization when the deployment requires it. |

For Streamable HTTP clients, the standard deployment endpoint is typically:

```text
https://<your-nitrocloud-domain>/mcp
```

For OAuth-protected deployments, use the access token and authorization flow advertised by the generated documentation. Do not place tokens in source-controlled configuration files.

## Available MCP Tools

| Tool | Purpose |
| --- | --- |
| `case_start` | Creates a new visa case from supplied applicant and travel information. |
| `case_get` | Retrieves the current status and stored details for a visa case. |
| `onboarding_extract` | Extracts onboarding information from a natural-language message and starts a case when sufficient information is available. |
| `resolve_requirements` | Resolves the applicable visa checklist and timeline for a case. |
| `document_upload` | Uploads a document and associates it with a case. |
| `document_ocr` | Extracts supported structured details from an uploaded document. |
| `document_validate` | Validates an uploaded document against the case requirements. |
| `collect_housing_preferences` | Stores housing preferences for a student or applicant. |
| `recommend_brokers` | Returns matching broker candidates for saved housing preferences. |
| `recommend_best_brokers` | Selects a destination-matched broker when possible, otherwise any broker, for the deterministic hackathon demo. |

## Demo Workflow

Use this walkthrough in NitroStudio, NitroChat, or any connected MCP client.

1. **User onboarding** — Submit a message such as: `I am from India. Going to Canada. Need student visa.`
2. **Onboarding extraction** — Call `onboarding_extract` with the message.
3. **Missing-information branch** — If the tool reports missing information, ask the user for those details and stop. Submit a new message only after the user replies.
4. **Case creation** — If onboarding reports `case_started`, record the returned case ID.
5. **Resolve requirements** — Call `resolve_requirements` once for that case ID.
6. **Final visa reply** — Present the case ID, current status, checklist, and timeline. The onboarding workflow ends here; do not call another visa tool for the same message.
7. **Upload passport** — Use `document_upload` to add a passport or other checklist document.
8. **OCR and validation** — Run `document_ocr`, then `document_validate`, to inspect and validate the upload.
9. **Housing preferences** — Call `collect_housing_preferences` with destination and housing preferences.
10. **Broker recommendation** — Call `recommend_brokers` or `recommend_best_brokers`. The latter uses demo-mode random selection after destination filtering and returns a confidence of `1.0`.

```text
User
  ↓
Onboarding
  ↓
Case Created
  ↓
Resolve Requirements
  ↓
Upload Passport
  ↓
OCR
  ↓
Validate
  ↓
Housing Preferences
  ↓
Broker Recommendation
```

## Troubleshooting

| Issue | Resolution |
| --- | --- |
| Missing environment variables | Copy `.env.example` to `.env`, then set the values needed by the feature being tested. Restart the server after changes. |
| MongoDB connection fails | Verify `MONGODB_URI`, `DB_NAME`, network access rules, database credentials, and that the target instance is running. Housing and broker tools require MongoDB data. |
| Gemini API key error | The current demo does not require Gemini. Remove any stale Gemini configuration from the local environment unless you have added an LLM-dependent feature. |
| Port is already in use | Set `PORT` to an unused value, stop the process holding the port, then restart NitroStack. |
| Build errors | Reinstall root and widget dependencies, then run `npm run build` again. Check that the supported Node.js version is active. |
| OAuth authorization fails | Confirm `OAUTH_REQUIRED`, `RESOURCE_URI`, authorization-server URL, issuer, audience, and JWKS settings match the provider registration. See [OAUTH_SETUP.md](OAUTH_SETUP.md). |
| NitroStudio cannot connect | Start the server first, verify the local endpoint in the startup logs, and make sure the selected transport matches the running server. |
| Widget does not render | Test it inside NitroStudio, NitroChat, or another MCP host that supports MCP Apps/widgets. |

## Screenshots

Add final project screenshots here before a presentation or submission.

### Architecture

_Screenshot placeholder: system architecture and MCP/NitroStack flow._

### NitroStudio

_Screenshot placeholder: local tool invocation in NitroStudio._

### NitroCloud

_Screenshot placeholder: deployed NitroCloud application overview._

### MCP Documentation

_Screenshot placeholder: generated MCP tool documentation and connection JSON._

### NitroChat

_Screenshot placeholder: deployed NitroChat onboarding and widget experience._

## Future Improvements

- Add country-specific visa rules sourced from maintained official-data providers.
- Support configurable document-checklist templates by destination and visa category.
- Add human-review queues and case assignment for immigration advisors.
- Provide document-expiry reminders and application milestone notifications.
- Add robust document-type classification and OCR confidence scoring.
- Support secure file storage with retention and deletion policies.
- Add a judge-friendly seeded MongoDB dataset for repeatable housing demonstrations.
- Add localization for applicant-facing prompts and document labels.
- Add audit trails for case changes, tool calls, and document validation decisions.
- Add end-to-end MCP, OAuth, and widget integration tests to CI.

## Team

| Name | Role | Contact |
| --- | --- | --- |
| `<team-member-name>` | `<role>` | `<contact>` |
| `<team-member-name>` | `<role>` | `<contact>` |
| `<team-member-name>` | `<role>` | `<contact>` |

## License

MIT.
