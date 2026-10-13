import { getDomainKeywords } from "./config.js";
import { askJson } from "./llm.js";
export function keywordClassify(intent: Record<string,unknown>): string[] { const text=JSON.stringify(intent).toLowerCase(); return Object.entries(getDomainKeywords()).filter(([, words]) => words.some(w => text.includes(w.toLowerCase()))).map(([domain]) => domain); }
export async function classifyDomain(intent: Record<string,unknown>) { const domains=keywordClassify(intent); return askJson("Classify ERP domains. Return JSON.", JSON.stringify(intent), { success:true, domains:domains.length ? domains : ["Unknown"], confidence:domains.length ? 0.9 : 0.2, method:"keyword" }); }
export function formatDomainSummary(result: Record<string,unknown>): string { return `Domains: ${JSON.stringify(result.domains ?? [])}`; }
