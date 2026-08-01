import { askJson } from "./llm.js";
import { getTables } from "./config.js";
export async function extractIntent(query: string, schemaHint = "") { const fallback = { success:true, entities:[], metrics:[], filters:[], requested_columns:[], aggregations:[], time_range:null, query_type:"SELECT", raw_query:query }; return askJson("Extract the SQL intent from this ERP request. Return JSON only.", `${query}\n${schemaHint}\nKnown tables: ${Object.keys(getTables()).join(", ")}`, fallback); }
export function formatIntentSummary(result: Record<string,unknown>): string { return `Intent: ${String(result.query_type ?? "SELECT")}; entities: ${JSON.stringify(result.entities ?? [])}`; }
