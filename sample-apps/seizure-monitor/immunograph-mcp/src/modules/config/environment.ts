import 'dotenv/config';
import { z } from 'zod';

const transportSchema = z.enum(['stdio', 'http', 'dual']);

const rawMcpEnvironmentSchema = z.object({
  HOST: z.string().optional(),
  PORT: z.coerce.number().int().min(1).max(65_535).optional(),
  MCP_HOST: z.string().optional(),
  MCP_PORT: z.coerce.number().int().min(1).max(65_535).optional(),
  MCP_TRANSPORT_TYPE: transportSchema.optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  AGENT_MODE: z.enum(['LLM', 'DETERMINISTIC']).default('DETERMINISTIC'),
  LLM_ENABLED: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('false'),
  OPENAI_API_KEY: z.string().min(1).optional(),
  LLM_MODEL: z.string().min(1).default('gpt-4.1-mini'),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  /** Enable real IEDB live binding predictions. Off by default (safe offline mode). */
  IEDB_LIVE_ENABLED: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('false'),
  /** Per-request timeout for IEDB HTTP calls (ms). */
  IEDB_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
  /** Maximum permitted IEDB response body size (bytes). */
  IEDB_MAX_RESPONSE_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(10 * 1024 * 1024),
  /** Override the IEDB MHC-I endpoint (leave unset to use the official URL). */
  IEDB_MHCI_URL: z.string().url().optional(),
  /** Override the IEDB MHC-II endpoint (leave unset to use the official URL). */
  IEDB_MHCII_URL: z.string().url().optional(),
  /**
   * Enable IEDB HTTP population coverage. Off by default because IEDB does not
   * publish this endpoint in the same stable Tools-API contract as MHC binding.
   */
  IEDB_POPULATION_COVERAGE_ENABLED: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('false'),
  /** Explicit configured IEDB-compatible population coverage HTTP endpoint. */
  IEDB_POPULATION_COVERAGE_URL: z.string().url().optional(),
  /** Absolute or runtime-relative path to IEDB's standalone population coverage script. */
  IEDB_POPULATION_COVERAGE_SCRIPT_PATH: z.string().min(1).optional(),
  /** Python command used to run IEDB's standalone population coverage script. */
  IEDB_POPULATION_COVERAGE_PYTHON_COMMAND: z.string().min(1).default('python'),
  /** Per-request timeout for IEDB population coverage HTTP calls (ms). */
  IEDB_POPULATION_COVERAGE_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
  /** Maximum permitted IEDB population coverage response body size (bytes). */
  IEDB_POPULATION_COVERAGE_MAX_RESPONSE_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(10 * 1024 * 1024),
  /** Enable local MHCflurry MHC-I predictions. Off by default unless the CLI/models are installed. */
  MHCFLURRY_ENABLED: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('false'),
  /** Local MHCflurry command name or absolute path. */
  MHCFLURRY_COMMAND: z.string().min(1).default('mhcflurry'),
  /** Recorded MHCflurry method/model version for provenance. */
  MHCFLURRY_METHOD_VERSION: z.string().min(1).default('2.3.0'),
  /** Per-request timeout for local MHCflurry CLI calls (ms). */
  MHCFLURRY_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
  /** Maximum permitted MHCflurry CSV output size (bytes). */
  MHCFLURRY_MAX_RESPONSE_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(10 * 1024 * 1024),
  STRUCTURE_ENABLED: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('true'),
  RCSB_PDB_ENABLED: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('false'),
  ALPHAFOLD_DB_ENABLED: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('false'),
  CHEMISTRY_ENABLED: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('true'),
  PUBCHEM_ENABLED: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('false'),
  RDKIT_ENABLED: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('false'),
  RDKIT_PYTHON_COMMAND: z.string().min(1).default('python'),
  OPENBABEL_ENABLED: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('false'),
  OPENBABEL_COMMAND: z.string().min(1).default('obabel'),
  DOCKING_ENABLED: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('true'),
  VINA_ENABLED: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('false'),
  VINA_COMMAND: z.string().min(1).default('vina'),
  PLIP_ENABLED: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('false'),
  PLIP_COMMAND: z.string().min(1).default('plip'),
  FPOCKET_ENABLED: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('false'),
  FPOCKET_COMMAND: z.string().min(1).default('fpocket'),
  FREESASA_ENABLED: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('false'),
  FREESASA_COMMAND: z.string().min(1).default('freesasa'),
  MOLSTAR_ENABLED: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('false'),
  DOCKING_FIXTURE_FALLBACK_ENABLED: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('true'),
});

export type McpEnvironment = z.infer<typeof rawMcpEnvironmentSchema> & {
  HOST: string;
  PORT: number;
  MCP_HOST: string;
  MCP_TRANSPORT_TYPE: z.infer<typeof transportSchema>;
};

export function loadMcpEnvironment(): McpEnvironment {
  const parsed = rawMcpEnvironmentSchema.parse(process.env);
  const cloudHost = parsed.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
  const defaultPort = parsed.NODE_ENV === 'production' ? 3000 : 3001;
  const host = parsed.HOST ?? parsed.MCP_HOST ?? cloudHost;
  return {
    ...parsed,
    HOST: host,
    PORT: parsed.PORT ?? parsed.MCP_PORT ?? defaultPort,
    MCP_HOST: parsed.MCP_HOST ?? host,
    MCP_PORT: parsed.MCP_PORT ?? parsed.PORT ?? defaultPort,
    MCP_TRANSPORT_TYPE: parsed.MCP_TRANSPORT_TYPE ?? 'http',
  };
}
