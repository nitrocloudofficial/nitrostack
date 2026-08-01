export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type RecordValue = Record<string, unknown>;
export interface Column { name: string; type?: string; description?: string; values?: string[] }
export interface ForeignKey { column?: string; references_table?: string; references_column?: string; [key: string]: unknown }
export interface TableInfo { domain?: string; description?: string; columns?: Column[]; foreign_keys?: ForeignKey[]; keywords?: string[]; rows?: number; [key: string]: unknown }
export interface Schema { _meta?: Record<string, unknown>; [table: string]: TableInfo | Record<string, unknown> | undefined }
export interface PipelineResult { success: boolean; [key: string]: unknown }
