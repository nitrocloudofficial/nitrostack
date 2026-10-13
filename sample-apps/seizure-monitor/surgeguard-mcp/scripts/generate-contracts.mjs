import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, '..');
const inputPath = resolve(
  projectRoot,
  'reference',
  'database',
  'surgeguard_mcp_contracts.json',
);
const outputPath = resolve(projectRoot, 'src', 'contracts', 'surgeguard-contract.ts');

const source = JSON.parse(readFileSync(inputPath, 'utf8'));
const contract = {
  product: source.product,
  project: source.project,
  protocolTarget: source.protocolTarget,
  server: source.server,
  authorization: source.authorization,
  commonOperationalRules: source.commonOperationalRules,
  tools: source.tools,
  resources: source.resources,
  prompts: source.prompts,
  errorCatalog: source.errorCatalog,
};

const header = `/* This file is generated from reference/database/surgeguard_mcp_contracts.json. */
/* Run: npm run generate:contracts */

export interface JsonSchemaNode {
  type?: string | string[];
  format?: string;
  enum?: unknown[];
  properties?: Record<string, JsonSchemaNode>;
  required?: string[];
  items?: JsonSchemaNode;
  additionalProperties?: boolean | JsonSchemaNode;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  description?: string;
}

export interface SurgeGuardToolContract {
  name: string;
  title: string;
  description: string;
  inputSchema: JsonSchemaNode;
  outputSchema: JsonSchemaNode;
  annotations: {
    readOnlyHint: boolean;
    destructiveHint: boolean;
    idempotentHint: boolean;
    openWorldHint: boolean;
  };
  security: {
    permission: string;
    classification: string;
    purposeOfUseRequired: boolean;
    humanApproval: string;
    policyGate: string;
    transactionMode: string;
  };
  runtime: {
    timeoutMs: number;
    auditEventCode: string;
    supportsTask: boolean;
    supportsCancellation: boolean;
  };
}

export interface SurgeGuardContract {
  product: string;
  project: string;
  protocolTarget: string;
  server: Record<string, unknown>;
  authorization: Record<string, unknown>;
  commonOperationalRules: string[];
  tools: SurgeGuardToolContract[];
  resources: Array<{ uri: string; name: string; mimeType: string }>;
  prompts: Array<{ name: string; description: string; arguments: string[] }>;
  errorCatalog: unknown[];
}

export const SURGEGUARD_CONTRACT: SurgeGuardContract = `;

writeFileSync(
  outputPath,
  `${header}${JSON.stringify(contract, null, 2)};\n`,
  'utf8',
);

console.log(`Generated ${outputPath}`);
