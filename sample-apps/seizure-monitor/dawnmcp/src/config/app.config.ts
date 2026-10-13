import { Injectable, OnModuleInit } from '@nitrostack/core';
import * as path from 'path';

/**
 * DawnMCP Application Configuration
 *
 * Centralized configuration service that reads from environment variables.
 * All defaults are local-first — no external cloud services required.
 */
@Injectable()
export class AppConfigService implements OnModuleInit {
  /** LLM provider identifier (default: ollama) */
  readonly llmProvider: string;

  /** Ollama server URL */
  readonly ollamaUrl: string;

  /** Chat / reasoning model name (default: qwen2.5-coder:7b) */
  readonly chatModel: string;

  /** Embedding model name */
  readonly embedModel: string;

  /** Vector database type ('chromadb' or 'local') */
  readonly vectorDb: string;

  /** ChromaDB HTTP server URL */
  readonly chromaUrl: string;

  /** Absolute root directory for persistent data (vectors, file store) */
  readonly dataDir: string;

  /** Optional GitHub Personal Access Token */
  readonly githubToken?: string;

  /** Application log level */
  readonly logLevel: string;

  constructor() {
    this.llmProvider = process.env.LLM_PROVIDER || 'ollama';
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.chatModel = process.env.CHAT_MODEL || 'qwen2.5-coder:7b';
    this.embedModel = process.env.EMBED_MODEL || 'nomic-embed-text';
    this.vectorDb = process.env.VECTOR_DB || 'chromadb';
    this.chromaUrl = process.env.CHROMA_URL || 'http://localhost:8000';
    this.dataDir = path.resolve(process.cwd(), process.env.DATA_DIR || './data');
    this.githubToken = process.env.GITHUB_TOKEN;
    this.logLevel = process.env.LOG_LEVEL || 'info';
  }

  async onModuleInit(): Promise<void> {
    console.error('');
    console.error('┌─────────────────────────────────────────┐');
    console.error('│       DawnMCP Configuration              │');
    console.error('├─────────────────────────────────────────┤');
    console.error(`│  LLM Provider : ${this.llmProvider.padEnd(23)}│`);
    console.error(`│  Ollama URL   : ${this.ollamaUrl.padEnd(23)}│`);
    console.error(`│  Chat Model   : ${this.chatModel.padEnd(23)}│`);
    console.error(`│  Embed Model  : ${this.embedModel.padEnd(23)}│`);
    console.error(`│  Vector DB    : ${this.vectorDb.padEnd(23)}│`);
    console.error(`│  Chroma URL   : ${this.chromaUrl.padEnd(23)}│`);
    console.error(`│  Data Dir     : ${this.dataDir.slice(-23).padEnd(23)}│`);
    console.error('└─────────────────────────────────────────┘');
    console.error('');
  }
}
