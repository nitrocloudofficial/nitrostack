import { askJson } from "./llm.js";
import { buildGuardPromptBlock, detectHallucinationsInSql } from "./column_guard.js";

function buildFallbackSql(selectedTables: Record<string, unknown>[]) {
  if (!selectedTables.length) {
    return "";
  }

  const firstTable = selectedTables[0];
  const tableName = String(firstTable.table ?? "");
  const columns = Array.isArray(firstTable.columns)
    ? (firstTable.columns as unknown[]).slice(0, 5).map(c => typeof c === "string" ? c : String((c as Record<string, unknown>).name ?? ""))
    : [];

  const columnList = columns.filter(Boolean).join(", ") || "*";
  return tableName ? `SELECT ${columnList} FROM ${tableName} LIMIT 50` : "";
}

export async function generateSql(query:string,intent:Record<string,unknown>,schemaSelection:Record<string,unknown>,plan:Record<string,unknown>) {
  const selected=(schemaSelection.selected_tables as Record<string,unknown>[] ?? []);
  const fallback={success:false,sql:"",error:"Set GROQ_API_KEY to generate SQL."};
  const result=await askJson("Generate one safe read-only MySQL SELECT statement. Return JSON with sql. Never write data.\n"+buildGuardPromptBlock(selected),JSON.stringify({query,intent,plan}),fallback);
  const payload = typeof result === "object" && result !== null ? result as Record<string, unknown> : {};
  let sql=String(payload.sql ?? "");

  if (!sql.trim()) {
    sql = buildFallbackSql(selected);
    payload.error = "LLM did not return SQL; using fallback SELECT.";
  }

  const errors=validateSqlBasic(sql);
  const hallucinations=detectHallucinationsInSql(sql);
  return {...payload,success:!errors.length && !hallucinations.length,sql,errors,hallucinations};
}
export function validateSqlBasic(sql:string){const issues:string[]=[]; if(!/^\s*(select|with)\b/i.test(sql))issues.push("Only SELECT/CTE queries are allowed."); if(/\b(insert|update|delete|drop|alter|truncate|create)\b/i.test(sql))issues.push("Write statements are not allowed."); return issues;}
export function formatSqlSummary(r:Record<string,unknown>){return `SQL: ${String(r.sql ?? "")}`;}
