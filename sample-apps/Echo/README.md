# Nitro To-Do App + MCP Server

A small full-stack example:

- **Nitro** (unjs server framework) — REST API for a to-do list, storing data in `data/todos.json`.
- **MCP server** (`mcp-server/`) — wraps that API as MCP tools, so any MCP client (Claude Desktop, etc.) can manage your to-dos in natural language.

## 1. Run the Nitro API

```bash
npm install
npm run dev
```

This starts the API at `http://localhost:3000`.

Endpoints:
| Method | Path              | Body                          | Description        |
|--------|-------------------|--------------------------------|---------------------|
| GET    | `/api/todos`      | –                              | List all todos      |
| POST   | `/api/todos`      | `{ "title": "Buy milk" }`      | Create a todo       |
| PATCH  | `/api/todos/:id`  | `{ "done": true }`             | Update / complete   |
| DELETE | `/api/todos/:id`  | –                               | Delete a todo       |

## 2. Run the MCP server

In a second terminal:

```bash
cd mcp-server
npm install
npm start
```

It talks to the Nitro API at `http://localhost:3000/api/todos` by default. Override with `NITRO_TODO_API_URL` if you deploy the API elsewhere.

## 3. Connect it to Claude Desktop

Add this to your Claude Desktop MCP config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "nitro-todo": {
      "command": "node",
      "args": ["/absolute/path/to/nitro-todo-mcp/mcp-server/index.js"],
      "env": {
        "NITRO_TODO_API_URL": "http://localhost:3000/api/todos"
      }
    }
  }
}
```

Restart Claude Desktop. Make sure the Nitro dev server (step 1) is running first — the MCP server just proxies to it.

You'll then have four tools available in chat:
- `list_todos`
- `add_todo`
- `complete_todo`
- `delete_todo`

## Notes

- Storage is a flat JSON file for simplicity — swap `utils/storage.ts` for a real DB (SQLite, Postgres, etc.) for production use.
- "Nitro Studio" isn't a standard part of the open-source Nitro (unjs) stack — if you meant a specific tool/product by that name, let me know and I can adjust this.
