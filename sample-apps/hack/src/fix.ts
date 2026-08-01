/** Schema-repair helpers ported from fix.py. */
import type { Schema, TableInfo } from "./types.js";
export function generateHallucinationHints(_tableName:string,_info:TableInfo,_allTables:Record<string,TableInfo>){return [];}
export function fixDummyDataDates(info:TableInfo){return info;}
export function recalculateCoreDomains(tables:Record<string,TableInfo>){const totals:Record<string,number>={};for(const t of Object.values(tables))totals[t.domain??"Unknown"]=(totals[t.domain??"Unknown"]??0)+Number(t.rows??0);return Object.keys(totals).sort((a,b)=>totals[b]-totals[a]).slice(0,2);}
export function findNonexistentTables(_tables:Record<string,TableInfo>){return [];}
export function findMultiEntityDomains(tables:Record<string,TableInfo>){const result:Record<string,string[]>={};for(const [name,t] of Object.entries(tables))(result[t.domain??"Unknown"]??=[]).push(name);return Object.fromEntries(Object.entries(result).filter(([,names])=>names.length>1));}
export function fixSchema(schema:Schema){const tables=Object.fromEntries(Object.entries(schema).filter(([k])=>!k.startsWith("_"))) as Record<string,TableInfo>;schema._meta={...(schema._meta??{}),core_domains:recalculateCoreDomains(tables)};return schema;}
