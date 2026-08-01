const synonyms: Record<string,string> = { emp:"employee", emps:"employees", dept:"department", depts:"departments", sal:"salary", mgr:"manager", inv:"invoice", txn:"transaction", amt:"amount", avg:"average", cnt:"count", pct:"percent", "a/b":"ab" };
export function normalizeWhitespace(text: string): string { return text.replace(/\s+/g, " ").trim(); }
export function removeSpecialCharacters(text: string): string { return text.replace(/[^a-zA-Z0-9 ?'",\-./]/g, ""); }
export function expandSynonyms(text: string): string { let out=text; for (const [from,to] of Object.entries(synonyms)) out=out.replace(new RegExp(`\\b${from.replace(/[.*+?^${}()|[\\]\\]/g,"\\$&")}\\b`,"gi"),to); return out; }
export function fixCommonTypos(text: string): string { return text.replace(/\bteh\b/gi,"the").replace(/\brecieve\b/gi,"receive"); }
export function normalizeQuery(rawQuery: string) { const normalized=fixCommonTypos(expandSynonyms(removeSpecialCharacters(normalizeWhitespace(rawQuery)))); return { success:true, original_query:rawQuery, normalized_query:normalized, changes: normalized === rawQuery ? [] : ["normalized whitespace, punctuation, and common synonyms"] }; }
