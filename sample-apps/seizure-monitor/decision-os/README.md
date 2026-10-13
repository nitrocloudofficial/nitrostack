# DecisionOS

DecisionOS is an MCP application that evaluates a decision through context extraction, research, market, finance, risk, and recommendation engines. It includes a dashboard widget for the complete decision report.

## Run locally

```bash
npm install
npm run dev
```

To build and run the production server locally:

```bash
npm run build
npm run start:prod
```

## Configuration and security

Copy `.env.example` to `.env`. For NitroCloud, set `AI_BASE_URL`, `AI_MODEL`, and `AI_API_KEY` for the OpenAI-compatible provider (for example, Groq). Do not commit `.env`.

Every DecisionOS tool requires an authenticated MCP client. Clients must include the raw client key in MCP request metadata as `apiKey`; the server compares its SHA-256 hash with `DECISION_OS_API_KEY_1` (or additional sequentially numbered keys).

Generate a client key and the hash to save in your environment:

```bash
node --input-type=module -e "import { ApiKeyModule } from '@nitrostack/core'; const key = ApiKeyModule.generateKey('dos'); console.log('client key:', key); console.log('DECISION_OS_API_KEY_1:', ApiKeyModule.hashKey(key));"
```

Keep the `client key` private and give it only to authorized MCP clients. Save only the `DECISION_OS_API_KEY_1` hash as a local/NitroCloud secret.

## NitroCloud deployment

1. Push this repository to GitHub and create a project in [NitroCloud](https://cloud.nitrostack.ai/auth/login).
2. Configure the build command as `npm run build`.
3. Configure the start command as `npm run start:prod`.
4. Add these secrets in NitroCloud:

   ```env
   NODE_ENV=production
   AI_BASE_URL=https://api.groq.com/openai/v1
   AI_MODEL=qwen/qwen3.6-27b
   AI_API_KEY=...
   DECISION_OS_API_KEY_1=<SHA-256 hash of the raw client key>
   ```

5. Deploy, then make an authenticated tool call from your MCP client.

## Validation

```bash
npm run typecheck
npm run build
```
