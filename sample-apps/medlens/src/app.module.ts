import fs from "fs";
import path from "path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { getDrugRegulatoryStatus, getDrugRegulatoryStatusSchema } from "./tools/getDrugRegulatoryStatus";
import { getDrugSafetyProfile, getDrugSafetyProfileSchema } from "./tools/getDrugSafetyProfile";
import { checkMedicineCombination, checkMedicineCombinationSchema } from "./tools/checkMedicineCombination";
import { findGenericEquivalent, findGenericEquivalentSchema } from "./tools/findGenericEquivalent";
import { getDrugCostEstimate, getDrugCostEstimateSchema } from "./tools/getDrugCostEstimate";
import { searchMedicineByCondition, searchMedicineByConditionSchema } from "./tools/searchMedicineByCondition";
import { manageMedicineSchedule, manageMedicineScheduleSchema } from "./tools/manageMedicineSchedule";
import { getDueReminders, getDueRemindersSchema } from "./tools/getDueReminders";
import { renderMedLensReport, renderMedLensReportSchema } from "./tools/renderMedLensReport";

const WIDGET_RESOURCE_URI = "ui://widget/medlens.html";

/**
 * Bundle produced by `npm run build:widget` (esbuild, see package.json and
 * widget/entry.tsx). Read lazily inside the resource callback below rather
 * than at module load, so a server that hasn't built the widget yet still
 * starts and serves the other 8 tools fine — only rendering the card fails
 * until `npm run build:widget` has been run.
 */
function readWidgetBundle(): string {
  const bundlePath = path.join(__dirname, "..", "dist-widget", "medlens.js");
  const script = fs.readFileSync(bundlePath, "utf8");
  return `<div id="root"></div><script>${script}</script>`;
}

/**
 * IMPORTANT: this module previously scaffolded placeholder example tools
 * (search_flights, get_flight_details, search_airports) from the starter
 * template. Those have been fully removed — this file registers ONLY the
 * 8 MedLens tools below, and nothing else should be added to the module
 * graph without going through this file.
 */
export function createMedLensServer(): McpServer {
  const server = new McpServer({
    name: "medlens-mcp",
    version: "0.1.0",
  });

  server.tool(
    "get_drug_regulatory_status",
    "Look up FDA label / regulatory status for a drug by brand or generic name: manufacturer, route, pharmacologic class, boxed warning presence, and a short indications snippet. Data source: openFDA label data.",
    getDrugRegulatoryStatusSchema.shape,
    async (args) => toContent(await getDrugRegulatoryStatus(args))
  );

  server.tool(
    "get_drug_safety_profile",
    "Get warnings, contraindications, boxed warning text, and a frequency-ranked list of real reported adverse reaction terms for a drug. Data sources: openFDA label data and openFDA adverse event data.",
    getDrugSafetyProfileSchema.shape,
    async (args) => toContent(await getDrugSafetyProfile(args))
  );

  server.tool(
    "check_medicine_combination",
    "Check whether two named drugs' FDA label warnings/contraindications reference each other, as a curated (non-exhaustive) interaction signal. Always call this when a user mentions two or more medicines together. Data source: openFDA label data.",
    checkMedicineCombinationSchema.shape,
    async (args) => toContent(await checkMedicineCombination(args))
  );

  server.tool(
    "find_generic_equivalent",
    "Resolve a drug name to its RxNorm concept, state whether it resolved as branded (SBD) or generic (SCD), and list up to 5 related generic/clinical-drug names. Data source: RxNorm.",
    findGenericEquivalentSchema.shape,
    async (args) => toContent(await findGenericEquivalent(args))
  );

  server.tool(
    "get_drug_cost_estimate",
    "Return a qualitative cost-tier signal (brand-tier vs generic-tier) for a drug. Never returns fabricated dollar amounts — no real-time pricing API is in scope. Data source: RxNorm (via find_generic_equivalent).",
    getDrugCostEstimateSchema.shape,
    async (args) => toContent(await getDrugCostEstimate(args))
  );

  server.tool(
    "search_medicine_by_condition",
    "Find up to 5 candidate medicines (brand name, generic name, pharmacologic class) whose FDA label indications mention a given condition, e.g. 'high blood pressure'. Data source: openFDA label data.",
    searchMedicineByConditionSchema.shape,
    async (args) => toContent(await searchMedicineByCondition(args))
  );

  server.tool(
    "manage_medicine_schedule",
    "Add a medicine + time-of-day to a user's in-memory reminder schedule and return that user's full updated list. Schedule resets on server restart (demo-scope only, not persistent storage).",
    manageMedicineScheduleSchema.shape,
    async (args) => toContent(await manageMedicineSchedule(args))
  );

  server.tool(
    "get_due_reminders",
    "Return a user's scheduled medicines that are not yet marked taken and whose time-of-day has passed the given current time.",
    getDueRemindersSchema.shape,
    async (args) => toContent(await getDueReminders(args))
  );

  // --- UI: widget/MedLensCard.tsx, bundled via widget/entry.tsx ---
  // See src/tools/renderMedLensReport.ts and widget/entry.tsx for the two
  // ends of this wiring.
  server.registerResource(WIDGET_RESOURCE_URI, WIDGET_RESOURCE_URI, {}, async () => ({
    contents: [
      {
        uri: WIDGET_RESOURCE_URI,
        mimeType: "text/html+skybridge",
        text: readWidgetBundle(),
      },
    ],
  }));

  server.tool(
    "render_medlens_report",
    "Render an assembled MedLensReportPayload as the MedLens comparison card. " +
      "Not a data-fetching tool — call this last, after gathering whichever " +
      "regulatory/safety/combination/generic/cost results are relevant and " +
      "shaping them with buildReportPayload() per AGENT_INSTRUCTIONS.md.",
    renderMedLensReportSchema.shape,
    async (args) => {
      const payload = renderMedLensReport(args);
      return {
        structuredContent: payload,
        content: [{ type: "text" as const, text: `Report for ${payload.drugName}` }],
        _meta: { "openai/outputTemplate": WIDGET_RESOURCE_URI },
      };
    }
  );

  return server;
}

/** Wrap a tool's plain JS return value in the MCP content-block shape. */
function toContent(payload: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}
