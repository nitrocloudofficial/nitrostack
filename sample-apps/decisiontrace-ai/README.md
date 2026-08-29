# DecisionTrace AI

DecisionTrace AI is a NitroStack-powered MCP server that allows enterprise users to instantly trace and replay business decisions. 

## What it does

In any large organization, institutional knowledge about why decisions were made is scattered across emails, meeting notes, finance reviews, and spreadsheets. 
DecisionTrace AI gives anyone in the organization a single natural-language search bar to instantly trace and replay any business decision, powered by the Model Context Protocol (MCP).

- **Enterprise Decision Report**: Returns matching records as a professional report (Decision Summary, Timeline, Stakeholders, Evidence, Confidence Score).
- **Decision Replay**: An interactive, animated replay of the investigation journey.
- **Universal Dual Transport**: Built with NitroStack to simultaneously support STDIO (for AI agents) and HTTP SSE (for the React frontend) on port 3000.
- **No AI Model Required**: Confidence scoring, timeline generation, and executive summaries run on fast, deterministic logic.

## How to run

### 1. Start the NitroStack Server

```bash
# In the sample-apps/decisiontrace-ai directory
npm install
npm start
```
This starts the Universal Dual Transport on port 3000.

### 2. Start the Frontend

```bash
# Open a new terminal
cd frontend
npm install
npm run dev
```
This runs the frontend on http://localhost:5173.

Open http://localhost:5173 and search for an enterprise decision (e.g., "Why was Vendor X rejected?").
