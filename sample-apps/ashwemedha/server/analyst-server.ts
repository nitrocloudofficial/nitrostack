// Analyst Agent — MCP server entry point (Person 2).
// Run with: npx tsx server/analyst-server.ts
// Test in NitroStudio via STDIO transport before wiring into the full pipeline.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import {
  fetchPriceVolume,
  crossCheckPriceAction,
  assessSignalStrength,
  historicalPatternLookup,
} from "./tools/analyst.tools.js";

import {
  readLatestSignalLog,
  listSignalLogs,
} from "./resources/signal-log.resource.js";

import { readFindingsBoard } from "./resources/findings-board.resource.js";

const server = new Server(
  { name: "analyst-agent", version: "1.0.0" },
  { capabilities: { tools: {}, resources: {} } }
);

// ─── Tools ────────────────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "fetch_price_volume",
      description:
        "Fetches current price and 30-day volume context for a ticker. Routes to Yahoo Finance for stocks, CoinGecko for crypto. Results are cached for 5 minutes to avoid rate limits. Returns current price, daily change, volume ratio vs 30-day average, and recent price bars.",
      inputSchema: {
        type: "object",
        properties: {
          ticker: {
            type: "string",
            description: "Ticker symbol, e.g. 'AAPL', 'TSLA', 'NVDA', 'BTC'",
          },
        },
        required: ["ticker"],
      },
    },
    {
      name: "cross_check_price_action",
      description:
        "Compares the findings_board timestamp to subsequent price movement. Classifies as already_moved (>2% move), moving_now (0.5-2% with volume), or not_yet_reacted (<0.5%). The LLM agent should call fetch_price_volume first and pass the price_data.",
      inputSchema: {
        type: "object",
        properties: {
          ticker: { type: "string", description: "Ticker symbol" },
          findings: {
            type: "object",
            description: "FindingsBoard object from the findings_board resource",
          },
          price_data: {
            type: "object",
            description: "PriceVolumeData object from fetch_price_volume tool",
          },
        },
        required: ["ticker", "findings", "price_data"],
      },
    },
    {
      name: "assess_signal_strength",
      description:
        "Combines sentiment score, mention velocity, and price reaction into a 0-100 signal_score with a signal_direction. Scoring uses explicit, auditable rules (see tool documentation). Writes result to the signal_log resource.",
      inputSchema: {
        type: "object",
        properties: {
          ticker: { type: "string", description: "Ticker symbol" },
          findings: {
            type: "object",
            description: "FindingsBoard object from the findings_board resource",
          },
          price_data: {
            type: "object",
            description: "PriceVolumeData object from fetch_price_volume tool",
          },
          price_action: {
            type: "object",
            description: "PriceActionResult from cross_check_price_action tool",
          },
        },
        required: ["ticker", "findings", "price_data", "price_action"],
      },
    },
    {
      name: "historical_pattern_lookup",
      description:
        "Checks a hardcoded database of historical signals for 'last time this pattern happened' for a given ticker and pattern type. Returns matching historical cases, average score, and success rate to add cheap credibility to the demo.",
      inputSchema: {
        type: "object",
        properties: {
          ticker: {
            type: "string",
            description: "Ticker symbol, e.g. 'AAPL', 'TSLA', 'BTC'",
          },
          pattern_type: {
            type: "string",
            description:
              "Pattern type to search for, e.g. 'spiking_positive_sentiment', 'delivery_miss_negative', 'retail_hype_spike'",
          },
        },
        required: ["ticker", "pattern_type"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const toolArgs = args ?? {} as Record<string, unknown>;

  try {
    switch (name) {
      case "fetch_price_volume": {
        const result = await fetchPriceVolume(toolArgs.ticker as string);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "cross_check_price_action": {
        const ticker = (toolArgs.ticker as string).toUpperCase();
        const findings = toolArgs.findings as any ?? readFindingsBoard(ticker);
        const priceData = toolArgs.price_data as any;

        if (!findings) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: `No findings_board entry found for ${ticker}. Run the Scout agent first.` }) }],
            isError: true,
          };
        }
        if (!priceData) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: `Price data required. Call fetch_price_volume for ${ticker} first.` }) }],
            isError: true,
          };
        }

        const result = crossCheckPriceAction(ticker, findings, priceData);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "assess_signal_strength": {
        const ticker = (toolArgs.ticker as string).toUpperCase();
        const findings = toolArgs.findings as any ?? readFindingsBoard(ticker);
        const priceData = toolArgs.price_data as any;
        const priceAction = toolArgs.price_action as any;

        if (!findings) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: `No findings_board entry found for ${ticker}. Run the Scout agent first.` }) }],
            isError: true,
          };
        }
        if (!priceData) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: `Price data required. Call fetch_price_volume for ${ticker} first.` }) }],
            isError: true,
          };
        }
        if (!priceAction) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: `Price action required. Call cross_check_price_action for ${ticker} first.` }) }],
            isError: true,
          };
        }

        const result = assessSignalStrength(ticker, findings, priceData, priceAction);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "historical_pattern_lookup": {
        const result = historicalPatternLookup(
          toolArgs.ticker as string,
          toolArgs.pattern_type as string
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text", text: `Tool error: ${message}` }],
      isError: true,
    };
  }
});

// ─── Resources ────────────────────────────────────────────────────────────────

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: "signal-log://all",
      name: "signal_log",
      description: "All Analyst signals across all tracked tickers, sorted newest-first",
      mimeType: "application/json",
    },
    {
      uri: "signal-log://AAPL",
      name: "signal_log:AAPL",
      description: "Analyst signals for AAPL",
      mimeType: "application/json",
    },
    {
      uri: "signal-log://TSLA",
      name: "signal_log:TSLA",
      description: "Analyst signals for TSLA",
      mimeType: "application/json",
    },
    {
      uri: "signal-log://NVDA",
      name: "signal_log:NVDA",
      description: "Analyst signals for NVDA",
      mimeType: "application/json",
    },
    {
      uri: "signal-log://BTC",
      name: "signal_log:BTC",
      description: "Analyst signals for BTC",
      mimeType: "application/json",
    },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  const ticker = uri.replace("signal-log://", "");

  const data =
    ticker === "all" ? listSignalLogs() : listSignalLogs(ticker);

  return {
    contents: [
      {
        uri,
        mimeType: "application/json",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
});

// ─── Start ────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Analyst Agent MCP server running on stdio");
