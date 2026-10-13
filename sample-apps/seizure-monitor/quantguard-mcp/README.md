# QuantGuard MCP

QuantGuard MCP is a Model Context Protocol (MCP) server built on the **NitroStack** framework (TypeScript, NestJS-style dependency injection, `@Tool` / `@Resource` / `@Prompt` decorators, Zod validation, and React visual widgets). 

It is designed for institutional trading desks to continuously monitor market microstructure and assess trading safety across multiple specialist agents, generating deterministic risk decisions explained in natural language.

> ### 📐 [Low-Level Design Document (LLD) →](./LLD.md)
> Complete architecture diagrams, database ERD, agent orchestration flow, tool/resource API contracts, prompt templates, and UI widget specifications.

---

---

## 🚀 Key Features

1. **Continuous Microstructure Monitoring**: Feeds on orderbook depth and price streams (with live Binance WebSocket integrations for crypto).
2. **Deterministic Risk & Execution Rules**: 
   - **Toxicity (VPIN)**: Calculates signed-volume imbalances over volume buckets.
   - **Spoofing Detection**: Heuristics to detect large resting orders that cancel quickly to manipulate price direction.
   - **Liquidity Profile**: Estimates slippage under square-root market-impact models.
3. **Institutional Risk Engine**: Computes Value at Risk (VaR 95%), Expected Shortfall (CVaR), exposure limits, and leverage thresholds.
4. **Keyword Sentiment Lexicon**: Evaluates breaking headlines and macroeconomic calendars without LLM latency.
5. **Multi-Agent Orchestration**: Coordinate reports across 7 specialist agents:
   - *Toxicity Agent, Spoofing Agent, Liquidity Agent, Volatility Agent, Risk Agent, News Agent, and Strategy Agent.*
6. **Polished Interactive Widgets**: Sleek dark-mode React dashboards loaded natively in NitroStudio.

---

## 🛠️ Installation & Setup

1. **Clone & Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   # Server Config
   NODE_ENV=development
   PORT=3000

   # Demo Mode Toggle
   DEMO_MODE=true

   # Optional LLM keys (will use high-quality local templates if omitted)
   GEMINI_API_KEY=your_gemini_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. **Build the Server & Widgets**:
   ```bash
   npm run build
   ```

---

## 🏁 Live Demo Simulation

QuantGuard comes with a built-in terminal dashboard simulator. It launches the MCP server in `DEMO_MODE=true`, subscribes to a live Binance feed, and schedules a synthetic spoofing attack timeline to demonstrate the server's protection logic:

- **0s - 120s**: Normal market conditions. Recommended Strategy: `VWAP` or `MARKET`.
- **120s - 180s**: Spoofing wall injected. Recommended Strategy: switches instantly to `WAIT`.
- **180s+**: Spoofing wall cancelled. Recommended Strategy: recovers back to `VWAP`.

To launch the interactive demo:
```bash
node demo.js
```

---

## 🔌 Connecting to Client / NitroStudio

- **STDIO Connection**: Add to your MCP client config (e.g., Claude Desktop):
  ```json
  {
    "mcpServers": {
      "quantguard": {
        "command": "node",
        "args": ["C:/Users/Siddharth/.gemini/antigravity/scratch/quantguard-mcp/dist/index.js"],
        "env": {
          "DEMO_MODE": "true"
        }
      }
    }
  }
  ```
- **Streamable HTTP Endpoint**: Connect via `http://localhost:3000/mcp`
- **Visual Studio**: Launch **NitroStudio** locally and point it to the project directory to inspect the `quantguard-dashboard` widget.

---

## ☁️ Cloud Deployment (NitroCloud)

Deploy your MCP server to NitroCloud using the official NitroStack CLI utility:
```bash
npx nitrostack-cli deploy --cloud
```
This bundles production assets, optimizes SQLite migrations, registers tool metadata, and deploys it to a serverless edge endpoint.
