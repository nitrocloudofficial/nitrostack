# NitroStudio Standalone Setup

## Overview

NitroStudio is now a **standalone application** that connects to any NitroStack project. This decoupled architecture provides several benefits:

- **Independent updates** - Update Studio without updating SDK
- **Multiple projects** - Connect to different projects easily
- **Desktop app ready** - Can be packaged as Electron app
- **Self-hostable** - Deploy Studio as a web service

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      NitroStudio (Standalone)                    │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │    Chat     │  │   Tools     │  │   Logs      │              │
│  │  Interface  │  │   Panel     │  │   Viewer    │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                           │                                      │
│                    ┌──────┴──────┐                              │
│                    │ MCP Client  │                              │
│                    └──────┬──────┘                              │
└───────────────────────────┼──────────────────────────────────────┘
                            │ stdio
                            │
┌───────────────────────────┼──────────────────────────────────────┐
│            NitroStack Project (Your Code)                        │
│                           │                                      │
│  ┌────────────────────────▼────────────────────────┐            │
│  │              MCP Server (stdio)                  │            │
│  │   - Tools, Resources, Prompts                   │            │
│  │   - Middleware, Guards, Interceptors            │            │
│  └─────────────────────────────────────────────────┘            │
│                                                                  │
│  ┌─────────────────────────────────────────────────┐            │
│  │              Widget Server (HTTP)                │            │
│  │   - Next.js on port 3001                        │            │
│  │   - React widgets                               │            │
│  └─────────────────────────────────────────────────┘            │
└──────────────────────────────────────────────────────────────────┘
```

## Getting NitroStudio

### Option 1: Web Application

Run Studio as a local web app:

```bash
# Clone the studio repository
git clone https://github.com/nitrostack/nitrostudio.git
cd nitrostudio

# Install dependencies
npm install

# Start Studio
npm run dev
```

Studio opens at `http://localhost:3000`

### Option 2: Desktop Application

Download the desktop app (coming soon):

- **macOS**: `NitroStudio-mac.dmg`
- **Windows**: `NitroStudio-win.exe`
- **Linux**: `NitroStudio-linux.AppImage`

### Option 3: Self-Hosted

Deploy Studio to your infrastructure:

```bash
# Build for production
npm run build

# Start production server
npm start
```

Or use Docker:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Connecting to a Project

### Step 1: Start Your NitroStack Project

In your NitroStack project directory:

```bash
npm run dev
```

This starts:
- MCP Server (stdio transport)
- Widget Server on port 3001

**Note**: Studio is no longer started automatically.

### Step 2: Open NitroStudio

Launch NitroStudio (web or desktop).

### Step 3: Select Project

1. Click **"Select Project"** or use the folder browser
2. Navigate to your NitroStack project directory
3. Click **Connect**

Studio will:
- Detect the NitroStack project
- Start the MCP server subprocess
- Connect to the widget server
- Load tools, resources, and prompts

### Project Detection

NitroStudio identifies valid projects by checking for:

```
my-project/
├── package.json          # Must have "@nitrostack/core" dependency
├── src/
│   ├── index.ts          # Entry point
│   └── widgets/          # Optional widget directory
│       └── package.json  # Widget dependencies
```

## Configuration

### Environment Variables

Create `.env` in your NitroStack project:

```bash
# MCP Server port (for HTTP transport)
MCP_SERVER_PORT=3002

# Widget server port
WIDGET_PORT=3001

# Transport type
MCP_TRANSPORT_TYPE=stdio
```

### Studio Settings

In Studio, configure:

- **AI Provider**: OpenAI or Gemini
- **API Key**: Your API key for chat
- **Theme**: Dark or Light mode

## Using Studio

### Chat Interface

Test tools naturally:

```
You: Search for flights from London to Tokyo

AI: [Calls search_flights tool]
    [Renders flight-results widget]
    Here are the available flights...
```

### Tools Panel

- View all registered tools
- See input schemas
- Execute tools manually
- View responses and widgets

### Resources Panel

- Browse available resources
- Execute resource handlers
- Preview data

### Logs Panel

- Real-time logs from MCP server
- Filter by level (info, warn, error)
- Search log entries

## Workflow

### Development Cycle

1. **Start Project**
   ```bash
   cd my-project
   npm run dev
   ```

2. **Connect Studio**
   - Open NitroStudio
   - Select project folder
   - Click Connect

3. **Develop & Test**
   - Edit code in your IDE
   - Server auto-reloads
   - Test in Studio chat
   - View widget previews

4. **Iterate**
   - Make changes
   - See instant updates
   - Test again

### Multiple Projects

To switch projects:

1. Click **Disconnect** in sidebar
2. Select new project folder
3. Click **Connect**

## Troubleshooting

### Studio Not Connecting

**Symptoms**: "Disconnected" status after selecting project

**Solutions**:

1. Ensure `npm run dev` is running in your project
2. Check that `package.json` has `@nitrostack/core` dependency
3. Verify `src/index.ts` exists
4. Check console for error messages

### Widgets Not Loading

**Symptoms**: 500 error or blank widget area

**Solutions**:

1. Ensure widget server is running on port 3001:
   ```bash
   curl http://localhost:3001
   ```

2. Check widget directory exists:
   ```bash
   ls src/widgets/
   ```

3. Verify widget `package.json` has dependencies:
   ```json
   {
     "dependencies": {
       "@nitrostack/widgets": "^1"
     }
   }
   ```

### MCP Server Not Starting

**Symptoms**: No tools/resources loading

**Solutions**:

1. Check project compiles:
   ```bash
   npx tsc --noEmit
   ```

2. Verify entry point:
   ```typescript
   // src/index.ts should export server
   import { createServer } from '@nitrostack/core';
   ```

3. Check for runtime errors:
   ```bash
   npx tsx src/index.ts
   ```

### Logs Not Showing

**Symptoms**: Logs panel is empty

**Solutions**:

1. Ensure project is connected
2. Trigger a tool call to generate logs
3. Check log level in project `.env`:
   ```bash
   LOG_LEVEL=debug
   ```

## Security

### API Keys

- API keys are stored in browser `localStorage`
- Never sent to NitroStack servers
- Only used for direct API calls to OpenAI/Gemini

### Project Access

- Studio only accesses the selected project directory
- MCP server runs in subprocess with limited permissions
- Widget server is sandboxed in iframe

### Network

- MCP communication uses stdio (local only)
- Widget server on localhost only (not exposed)
- No external network access required

## Desktop App Features

The desktop app includes additional features:

- **System tray integration**
- **Global keyboard shortcuts**
- **Project auto-detection**
- **Recent projects list**
- **Native notifications**

## Self-Hosting

### Requirements

- Node.js 18+
- 1GB RAM minimum
- 100MB disk space

### Docker Compose

```yaml
version: '3.8'
services:
  nitrostudio:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
```

### Reverse Proxy (nginx)

```nginx
server {
    listen 80;
    server_name studio.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Next Steps

- [Chat Interface](./03-chat-interface.md)
- [Testing Tools](./02-testing-tools.md)
- [Dev Command](../cli/04-dev-command.md)

