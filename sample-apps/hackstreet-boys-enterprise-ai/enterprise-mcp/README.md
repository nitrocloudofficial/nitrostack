# Enterprise Knowledge MCP Server

A production-ready Enterprise AI Company Knowledge Platform powered by the Model Context Protocol (MCP).

## Architecture

This project uses a Clean Architecture approach with:
- **Backend**: Python 3.12, FastAPI, SQLAlchemy, PostgreSQL, Redis, Celery, FAISS
- **Frontend**: Next.js 15, React, TailwindCSS
- **Deployment**: Docker, Docker Compose, Nginx
- **AI**: OpenAI GPT-4 via LangChain, semantic vector search

## File Structure
- `backend/`: FastAPI application, Alembic migrations, Pytest suite
- `frontend/`: Next.js React application
- `docker/`: Nginx and container configurations
- `.github/`: CI/CD workflows

## Installation & Running Locally

1. **Clone and enter the directory**:
   ```bash
   cd enterprise-mcp
   ```

2. **Environment Setup**:
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   Update the `.env` file with your specific API keys (e.g., `OPENAI_API_KEY`).

3. **Run with Docker Compose**:
   ```bash
   docker-compose up --build
   ```

## Services Access
- **Frontend UI**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## MCP Tool Overview
The server includes several FastMCP tools to interact with company knowledge automatically:
- `search_documents(query)`: Semantic search over FAISS vectors.
- `find_policy(policy_name)`: Finds specific HR/Company policies.
- `lookup_employee(name)`: Retrieves employee hierarchy and info.
- `create_ticket(title, description, priority)`: Integrates with Jira.
- `search_slack(query)`: Queries internal Slack channels.

## CI/CD
GitHub Actions is configured for linting, running `pytest`, and building Docker images on every push to `main`.
