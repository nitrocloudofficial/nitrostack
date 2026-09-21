// Skeptic Agent — MCP server entry point (Person 3).
// Run with: npx tsx server/skeptic-server.ts
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
  checkSourceCredibility,
  checkRecycledContent,
  checkVolumeContext,
  generateVerdict,
} from "./tools/skeptic.tools.js";

import {
  readLatestVerdictLog,
  listVerdictLogs,
} from "./resources/verdict-log.resource.js";

import { readFindingsBoard } from "./resources/findings-board.resource.js";
import { readSignalLog } from "./resources/signal-log.resource.js";

const server = new Server(
  { name: "skeptic-agent", version: "1.0.0" },
  { capabilities: { tools: {}, resources: {} } }
);

// ─── Tools ────────────────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "check_source_credibility",
      description:
        "Checks a news source domain against a curated credibility database. Returns tier (high/medium/low/unknown), press release mill flag, numeric score, and pass/flagged result with plain-language reason.",
      inputSchema: {
        type: "object",
        properties: {
          source_domain: {
            type: "string",
            description: "Domain of the news source, e.g. 'reuters.com' or 'prnewswire.com'",
          },
          source_name: {
            type: "string",
            description: "Human-readable name of the source (optional)",
          },
        },
        required: ["source_domain"],
      },
    },
    {
      name: "check_recycled_content",
      description:
        "Detects whether a headline is recycled from prior coverage using Jaccard word-set similarity. Headlines above the 65% similarity threshold are flagged as recycled — a common pump tactic where the same narrative is laundered through multiple outlets.",
      inputSchema: {
        type: "object",
        properties: {
          headline_text: { type: "string", description: "The headline to check" },
          ticker: { type: "string", description: "Ticker symbol this headline covers" },
          historical_headlines: {
            type: "array",
            items: { type: "string" },
            description: "Prior headlines for this ticker to compare against",
          },
          similarity_threshold: {
            type: "number",
            description: "Jaccard threshold for flagging recycled content (default: 0.65)",
          },
        },
        required: ["headline_text", "ticker", "historical_headlines"],
      },
    },
    {
      name: "check_volume_context",
      description:
        "Checks whether a volume spike date falls within 2 days of a known market calendar event (earnings, options expiry, index rebalance) for the given ticker. If it does, the volume is 'explained_by_calendar_event' — not purely news-driven.",
      inputSchema: {
        type: "object",
        properties: {
          ticker: { type: "string", description: "Ticker symbol" },
          date: {
            type: "string",
            description: "Date of the volume event to check (YYYY-MM-DD)",
          },
          lookback_days: {
            type: "number",
            description: "Days around a calendar event that count as explained (default: 2)",
          },
        },
        required: ["ticker", "date"],
      },
    },
    {
      name: "generate_verdict",
      description:
        "Runs all three Skeptic checks (source credibility, recycled content, volume context) plus a narrative entropy advisory against the provided findings and signal. Writes the result to the verdict_log resource and returns the complete VerdictLog entry.",
      inputSchema: {
        type: "object",
        properties: {
          ticker: { type: "string", description: "Ticker symbol" },
          findings: {
            type: "object",
            description: "FindingsBoard object from the findings_board resource",
          },
          signal: {
            type: "object",
            description: "SignalLog object from the signal_log resource",
          },
        },
        required: ["ticker", "findings", "signal"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (!args) throw new Error(`Tool '${name}' called with no arguments`);

    switch (name) {
      case "check_source_credibility": {
        const result = checkSourceCredibility(
          args.source_domain as string,
          args.source_name as string | undefined
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "check_recycled_content": {
        const result = checkRecycledContent(
          args.headline_text as string,
          args.ticker as string,
          args.historical_headlines as string[],
          args.similarity_threshold as number | undefined
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "check_volume_context": {
        const result = checkVolumeContext(
          args.ticker as string,
          args.date as string,
          args.lookback_days as number | undefined
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "generate_verdict": {
        // The agent can pass findings/signal directly, or we auto-fetch from resources
        // if the agent omits them (convenience shorthand for the orchestrator).
        const ticker = (args.ticker as string).toUpperCase();
        const findings = args.findings ?? readFindingsBoard(ticker);
        const signal = args.signal ?? readSignalLog(ticker);

        if (!findings) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: `No findings_board entry found for ${ticker}. Run the Scout agent first.` }) }],
            isError: true,
          };
        }
        if (!signal) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: `No signal_log entry found for ${ticker}. Run the Analyst agent first.` }) }],
            isError: true,
          };
        }

        const verdict = generateVerdict(ticker, findings as never, signal as never);
        return { content: [{ type: "text", text: JSON.stringify(verdict, null, 2) }] };
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
      uri: "verdict-log://all",
      name: "verdict_log",
      description: "All Skeptic verdicts across all tracked tickers, sorted newest-first",
      mimeType: "application/json",
    },
    {
      uri: "verdict-log://AAPL",
      name: "verdict_log:AAPL",
      description: "Skeptic verdicts for AAPL",
      mimeType: "application/json",
    },
    {
      uri: "verdict-log://TSLA",
      name: "verdict_log:TSLA",
      description: "Skeptic verdicts for TSLA",
      mimeType: "application/json",
    },
    {
      uri: "verdict-log://NVDA",
      name: "verdict_log:NVDA",
      description: "Skeptic verdicts for NVDA",
      mimeType: "application/json",
    },
    {
      uri: "verdict-log://BTC",
      name: "verdict_log:BTC",
      description: "Skeptic verdicts for BTC",
      mimeType: "application/json",
    },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  const ticker = uri.replace("verdict-log://", "");

  const data =
    ticker === "all" ? listVerdictLogs() : listVerdictLogs(ticker);

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
console.error("Skeptic Agent MCP server running on stdio");
