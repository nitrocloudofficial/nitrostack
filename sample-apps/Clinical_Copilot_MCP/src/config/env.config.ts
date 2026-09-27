/**
 * Clinical Copilot MCP Server - Environment & Application Configuration
 *
 * Defines environment variable mappings, database connection strings,
 * API keys, and service settings.
 */

export interface AppConfig {
  env: 'development' | 'production' | 'test';
  port: number;
  database: {
    mongoUri: string;
    supabaseUrl: string;
    supabaseAnonKey: string;
    supabaseServiceRoleKey: string;
    pineconeApiKey: string;
    pineconeIndex: string;
  };
  services: {
    openaiApiKey: string;
    geminiApiKey: string;
    grokApiKey: string;
    clinicalTrialApiUrl: string;
    ocrEngineUrl: string;
  };
}

export const envConfig: AppConfig = {
  env: (process.env.NODE_ENV as any) || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    get mongoUri(): string {
      return process.env.MONGODB_URI!;
    },
    supabaseUrl: process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
    supabaseAnonKey: process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || 'placeholder_anon_key',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_service_role_key',
    pineconeApiKey: process.env.PINECONE_API_KEY || 'placeholder_pinecone_key',
    pineconeIndex: process.env.PINECONE_INDEX || 'clinical-copilot',
  },
  services: {
    openaiApiKey: process.env.OPENAI_API_KEY || 'placeholder_openai_key',
    geminiApiKey: process.env.GEMINI_API_KEY || 'placeholder_gemini_key',
    grokApiKey: process.env.GROK_API_KEY || 'placeholder_grok_key',
    clinicalTrialApiUrl: process.env.CLINICAL_TRIALS_API_URL || 'https://clinicaltrials.gov/api/v2',
    ocrEngineUrl: process.env.OCR_ENGINE_URL || 'http://localhost:5000/ocr',
  },
};
