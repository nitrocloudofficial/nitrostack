# SymBioForge Deployment Guide

This guide covers everything required to take the SymBioForge MCP server and Next.js frontend to production securely.

## 1. Environment Variables Checklist

Before deploying, ensure the following environment variables are securely added to your hosting provider (Nitro Cloud for the backend, Vercel/Netlify for the frontend).

### Backend (MCP Server)
- `SUPABASE_URL`: Your Supabase project URL (e.g., `https://xxxx.supabase.co`).
- `SUPABASE_ANON_KEY`: Your Supabase anonymous/public key.
- `GROQ_API_KEY`: API key for the Groq inference engine (used by the Swarm Agents).
- `MCP_TRANSPORT_TYPE`: Ensure this is set to `dual` or `sse` for web-client connectivity.
- `ENABLE_CORS`: Set to `true` to allow the frontend to connect.

### Frontend (Next.js Web App)
- `NEXT_PUBLIC_MCP_URL`: The deployed URL of your backend MCP Server (e.g., `https://your-mcp-server.nitrocloud.ai`).
- `NEXT_PUBLIC_SUPABASE_URL`: (Optional) If the frontend accesses DB directly.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (Optional)

> [!WARNING]
> Never commit `.env` or `.env.local` files to source control. They are ignored in `.gitignore`, but double-check before pushing.

## 2. Infrastructure & Services

### Database: Supabase
- **Role:** Permanent storage of all `Factory` profiles, telemetry data, and metrics.
- **Resilience:** The MCP server (`StateManager`) uses an in-memory cache and seed fallback. If Supabase goes down, the server will gracefully degrade and continue serving requests using the most recent state or seed data.
- **Row Level Security (RLS):** Ensure RLS is enabled on your `factories` table. The current setup allows the `anon` key full read/write for hackathon purposes. **For production, you must restrict this.**

### AI Engine: Groq / Anthropic
- **Role:** Powers the autonomous reasoning of the 8 swarm agents.
- **Latency:** We use Groq due to its ultra-fast token generation, which allows 8 agents to run parallel simulations in under 2 seconds.

### PDF Generation
- **Role:** Generates official SPCB Form V compliance documents using `pdfkit`.
- **Note on Serverless:** If deploying the backend to serverless (like AWS Lambda or Vercel edge), `pdfkit` may encounter file-system limitations when writing the temporary PDF to disk. Ensure your hosting environment provides a writable `/tmp` directory, or stick to Nitro Cloud (which provides a standard Node environment). The system has a built-in fallback to generate HTML if PDF compilation fails.

## 3. Production Observability

### Health Endpoint
The frontend exposes a health endpoint to monitor uptime:
- **URL:** `GET /api/health`
- **Expected Response:** `200 OK` with JSON `{ "status": "ok", "version": "1.0.0" }`.
- Use this endpoint for external monitoring services like UptimeRobot or Datadog.

### Logging
All backend swarm activity is logged to the internal `ActivityLog` (viewable via the MCP `get-cluster-state` tool). For external API routes in the frontend, standard `console.error` logs are used. Ensure your hosting provider captures standard output logs (stdout/stderr).

## 4. Deployment Steps

### Backend (Nitro Cloud)
1. Push your code to GitHub.
2. Connect your GitHub repository to Nitro Cloud.
3. Configure the **Environment Variables** (see checklist above).
4. Deploy! The platform will automatically run `npm install`, `npm run build`, and `npm start`.

### Frontend (Vercel)
1. Connect the repository to Vercel.
2. Set the Root Directory to `web/`.
3. Set the Build Command to `npm run build` and Output Directory to `.next`.
4. Add the `NEXT_PUBLIC_MCP_URL` environment variable pointing to your deployed backend.
5. Deploy!

## 5. Security & Authentication (Next Steps)
Currently, the system is designed for a hackathon demo environment without strict authentication barriers. Before launching to real enterprise customers:
- **Auth Required Mode:** Implement Supabase Auth or Clerk in the Next.js frontend to restrict API access.
- **Tenant Isolation:** Update the backend tools to accept an `org_id` to ensure Factory Owners can only query their own telemetry data.
