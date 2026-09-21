# Code-To-Career: Mentor Context MCP Server

## What it does
This is a standalone Model Context Protocol (MCP) Resource Server built for the Code-To-Career application. It connects directly to a MongoDB database to securely expose a student's real-time learning progress (active roadmaps, completed steps, and inferred weak areas) to AI Agents.

By exposing the database state via the `resource://mentor/user_context/{userId}` protocol, an AI assistant can fetch hyper-personalized context about the student before responding to them in chat, entirely bypassing the need for huge, generic LLM prompts.

## How to run it

### 1. Install dependencies
```bash
npm install
```

### 2. Configure Environment
Set your MongoDB connection string in the environment:
```bash
export MONGODB_URI="mongodb+srv://<user>:<password>@cluster..."
```

### 3. Start the Server
```bash
npm start
```
The Express server will start on port `3001` and expose the MCP resource endpoint.
