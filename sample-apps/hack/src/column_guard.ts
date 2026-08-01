import fs from "node:fs";
import { HALLUCINATION_OVERRIDES_PATH, getFkMap, getTableColumns, getTables } from "./config.js";
const columns=getTableColumns(); const fkMap=getFkMap();
type Issue={table:string; column:string; hint:string};
function aliases(sql:string) { const out:Record<string,string>={}; for(const m of sql.matchAll(/\b(?:from|join)\s+`?([\w]+)`?(?:\s+(?:as\s+)?`?([\w]+)`?)?/gi)) out[(m[2] ?? m[1]).toLowerCase()]=m[1].toLowerCase(); return out; }
export function columnExists(table:string,column:string) { return columns[table.toLowerCase()]?.has(column.toLowerCase()) ?? false; }
export function isHallucinated(table:string,column:string) { return !columnExists(table,column); }
export function getRealColumn(_table:string,_column:string):string|undefined { return undefined; }
export function detectHallucinationsInSql(sql:string):Issue[] { const map=aliases(sql); const issues:Issue[]=[]; for(const m of sql.matchAll(/\b([\w]+)\.([\w]+)\b/g)){const table=map[m[1].toLowerCase()] ?? m[1].toLowerCase(); if(columns[table] && !columnExists(table,m[2])) issues.push({table,column:m[2],hint:`Use a real column from ${table}.`});} return issues; }
export function buildGuardPromptBlock(selectedTables:Record<string,unknown>[]) { return selectedTables.map(t=>{const n=String(t.table ?? ""); return `${n}: ${(t.columns as {name:string}[] ?? []).map(c=>c.name).join(", ")}`;}).join("\n"); }
export function buildSchemaContextForQuery(selectedTables:Record<string,unknown>[]) { return buildGuardPromptBlock(selectedTables); }
export function getForeignKeyMap(){return fkMap;}
