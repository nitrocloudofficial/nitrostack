import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Schema, TableInfo } from "./types.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
export const GROQ_MODEL_FAST = process.env.GROQ_MODEL_FAST ?? GROQ_MODEL;
export const DB_HOST = process.env.DB_HOST ?? "localhost";
export const DB_PORT = Number(process.env.DB_PORT ?? 3306);
export const DB_USER = process.env.DB_USER ?? "root";
export const DB_PASSWORD = process.env.DB_PASSWORD ?? "";
export const DB_NAME = process.env.DB_NAME ?? "mega_hrms_crm";
export const DB_SSL = process.env.DB_SSL === "true";
export const DB_SSL_CA = process.env.DB_SSL_CA?.replace(/\\n/g, "\n");
export const SCHEMA_PATH = process.env.SCHEMA_PATH ?? path.join(root, "schema_fixed (1).json");
export const HALLUCINATION_OVERRIDES_PATH = process.env.HALLUCINATION_OVERRIDES_PATH ?? path.join(root, "hallucination_overrides.json");
let schemaCache: Schema | undefined;
export function getSchema(): Schema { if (!schemaCache) schemaCache = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf8")) as Schema; return schemaCache; }
export function getMeta(): Record<string, unknown> { return (getSchema()._meta ?? {}) as Record<string, unknown>; }
export function getTables(): Record<string, TableInfo> { return Object.fromEntries(Object.entries(getSchema()).filter(([k, v]) => !k.startsWith("_") && v && typeof v === "object")) as Record<string, TableInfo>; }
export function getSkipColumns(): Set<string> { return new Set(((getMeta().skip_columns as string[] | undefined) ?? ["id", "created_at", "updated_at"]).map(x => x.toLowerCase())); }
export function getTableColumns(): Record<string, Set<string>> { return Object.fromEntries(Object.entries(getTables()).map(([n,t]) => [n.toLowerCase(), new Set((t.columns ?? []).map(c => c.name.toLowerCase()))])); }
export function getFkMap(): Record<string, Record<string, [string,string]>> { const out: Record<string, Record<string,[string,string]>> = {}; for (const [name,t] of Object.entries(getTables())) { out[name.toLowerCase()] = {}; for (const fk of t.foreign_keys ?? []) { const col = String(fk.column ?? fk.from_column ?? ""); const table = String(fk.references_table ?? fk.to_table ?? fk.reference_table ?? ""); const ref = String(fk.references_column ?? fk.to_column ?? "id"); if (col && table) out[name.toLowerCase()][col.toLowerCase()] = [table.toLowerCase(), ref.toLowerCase()]; }} return out; }
export function getDomainKeywords(): Record<string,string[]> { return (getMeta().domain_keywords as Record<string,string[]> | undefined) ?? Object.fromEntries(Object.entries(getTables()).map(([n,t]) => [t.domain ?? n, t.keywords ?? n.split("_")])); }
export function getDomainPairs(): string[][] { return (getMeta().domain_pairs as string[][] | undefined) ?? []; }
export function getDataIntentNouns(): Set<string> { return new Set(((getMeta().data_intent_nouns as string[] | undefined) ?? Object.keys(getTables()).flatMap(x => x.split("_"))).map(x => x.toLowerCase())); }
export function getConversationalDomainsSummary(): string { return [...new Set(Object.values(getTables()).map(t => t.domain).filter(Boolean))].join(", "); }
