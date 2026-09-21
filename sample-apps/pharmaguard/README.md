# PharmaGuard MCP

## Project Overview
PharmaGuard MCP is an advanced Model Context Protocol (MCP) server built with NitroStack. It provides AI agents (like Claude Desktop or Cursor IDE) with direct access to official FDA open data. The server enables AI to look up drug details, retrieve adverse event reports (FAERS), check active FDA enforcement recalls, and compare drug safety profiles side-by-side.

## Features
- **NDC Lookup:** Retrieve detailed National Drug Code (NDC) information for generic and brand name drugs.
- **Adverse Events Search:** Analyze top adverse reactions (FAERS) associated with a specific medication.
- **FDA Label Cross-Reference:** Automatically compares reported adverse reactions against the official FDA Drug Label to determine if a reaction is a known warning or potentially unlisted.
- **Historical Trends & Seriousness:** Visualizes the timeline of adverse event reports and provides a clinical seriousness breakdown (Death, Hospitalization, etc.).
- **Enforcement Recalls:** Checks the FDA enforcement database for active, ongoing recalls related to a drug.
- **Drug Comparison:** Compare two medications side-by-side for their adverse event profiles and recall statuses.
- **Dynamic Widgets:** Renders interactive, highly-visual React widgets directly within supported MCP clients (like NitroStudio), featuring Recharts data visualizations.

## Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd pharmaguard-mcp
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

## Environment Variables

Copy the provided `.env.example` file to create your own `.env`:

```bash
cp .env.example .env
```

Ensure the following variables are set in your `.env` file:
- `OPENFDA_API_KEY`: Your openFDA API key. Get one at [https://open.fda.gov/apis/authentication/](https://open.fda.gov/apis/authentication/) to increase your rate limits from 240/min to 240,000/day.
- `PORT`: The port the server will run on (default is 3000).

*Note: Do not commit your `.env` file to version control.*

## Build Commands

To build the MCP server and compile the React widgets for production:

```bash
npm run build
```
*(This compiles the TypeScript code into `dist/` and bundles the widgets into `src/widgets/out/`)*

For development with hot-reloading:
```bash
npm run dev
```

To run smoke tests to verify the tools are functioning correctly:
```bash
npm run test:smoke
```

## Deployment Instructions

### Running the Server
You can start the production server using:
```bash
npm start
```

### Integrating with MCP Clients

**For NitroStudio:**
1. Open NitroStudio.
2. Select "Add Project" and point it to the `pharmaguard-mcp` directory.
3. The server will automatically start and render the custom React widgets.

**For Claude Desktop:**
Update your `claude_desktop_config.json` with the following configuration:
```json
{
  "mcpServers": {
    "pharmaguard": {
      "command": "node",
      "args": ["/absolute/path/to/pharmaguard-mcp/dist/index.js"],
      "env": {
        "OPENFDA_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

**For Cursor IDE:**
1. Navigate to Settings -> MCP Settings.
2. Add a new MCP server.
3. Select "Command" and use: `node /absolute/path/to/pharmaguard-mcp/dist/index.js`.
4. Ensure your environment variables are configured within the Cursor environment if necessary.
