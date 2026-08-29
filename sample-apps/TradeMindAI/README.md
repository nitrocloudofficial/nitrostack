# trademind-unified-mcp

TradeMind AI's 6 MCP servers merged into **one standalone server / one repo**:

| Domain | Tools |
|---|---|
| Portfolio | `get_portfolio_snapshot`, `get_allocation_breakdown`, `get_pnl_history` |
| Market Data | `get_market_snapshot`, `get_price_history`, `get_volatility_metrics` |
| Risk Engine | `calculate_var`, `calculate_sharpe`, `get_exposure_analysis` |
| Trade Records | `get_trade_history`, `get_execution_details`, `reconcile_trades` |
| Compliance DB | `check_restrictions`, `get_audit_trail`, `validate_compliance` |
| Slack | `send_notification`, `get_channel_history`, `create_thread` |

18 tools, 1 process, 1 port.

## Why this exists

The original 6 repos (`portfolio-mcp`, `market-data-mcp`, `risk-engine-mcp`,
`trade-records-mcp`, `compliance-db-mcp`, `slack-mcp`) each ran as their own
server. This repo copies each module's tool classes in locally (no npm
workspace/package dependency on the rest of the `trademind` monorepo), so it
can be pushed as **one standalone GitHub repo** and imported as **one
NitroStack app**.

No business logic was changed — this is a structural merge only. All
responses are currently mock/simulated data unless the optional live-data
env vars below are set (same behavior as the original repos).

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

Server starts on `http://localhost:3150` (configurable via `UNIFIED_MCP_PORT`).
`GET /health` reports status and the 18 registered tools.

## Deploy to NitroStack / NitroCloud

1. Push this folder as its own GitHub repo.
2. In NitroCloud → Apps → Create App, import this repo.
3. Set env vars from `.env.example` in the app's settings (all are optional —
   tools fall back to simulated data if unset).

## Environment variables

See `.env.example`. All are optional:
- `UNIFIED_MCP_PORT` — defaults to 3150
- `CONTEXT_ENGINE_URL` — if set, tool results are also written there (fire-and-forget)
- `POLYGON_API_KEY` / `TWELVEDATA_API_KEY` — enables live market data in `market-data` tools
- `SLACK_BOT_TOKEN` — enables live Slack posting in `send_notification`
