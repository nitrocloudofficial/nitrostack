import { askJson } from "./llm.js";
import { detectHallucinationsInSql } from "./column_guard.js";
import { validateSqlBasic } from "./sql_generator.js";
export function staticValidate(sql:string,_intent:Record<string,unknown>) { const errors=validateSqlBasic(sql); const hallucinations=detectHallucinationsInSql(sql); return {success:errors.length===0 && hallucinations.length===0, valid:errors.length===0 && hallucinations.length===0, errors, warnings:hallucinations.map(x=>x.hint), hallucinations}; }
export async function selfHeal(sql:string,errors:string[],_intent:Record<string,unknown>) { return askJson("Repair this MySQL SELECT. Return JSON with sql only.",JSON.stringify({sql,errors}),{success:false,sql,error:"Unable to repair SQL without LLM."}); }
export async function validateSql(sql:string,intent:Record<string,unknown>,dbError="") { const initial=staticValidate(sql,intent); if(initial.valid && !dbError)return {...initial,sql}; const healed=await selfHeal(sql,[...initial.errors,...(dbError?[dbError]:[])],intent); const repairedSql = typeof healed === "object" && healed !== null && "sql" in healed ? String((healed as { sql?: unknown }).sql ?? sql) : sql; const final=staticValidate(repairedSql,intent); return {...final,sql:repairedSql,healed:true}; }
export function formatValidatorSummary(r:Record<string,unknown>){return `Validation: ${r.valid ? "valid" : "invalid"}`;}
