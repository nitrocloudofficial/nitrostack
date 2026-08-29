# NitroStack SDK and Hackathon Alignment

This file maps the implementation to the supplied participant documents and the current official NitroStack documentation.

## Official references used

- https://docs.nitrostack.ai/quick-start
- https://docs.nitrostack.ai/installation
- https://docs.nitrostack.ai/ai-agents/sdk-reference
- https://docs.nitrostack.ai/studio/overview
- https://docs.nitrostack.ai/studio/testing
- https://docs.nitrostack.ai/deployment/cloud
- https://docs.nitrostack.ai/deployment/checklist
- Supplied `NitroStack_Studio_Handbook.pdf`
- Supplied `Hackathons_Do's&Don'ts.pdf`

## SDK structure

| Requirement | Implementation |
|---|---|
| Official TypeScript SDK | `@nitrostack/core` is the MCP server dependency. |
| CLI project structure | `package.json`, `src/index.ts`, `src/app.module.ts`, feature modules and `src/widgets`. |
| Decorator-based server | `@McpApp`, `@Module`, `@Tool`, `@Resource`, `@Prompt`, `@Widget`, `@Injectable` and `@HealthCheck`. |
| Dependency injection | Business logic is in injectable services; tool/resource handlers are thin controllers. |
| Runtime validation | Tool inputs and model outputs use Zod schemas. |
| ESM import rules | Relative server imports use `.js` extensions. |
| Widgets | Next.js/React widget in `src/widgets/app/api-impact-summary`. |
| Production build | `nitrostack-cli build`, followed by fixture copying into `dist/fixtures`. |
| Production start | `node dist/index.js`. |

## MCP surface

- 14 tools
- 6 resources
- 1 prompt
- 6 widget applications
- 2 health checks

The full assessment is exposed through one reliable orchestrator tool while the smaller capabilities remain independently inspectable in NitroStudio.

## NitroStudio workflow

The project is intended to be tested in Studio through:

1. Tools page: execute every tool and inspect generated input forms and JSON output.
2. Resources page: fetch contracts, repository scope, snapshots, assessments and evidence packages.
3. Prompts page: run `review_api_release`.
4. AI Chat: invoke `run_impact_assessment` naturally.
5. Widget preview: verify all six result widgets and follow-up decision calls.
6. Logs: inspect one correlated end-to-end assessment.
7. Health: verify the configured evidence and classifier modes.

## NitroCloud workflow

The repository is structured for a GitHub-connected NitroCloud build:

```bash
npm install
npm run check
npm run build
npm run start:prod
```

The production build copies fixtures to `dist/fixtures`, and production configuration defaults to that directory. Environment variables are documented in `.env.example` and must be entered through NitroCloud secrets rather than committed.

## Hackathon rules addressed

| Supplied guidance | Project response |
|---|---|
| Build with official NitroStack TypeScript SDK | Uses `@nitrostack/core` and NitroStack CLI scripts. |
| Build MVP first | Snapshot-mode orchestrator and one widget are the primary path. |
| Keep code modular | Feature module plus injected services and explicit domain layer. |
| Deploy early and test every milestone | `docs/NITROCLOUD_DEPLOYMENT.md` begins with skeleton and remote smoke testing. |
| Keep default branch stable | README and team plan use scheduled integration and clean-build gates. |
| Test tools/resources/end-to-end | Offline tests plus a mandatory NitroStudio and deployed smoke checklist. |
| README with setup, architecture and usage | Root README contains all three. |
| Never commit credentials | `.gitignore`, `.env.example`, secret scan and no `.env`. |
| Public complete repository and short demo | Final submission checklist includes both. |

## Deliberate MVP limitations

- OpenAPI 3.0 JSON only
- Local references only
- Configured public repository scope
- Snapshot evidence is the reliable judged path
- No production authentication in the public demo
- No CI or branch-protection enforcement
- No claim of complete dependency discovery
- No claim of audit-grade immutable persistence

These constraints are visible in the README and tool output rather than hidden during judging.
