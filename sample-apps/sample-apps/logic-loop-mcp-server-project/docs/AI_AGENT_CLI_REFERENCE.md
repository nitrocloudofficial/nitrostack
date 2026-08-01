# NitroStack CLI Reference - For AI Code Editors

**Comprehensive CLI reference for AI agents working with NitroStack v3.0**

---

## Installation

```bash
# Global install (recommended for end users)
npm install -g @nitrostack/cli

# Or use npx (no installation)
npx @nitrostack/cli --version
```

---

## Commands Overview

```bash
nitrostack-cli init <project-name>             # Create new project
nitrostack-cli dev [--port <number>]           # Start development mode
nitrostack-cli build                            # Build for production
nitrostack-cli generate <type> <name> [opts]   # Generate code
nitrostack-cli --version                        # Show version
nitrostack-cli --help                           # Show help
```

---

## 1. Initialize Project

```bash
# Basic initialization
nitrostack-cli init my-project

# With specific template
nitrostack-cli init my-project --template typescript-starter
nitrostack-cli init my-oauth-app --template typescript-oauth
nitrostack-cli init my-pizzaz-app --template typescript-pizzaz
```

### Available Templates

1. **`typescript-starter`** (Simple & Educational)
   - Single calculator module
   - No authentication
   - No database
   - Perfect for learning basics
   - Tools, resources, prompts, widgets, health checks

2. **`typescript-oauth`** (OAuth 2.1 + production auth flow)
   - OAuth 2.1 ready setup
   - Auth-focused server template
   - Good for secure MCP integrations

3. **`typescript-pizzaz`** (Widget-heavy rich UI template)
   - Advanced widget patterns
   - Interactive, visual MCP experiences
   - Great for Studio-first UI development

### What `init` Does

1. Copies template files
2. Installs npm dependencies (MCP server)
3. Installs widget dependencies (`src/widgets/`)
4. Creates `.env` from `.env.example`
5. Project is ready to run (`npm run dev` will build on first run)

### After Init

```bash
cd my-project

# Start development
npm run dev
```

---

## 2. Development Mode

```bash
# Start all services
nitrostack-cli dev

# Custom port for Studio
nitrostack-cli dev --port 3002
```

### What It Starts

1. **MCP Server** (stdio mode)
   - Communicates via stdin/stdout
   - Follows MCP protocol spec
   - Hot reload on code changes

2. **Studio** (port 3000, or custom)
   - Visual development interface
   - Test tools manually
   - AI chat (OpenAI/Gemini)
   - Widget preview
   - Resources browser
   - Prompts testing
   - Health checks dashboard
   - OAuth 2.1 config
   - Connection monitoring

3. **Widget Dev Server** (port 3001)
   - Next.js dev server
   - Hot module replacement
   - Serves UI widgets
   - Fast refresh

### Studio Features

| Tab | Purpose |
|-----|---------|
| **Tools** | Execute tools, see widget previews, examples |
| **AI Chat** | Chat with LLM using your tools |
| **Resources** | Browse resources, view UI widgets |
| **Prompts** | Test prompt templates |
| **Health** | Monitor health checks |
| **OAuth 2.1** | Configure OAuth endpoints |
| **Ping** | Test MCP connection |

### URLs

- **Studio UI**: `http://localhost:3000`
- **Widget Dev**: `http://localhost:3001`
- **MCP Server**: stdio (no HTTP)

### Hot Reload

Changes auto-reload:
- TypeScript files (`src/**/*.ts`)
- Widget files (`src/widgets/app/**/*`)
- No manual restart needed

---

## 3. Build Project

```bash
nitrostack-cli build
```

### Build Process

The `nitrostack-cli build` command:

1. **Builds Widgets First** (if present)
   - Input: `src/widgets/`
   - Output: `src/widgets/.next/`
   - Production optimized
   - Static assets bundled

2. **Compiles TypeScript**
   - Input: `src/**/*.ts`
   - Output: `dist/**/*.js`
   - ES modules format
   - Source maps included

3. **Auto-Detects Project Structure**
   - Checks for `src/widgets/package.json`
   - Installs widget dependencies if needed
   - Handles everything automatically

### Output Structure

```
dist/
├── index.js               # Entry point
├── app.module.js
├── modules/
│   ├── auth/
│   ├── products/
│   └── ...
└── ... (all compiled code)

src/widgets/.next/         # Built widgets
```

### Run Production Build

```bash
# After build - use npm script (recommended)
npm start

# Or run directly
node dist/index.js

# Or use CLI
nitrostack-cli start
```

The `nitrostack-cli start` command:
- Runs the compiled `dist/index.js`
- Starts widget production server (if built)
- Sets `NODE_ENV=production`
- Handles all process orchestration

---

## 4. Generate Code

### Generate Module

```bash
nitrostack-cli generate module payments
```

Creates:
```
src/modules/payments/
├── payments.module.ts       # @Module definition
├── payments.tools.ts        # @Tool definitions
├── payments.resources.ts    # @Resource definitions
├── payments.prompts.ts      # @Prompt definitions
└── payments.service.ts      # @Injectable service
```

**Generated module includes:**
- Boilerplate decorator setup
- Example tool with Zod schema
- Example resource
- Example prompt
- Injectable service with DI
- Ready to import in `app.module.ts`

### Generate Tool

```bash
nitrostack-cli generate tool process-payment --module payments
```

- Adds tool to `src/modules/payments/payments.tools.ts`
- Includes:
  - `@Tool` decorator
  - Zod input schema
  - Example request/response
  - `@Widget` placeholder
  - Execution context

### Generate Resource

```bash
nitrostack-cli generate resource payment-schema --module payments
```

- Adds resource to `src/modules/payments/payments.resources.ts`
- Includes URI pattern, mime type, examples

### Generate Prompt

```bash
nitrostack-cli generate prompt payment-help --module payments
```

- Adds prompt to `src/modules/payments/payments.prompts.ts`
- Includes arguments, message template

### Generate Guard

```bash
nitrostack-cli generate guard admin
```

Creates `src/guards/admin.guard.ts`:
```typescript
@Injectable()
export class AdminGuard implements Guard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Your authorization logic
  }
}
```

**Usage:**
```typescript
@Tool({ name: 'admin_tool' })
@UseGuards(AdminGuard)
async adminTool(input: any, ctx: ExecutionContext) {}
```

### Generate Middleware

```bash
nitrostack-cli generate middleware logging
```

Creates `src/middleware/logging.middleware.ts`:
```typescript
@Middleware()
export class LoggingMiddleware implements MiddlewareInterface {
  async use(context: ExecutionContext, next: () => Promise<any>) {
    // Before
    const result = await next();
    // After
    return result;
  }
}
```

### Generate Interceptor

```bash
nitrostack-cli generate interceptor transform
```

Creates `src/interceptors/transform.interceptor.ts`:
```typescript
@Interceptor()
export class TransformInterceptor implements InterceptorInterface {
  async intercept(context: ExecutionContext, next: () => Promise<any>) {
    const result = await next();
    return { success: true, data: result };
  }
}
```

### Generate Pipe

```bash
nitrostack-cli generate pipe validation
```

Creates `src/pipes/validation.pipe.ts`:
```typescript
@Pipe()
export class ValidationPipe implements PipeInterface {
  async transform(value: any, metadata: any): Promise<any> {
    // Transform/validate value
    return value;
  }
}
```

### Generate Types

```bash
# Generate TypeScript types from tool schemas
nitrostack-cli generate types

# Custom output path
nitrostack-cli generate types --output src/widgets/types/generated.ts
```

**What It Does:**
1. Scans all `*.tools.ts` files
2. Extracts Zod schemas from `@Tool` decorators
3. Converts to TypeScript interfaces
4. Outputs to `src/widgets/types/tool-data.ts` (default)

**Example Input (tool):**
```typescript
@Tool({
  name: 'get_product',
  inputSchema: z.object({
    product_id: z.string()
  })
})
async getProduct(input: any) {
  return { id: input.product_id, name: 'Product', price: 99 };
}
```

**Example Output (generated types):**
```typescript
// Auto-generated by NitroStack CLI
export interface GetProductInput {
  product_id: string;
}

export interface GetProductOutput {
  id: string;
  name: string;
  price: number;
}
```

**Usage in Widgets:**
```typescript
import { GetProductOutput } from '../../types/tool-data';

export default function ProductCard({ data }: { data: GetProductOutput }) {
  return <div>{data.name} - ${data.price}</div>;
}
```

**When to Run:**
- After adding new tools
- After modifying tool schemas
- Before building widgets
- As part of CI/CD pipeline

---

## Configuration

### Project Configuration (`nitrostack.config.ts`)

```typescript
export default {
  server: {
    name: 'my-server',
    version: '1.0.0',
    description: 'My MCP server'
  },
  studio: {
    port: 3000,
    enabled: true
  },
  widgets: {
    port: 3001,
    devServer: true
  },
  logging: {
    level: 'info',        // debug | info | warn | error
    file: 'logs/server.log'
  }
};
```

### Environment Variables (`.env`)

```env
# Node Environment
NODE_ENV=development

# JWT (if your selected template enables JWT)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# OAuth 2.1 (if using typescript-oauth template)
OAUTH_CLIENT_ID=your-client-id
OAUTH_CLIENT_SECRET=your-client-secret
OAUTH_REDIRECT_URI=http://localhost:3000/callback

# Server
PORT=3000

# Gemini API (for Studio chat)
GEMINI_API_KEY=your-gemini-key
```

---

## Common Workflows

### 1. Create New Project (Starter Template)

```bash
# Install CLI
npm install -g @nitrostack/cli

# Initialize project
nitrostack-cli init my-calculator --template typescript-starter
cd my-calculator

# Start development
npm run dev

# Open Studio
# http://localhost:3000
```

### 2. Create New Project (OAuth Template)

```bash
# Install CLI
npm install -g @nitrostack/cli

# Initialize project
nitrostack-cli init my-oauth-app --template typescript-oauth
cd my-oauth-app

# Start development
npm run dev

# Open Studio and test OAuth flow
# http://localhost:3000
```

### 3. Add New Feature Module

```bash
# Generate module
nitrostack-cli generate module payments

# Add to app.module.ts imports
# imports: [ConfigModule.forRoot(), PaymentsModule]

# Generate tools
nitrostack-cli generate tool create-payment --module payments
nitrostack-cli generate tool get-payment --module payments

# Generate types for widgets
nitrostack-cli generate types

# Create widget
mkdir -p src/widgets/app/payment-success
# Create page.tsx in that directory

# Test in Studio
npm run dev
```

### 4. Development Cycle

```bash
# Start dev server (auto-detects and builds everything)
npm run dev

# The CLI automatically:
# - Installs dependencies (if needed)
# - Builds widgets (on first run)
# - Starts TypeScript watch mode
# - Starts Studio
# - Starts widget dev server
# - Hot reloads everything

# Edit code (auto-reloads)
# - Edit src/modules/**/*.ts (MCP server hot reloads)
# - Edit src/widgets/app/**/* (Widget dev server hot reloads)

# Test in Studio
# - Execute tools manually
# - Test with AI chat
# - Preview widgets

# Add widget dependencies
npm run widget add <package-name>

# Generate types for widgets
nitrostack-cli generate types

# Build for production
npm run build

# Test production build
npm start
```

### 5. Deploy to Production

```bash
# Build project
nitrostack-cli build

# Copy to server
scp -r dist/ user@server:/app/
scp -r src/widgets/.next/ user@server:/app/widgets/
scp package.json user@server:/app/
scp .env.production user@server:/app/.env

# On server
cd /app
npm install --production
node dist/index.js
```

---

## Troubleshooting

### CLI Not Found

```bash
# Install globally
npm install -g @nitrostack/cli

# Or use npx
npx @nitrostack/cli init my-project
```

### Port Already in Use

```bash
# Use custom port
nitrostack-cli dev --port 3002

# Or kill process on port
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

### Build Errors

```bash
# Clean and rebuild
rm -rf dist
rm -rf src/widgets/.next
npm run build

# Check TypeScript errors
npx tsc --noEmit
```

### Module Not Found: nitrostack

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Widgets Not Loading

```bash
# The CLI handles widgets automatically, but if you need to debug:

# Install widget dependencies
npm run widget install

# Check widget dev server
curl http://localhost:3001

# Or restart dev mode (rebuilds everything)
npm run dev
```

### Studio Not Connecting

```bash
# Check MCP server is running
ps aux | grep node

# Check logs
tail -f logs/server.log

# Restart
npm run dev
```

---

## Quick Reference Card

### Commands

| Command | Description |
|---------|-------------|
| `nitrostack-cli init <name>` | Create new project |
| `nitrostack-cli init <name> --template <type>` | Create with specific template |
| `nitrostack-cli dev` | Start dev mode (server + Studio + widgets) |
| `nitrostack-cli dev --port <n>` | Start with custom Studio port |
| `nitrostack-cli build` | Build for production |
| `nitrostack-cli generate module <name>` | Generate module |
| `nitrostack-cli generate tool <name> --module <m>` | Generate tool |
| `nitrostack-cli generate resource <name> --module <m>` | Generate resource |
| `nitrostack-cli generate prompt <name> --module <m>` | Generate prompt |
| `nitrostack-cli generate guard <name>` | Generate guard |
| `nitrostack-cli generate middleware <name>` | Generate middleware |
| `nitrostack-cli generate interceptor <name>` | Generate interceptor |
| `nitrostack-cli generate pipe <name>` | Generate pipe |
| `nitrostack-cli generate types` | Generate TypeScript types |
| `nitrostack-cli --version` | Show version |
| `nitrostack-cli --help` | Show help |

### Project Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development (MCP server + Studio + widgets, auto-build) |
| `npm run build` | Build MCP server + widgets for production |
| `npm start` | Run production server |
| `npm run widget <cmd>` | Run npm command in widgets directory |
| `npm run setup-db` | Initialize data (only if provided by template) |
| `npm run reset-db` | Reset template data (if script exists) |

**Note:** Old scripts like `widgets:dev`, `widgets:build`, `widgets:install`, `server:dev`, `dev:build` are no longer needed. The CLI handles everything automatically!

### Studio URLs

| URL | Purpose |
|-----|---------|
| `http://localhost:3000` | Studio UI |
| `http://localhost:3000/chat` | AI Chat |
| `http://localhost:3001` | Widget dev server |

---

## Key Concepts for AI Agents

### 1. Templates
- **typescript-starter**: Learn basics, no auth, no DB
- **typescript-oauth**: OAuth 2.1-enabled secure template
- **typescript-pizzaz**: UI-rich interactive template

### 2. Development Flow
- `init` → `dev` → test in Studio → `build`

### 3. Code Generation
- Generate module first
- Then generate tools/resources/prompts
- Always run `generate types` after schema changes

### 4. Studio is Your Friend
- Test tools before writing widgets
- Use chat to verify AI integration
- Check health, resources, prompts

### 5. Widget Development
- Widgets live in `src/widgets/app/`
- Link with `@Widget('widget-name')`
- Generate types for type safety
- Hot reload enabled

---

**That's the complete NitroStack CLI reference!**

Use `nitrostack-cli --help` for more details or check `/docs` for SDK documentation.
