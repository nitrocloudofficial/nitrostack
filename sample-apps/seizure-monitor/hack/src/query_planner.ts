import { askJson } from "./llm.js";
export async function planQuery(query:string,intent:Record<string,unknown>,schemaSelection:Record<string,unknown>) { return askJson("Produce a MySQL execution plan as JSON, using only supplied schema.",JSON.stringify({query,intent,schemaSelection}),{success:true,query_type:"SIMPLE_SELECT",complexity:"simple",execution_steps:[],select_columns:[],joins:[],where_conditions:[],group_by:[],order_by:[]}); }
export function formatPlanSummary(r:Record<string,unknown>){return `Plan: ${String(r.query_type ?? "SIMPLE_SELECT")}`;}
