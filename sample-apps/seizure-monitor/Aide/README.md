# Aide – Enterprise MCP Server

Aide is a **Model Context Protocol (MCP)** server built with [NitroStack](https://nitrostack.ai). It serves as an intelligent backend router and tool provider for AI agents (like Claude Desktop or Cursor), exposing enterprise capabilities such as task delegation, calendar scheduling, admin policy checking, and communication routing.

## Features

- **Dynamic Task Delegation:** Computes the best assignee for tasks based on workload and skills, automatically assigning them and updating Postgres.
- **Smart Scheduling:** Resolves employee calendars, finds mutual free time, books meetings (Google Calendar or mock), and updates internal busy blocks.
- **Admin Policy Engine:** Evaluates actions against a centralized policy document to determine auto-approval or escalation limits.
- **Communications Routing:** Automatically categorizes notifications (incidents, approvals, reminders) and routes them to the correct Slack or Discord channel.
- **Full Database Persistence:** Powered by PostgreSQL and Prisma ORM.

<img width="897" height="1120" alt="image" src="https://github.com/user-attachments/assets/469247d4-8ce1-41e9-9b5d-59c9f542721c" />


## Tech Stack

- **Framework:** [NitroStack](https://nitrostack.ai) (MCP Server)
- **Language:** TypeScript
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Validation:** Zod

  <img width="1482" height="976" alt="image" src="https://github.com/user-attachments/assets/3fe02db1-01bc-4dbe-8ae7-cc2eaaa87046" />


## Setup & Installation

### 1. Prerequisites
- Node.js (v18+)
- A PostgreSQL database (e.g., [Supabase](https://supabase.com))

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root of the project:
```env
# Server Config
NITRO_LOG_LEVEL=info
NITROSTACK_APP_MODE=universal
MCP_TRANSPORT_TYPE=stdio

# Database
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?pgbouncer=true"

# Integrations
GOOGLE_CALENDAR_API_KEY="AIzaSy..."
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."

# Constants
COMPANY_DOMAIN="gmail.com"
WORKING_HOURS_START="03:30:00Z"
WORKING_HOURS_END="12:30:00Z"
```

### 4. Database Initialization
Push the database schema to your PostgreSQL instance and seed the initial mock data:
```bash
npx prisma db push
npx tsx src/scripts/seed.ts
```

### 5. Running the Server

**Development Mode (Hot-Reloading):**
```bash
npm run dev
```

**Production Build:**
```bash
npm run build
npm start
```

## Connecting to AI Clients

Since Aide is an MCP server, it can be attached to AI clients to give them live access to your company's systems.

**Claude Desktop:**
Add this to your `%APPDATA%\Claude\claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "Aide": {
      "command": "node",
      "args": ["C:/absolute/path/to/Aide/dist/index.js"],
      "env": {
         "DATABASE_URL": "..."
      }
    }
  }
}
```

**Cursor:**
Go to Cursor Settings -> Features -> MCP Servers -> `+ Add New`.
Set Type to `command` and enter `node C:/absolute/path/to/Aide/dist/index.js`.

## Deployment

Aide is fully deployable to **NitroCloud**. 
1. Push this repository to GitHub.
2. Link your repository in the [NitroCloud Dashboard](https://nitrostack.ai).
3. Provide your `.env` variables (Make sure to set `MCP_TRANSPORT_TYPE=http`).
4. NitroCloud will deploy your server and provide an **SSE URL** (Server-Sent Events) that you can connect remote AI agents to!
