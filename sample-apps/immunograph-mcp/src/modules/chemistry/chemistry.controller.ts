import { canonicalJsonSha256 } from '../../lib/algorithms/index.js';
import { ControllerDecorator, ToolDecorator as Tool } from '@nitrostack/core';
import type { ExecutionContext } from '@nitrostack/core';
import { z } from 'zod';

import {
  connectorProvenanceSchema,
  failureExample,
  identifierSchema,
} from '../common/contracts.js';
import { executeTool, ToolExecutionError } from '../common/executor.js';
import { defaultLiveToolRuntime, type LiveToolRuntime } from '../common/live-runtime.js';
import { loadMcpEnvironment } from '../config/environment.js';

const CATEGORY = 'Chemistry Tools';
const sourceStatus = z.enum(['LIVE', 'CACHED', 'FIXTURE']);
const fallbackPolicy = z.enum([
  'LIVE_ONLY',
  'CACHE_THEN_LIVE',
  'CACHE_THEN_LIVE_THEN_FIXTURE',
  'LIVE_THEN_CACHE_THEN_FIXTURE',
  'FIXTURE_ONLY',
]);

const fetchCompoundInput = z
  .object({
    runId: identifierSchema,
    compoundRef: identifierSchema,
    source: z.enum(['PUBCHEM', 'FIXTURE']),
    fallbackPolicy,
  })
  .strict();
const compoundRecord = z
  .object({
    compoundId: identifierSchema,
    compoundRef: identifierSchema,
    source: z.enum(['PUBCHEM', 'FIXTURE']),
    sourceStatus,
    name: identifierSchema,
    smiles: identifierSchema,
    scientificUse: z.boolean(),
    validationStatus: z.enum(['SCIENTIFIC', 'VERIFIED_FIXTURE']),
  })
  .strict();
const fetchCompoundData = z
  .object({ compound: compoundRecord, provenance: connectorProvenanceSchema })
  .strict();

const validateCompoundInput = z
  .object({
    runId: identifierSchema,
    compoundId: identifierSchema,
    smiles: identifierSchema,
    sourceStatus,
  })
  .strict();
const validateCompoundData = z
  .object({
    compoundId: identifierSchema,
    valid: z.boolean(),
    warnings: z.array(identifierSchema),
    checks: z.array(
      z
        .object({
          checkId: identifierSchema,
          status: z.enum(['PASS', 'WARN', 'FAIL']),
          message: identifierSchema,
        })
        .strict(),
    ),
    provenance: connectorProvenanceSchema,
  })
  .strict();

const deduplicateInput = z
  .object({
    runId: identifierSchema,
    compounds: z
      .array(
        z
          .object({
            compoundId: identifierSchema,
            smiles: identifierSchema,
            sourceStatus,
          })
          .strict(),
      )
      .min(1),
  })
  .strict();
const deduplicateData = z
  .object({
    canonicalCompoundIds: z.array(identifierSchema),
    duplicateLinks: z.array(
      z
        .object({
          duplicateId: identifierSchema,
          canonicalId: identifierSchema,
          ruleId: z.literal('CHEM-DUPLICATE-001'),
        })
        .strict(),
    ),
    provenance: connectorProvenanceSchema,
  })
  .strict();

const descriptorInput = z
  .object({
    runId: identifierSchema,
    compoundId: identifierSchema,
    smiles: identifierSchema,
    method: identifierSchema,
  })
  .strict();
const descriptorData = z
  .object({
    compoundId: identifierSchema,
    descriptors: z
      .object({
        heavyAtomCount: z.number().int().nonnegative(),
        heteroAtomCount: z.number().int().nonnegative(),
        aromaticRingEstimate: z.number().int().nonnegative(),
        rotatableBondEstimate: z.number().int().nonnegative(),
      })
      .strict(),
    provenance: connectorProvenanceSchema,
  })
  .strict();

const prepareLigandInput = z
  .object({
    runId: identifierSchema,
    compoundId: identifierSchema,
    smiles: identifierSchema,
    preparationMethod: identifierSchema,
  })
  .strict();
const prepareLigandData = z
  .object({
    ligandId: identifierSchema,
    compoundId: identifierSchema,
    artifactRef: identifierSchema,
    format: z.enum(['PDBQT', 'SDF', 'FIXTURE_JSON']),
    sourceStatus,
    scientificUse: z.boolean(),
    provenance: connectorProvenanceSchema,
  })
  .strict();

@ControllerDecorator()
export class ChemistryController {
  private runtime: LiveToolRuntime = defaultLiveToolRuntime;
  private runtimeInjected = false;

  useRuntime(runtime: LiveToolRuntime): this {
    this.runtime = runtime;
    this.runtimeInjected = true;
    return this;
  }

  @Tool({
    name: 'fetch_compound',
    description: 'Fetch or replay compound metadata with explicit source provenance.',
    inputSchema: fetchCompoundInput,
    examples: {
      request: {
        runId: 'run-1',
        compoundRef: 'fixture-compound-1',
        source: 'FIXTURE',
        fallbackPolicy: 'FIXTURE_ONLY',
      },
      response: failureExample('fetch_compound'),
    },
    metadata: { category: CATEGORY, tags: ['immunograph', 'chemistry', 'prd-v1.1'] },
    annotations: { readOnlyHint: true, idempotentHint: true },
  })
  fetchCompound(input: unknown, context: ExecutionContext) {
    return executeTool({
      toolName: 'fetch_compound',
      input,
      inputSchema: fetchCompoundInput,
      dataSchema: fetchCompoundData,
      context,
      operation: async (value) => {
        if (value.source === 'PUBCHEM') {
          try {
            return await this.fetchPubChemCompound(value);
          } catch (error) {
            if (!fixtureFallbackAllowed(value.fallbackPolicy)) throw error;
          }
        }
        const status: z.infer<typeof sourceStatus> = 'FIXTURE';
        return {
          compound: {
            compoundId: value.compoundRef,
            compoundRef: value.compoundRef,
            source: value.source,
            sourceStatus: status,
            name: value.source === 'FIXTURE' ? 'Fixture compound' : value.compoundRef,
            smiles: 'CCO',
            scientificUse: false,
            validationStatus: 'VERIFIED_FIXTURE' as const,
          },
          provenance: provenance('chemistry-fixture-adapter', 'fetch_compound', status, value),
        };
      },
    });
  }

  private async fetchPubChemCompound(value: z.infer<typeof fetchCompoundInput>) {
    const environment = loadMcpEnvironment();
    if (!environment.PUBCHEM_ENABLED && !this.runtimeInjected) {
      throw chemistryUnavailable(value.fallbackPolicy, value.source);
    }
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${encodeURIComponent(value.compoundRef)}/property/Title,IsomericSMILES/JSON`;
    const payload = await this.runtime.fetchJson(url);
    const parsed = parsePubChemProperty(payload, value.compoundRef);
    return {
      compound: {
        compoundId: String(parsed.cid),
        compoundRef: value.compoundRef,
        source: value.source,
        sourceStatus: 'LIVE' as const,
        name: parsed.title,
        smiles: parsed.smiles,
        scientificUse: true,
        validationStatus: 'SCIENTIFIC' as const,
      },
      provenance: provenance('pubchem', 'fetch_compound', 'LIVE', value, url),
    };
  }

  @Tool({
    name: 'validate_compound',
    description: 'Validate compound identity and basic molecular string shape before docking.',
    inputSchema: validateCompoundInput,
    examples: {
      request: {
        runId: 'run-1',
        compoundId: 'fixture-compound-1',
        smiles: 'CCO',
        sourceStatus: 'FIXTURE',
      },
      response: failureExample('validate_compound'),
    },
    metadata: { category: CATEGORY, tags: ['immunograph', 'chemistry', 'prd-v1.1'] },
    annotations: { readOnlyHint: true, idempotentHint: true },
  })
  validateCompound(input: unknown, context: ExecutionContext) {
    return executeTool({
      toolName: 'validate_compound',
      input,
      inputSchema: validateCompoundInput,
      dataSchema: validateCompoundData,
      context,
      operation: (value) => {
        const valid = /^[A-Za-z0-9@+\-[\]()=#\\/%.]+$/.test(value.smiles);
        return {
          compoundId: value.compoundId,
          valid,
          warnings: value.sourceStatus === 'FIXTURE' ? ['fixture-compound-not-live'] : [],
          checks: [
            {
              checkId: 'CHEM-SMILES-001',
              status: valid ? ('PASS' as const) : ('FAIL' as const),
              message: valid
                ? 'SMILES-like string accepted.'
                : 'SMILES-like string contains unsupported characters.',
            },
          ],
          provenance: provenance(
            'compound-validator',
            'validate_compound',
            value.sourceStatus,
            value,
          ),
        };
      },
    });
  }

  @Tool({
    name: 'deduplicate_compounds',
    description: 'Canonicalize compounds by normalized SMILES-like identity.',
    inputSchema: deduplicateInput,
    examples: {
      request: {
        runId: 'run-1',
        compounds: [{ compoundId: 'fixture-compound-1', smiles: 'CCO', sourceStatus: 'FIXTURE' }],
      },
      response: failureExample('deduplicate_compounds'),
    },
    metadata: { category: CATEGORY, tags: ['immunograph', 'chemistry', 'prd-v1.1'] },
    annotations: { readOnlyHint: true, idempotentHint: true },
  })
  deduplicateCompounds(input: unknown, context: ExecutionContext) {
    return executeTool({
      toolName: 'deduplicate_compounds',
      input,
      inputSchema: deduplicateInput,
      dataSchema: deduplicateData,
      context,
      operation: (value) => {
        const seen = new Map<string, string>();
        const canonicalCompoundIds: string[] = [];
        const duplicateLinks: Array<{
          duplicateId: string;
          canonicalId: string;
          ruleId: 'CHEM-DUPLICATE-001';
        }> = [];
        for (const compound of value.compounds) {
          const key = compound.smiles.trim().toUpperCase();
          const canonical = seen.get(key);
          if (canonical === undefined) {
            seen.set(key, compound.compoundId);
            canonicalCompoundIds.push(compound.compoundId);
          } else {
            duplicateLinks.push({
              duplicateId: compound.compoundId,
              canonicalId: canonical,
              ruleId: 'CHEM-DUPLICATE-001',
            });
          }
        }
        return {
          canonicalCompoundIds,
          duplicateLinks,
          provenance: provenance(
            'compound-deduplicator',
            'deduplicate_compounds',
            'FIXTURE',
            value,
          ),
        };
      },
    });
  }

  @Tool({
    name: 'calculate_molecular_descriptors',
    description:
      'Calculate deterministic lightweight descriptor estimates without claiming RDKit execution.',
    inputSchema: descriptorInput,
    examples: {
      request: {
        runId: 'run-1',
        compoundId: 'fixture-compound-1',
        smiles: 'CCO',
        method: 'deterministic-smiles-summary',
      },
      response: failureExample('calculate_molecular_descriptors'),
    },
    metadata: { category: CATEGORY, tags: ['immunograph', 'chemistry', 'prd-v1.1'] },
    annotations: { readOnlyHint: true, idempotentHint: true },
  })
  calculateDescriptors(input: unknown, context: ExecutionContext) {
    return executeTool({
      toolName: 'calculate_molecular_descriptors',
      input,
      inputSchema: descriptorInput,
      dataSchema: descriptorData,
      context,
      operation: async (value) => {
        const environment = loadMcpEnvironment();
        if (value.method === 'rdkit' && (environment.RDKIT_ENABLED || this.runtimeInjected)) {
          const result = await this.runtime.runCommand(environment.RDKIT_PYTHON_COMMAND, [
            '-c',
            rdkitDescriptorScript(),
            value.smiles,
          ]);
          return {
            compoundId: value.compoundId,
            descriptors: parseDescriptorJson(result.stdout),
            provenance: provenance('rdkit', value.method, 'LIVE', value),
          };
        }
        return {
          compoundId: value.compoundId,
          descriptors: estimateDescriptors(value.smiles),
          provenance: provenance('descriptor-estimator', value.method, 'FIXTURE', value),
        };
      },
    });
  }

  @Tool({
    name: 'prepare_ligand',
    description:
      'Prepare a ligand artifact reference through configured chemistry tooling or fixture fallback.',
    inputSchema: prepareLigandInput,
    examples: {
      request: {
        runId: 'run-1',
        compoundId: 'fixture-compound-1',
        smiles: 'CCO',
        preparationMethod: 'fixture-ligand-preparation',
      },
      response: failureExample('prepare_ligand'),
    },
    metadata: { category: CATEGORY, tags: ['immunograph', 'chemistry', 'prd-v1.1'] },
    annotations: { readOnlyHint: true, idempotentHint: true },
  })
  prepareLigand(input: unknown, context: ExecutionContext) {
    return executeTool({
      toolName: 'prepare_ligand',
      input,
      inputSchema: prepareLigandInput,
      dataSchema: prepareLigandData,
      context,
      operation: async (value) => {
        const environment = loadMcpEnvironment();
        if (environment.OPENBABEL_ENABLED || this.runtimeInjected) {
          const command = process.env.OPENBABEL_COMMAND ?? 'obabel';
          await this.runtime.runCommand(command, [
            `-:${value.smiles}`,
            '-ismi',
            '-opdbqt',
            '--gen3d',
          ]);
          return {
            ligandId: `${value.compoundId}-ligand`,
            compoundId: value.compoundId,
            artifactRef: `mcp://ligands/${value.runId}/${value.compoundId}.pdbqt`,
            format: 'PDBQT' as const,
            sourceStatus: 'LIVE' as const,
            scientificUse: true,
            provenance: provenance('open-babel', value.preparationMethod, 'LIVE', value),
          };
        }
        return {
          ligandId: `${value.compoundId}-ligand`,
          compoundId: value.compoundId,
          artifactRef: `mcp://ligands/${value.runId}/${value.compoundId}`,
          format: 'FIXTURE_JSON' as const,
          sourceStatus: 'FIXTURE' as const,
          scientificUse: false,
          provenance: provenance('ligand-preparer', value.preparationMethod, 'FIXTURE', value),
        };
      },
    });
  }
}

function chemistryUnavailable(
  policy: z.infer<typeof fallbackPolicy>,
  source: 'PUBCHEM' | 'FIXTURE',
): ToolExecutionError {
  return new ToolExecutionError(
    'CHEMISTRY_LIVE_CONNECTOR_UNAVAILABLE',
    'CONNECTOR',
    'Live chemistry retrieval is not configured for this MCP deployment.',
    true,
    { policy, source },
  );
}

function fixtureFallbackAllowed(policy: z.infer<typeof fallbackPolicy>): boolean {
  return policy === 'CACHE_THEN_LIVE_THEN_FIXTURE' || policy === 'LIVE_THEN_CACHE_THEN_FIXTURE';
}

function parsePubChemProperty(payload: unknown, fallbackCid: string) {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'PropertyTable' in payload &&
    typeof payload.PropertyTable === 'object' &&
    payload.PropertyTable !== null &&
    'Properties' in payload.PropertyTable &&
    Array.isArray(payload.PropertyTable.Properties)
  ) {
    const first = payload.PropertyTable.Properties[0] as unknown;
    if (typeof first === 'object' && first !== null) {
      const record = first as Record<string, unknown>;
      const smiles = record.IsomericSMILES;
      if (typeof smiles === 'string' && smiles.length > 0) {
        return {
          cid:
            typeof record.CID === 'number' || typeof record.CID === 'string'
              ? record.CID
              : fallbackCid,
          title:
            typeof record.Title === 'string' && record.Title.length > 0
              ? record.Title
              : `PubChem ${fallbackCid}`,
          smiles,
        };
      }
    }
  }
  throw new ToolExecutionError(
    'PUBCHEM_RESPONSE_INVALID',
    'CONNECTOR',
    'PubChem response did not contain the required compound properties.',
    false,
    { compoundRef: fallbackCid },
  );
}

function rdkitDescriptorScript(): string {
  return [
    'import json, sys',
    'from rdkit import Chem',
    'from rdkit.Chem import Descriptors, Lipinski',
    'mol = Chem.MolFromSmiles(sys.argv[1])',
    'if mol is None: raise SystemExit(2)',
    'rings = mol.GetRingInfo().AtomRings()',
    'print(json.dumps({"heavyAtomCount": mol.GetNumHeavyAtoms(), "heteroAtomCount": Lipinski.NumHeteroatoms(mol), "aromaticRingEstimate": sum(1 for ring in rings if all(mol.GetAtomWithIdx(i).GetIsAromatic() for i in ring)), "rotatableBondEstimate": Lipinski.NumRotatableBonds(mol)}))',
  ].join('; ');
}

function parseDescriptorJson(output: string) {
  try {
    const parsed = JSON.parse(output) as Record<string, unknown>;
    return {
      heavyAtomCount: nonnegativeInteger(parsed.heavyAtomCount),
      heteroAtomCount: nonnegativeInteger(parsed.heteroAtomCount),
      aromaticRingEstimate: nonnegativeInteger(parsed.aromaticRingEstimate),
      rotatableBondEstimate: nonnegativeInteger(parsed.rotatableBondEstimate),
    };
  } catch {
    throw new ToolExecutionError(
      'RDKIT_OUTPUT_INVALID',
      'CONNECTOR',
      'RDKit descriptor output was not valid JSON.',
      false,
    );
  }
}

function nonnegativeInteger(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0;
}

function estimateDescriptors(smiles: string) {
  const heavyAtomCount = (smiles.match(/[BCNOPSFIKVYZW][a-z]?|Cl|Br/g) ?? []).length;
  const heteroAtomCount = (smiles.match(/[NOSPF]/g) ?? []).length;
  const aromaticRingEstimate = (smiles.match(/[cnosp]/g) ?? []).length > 0 ? 1 : 0;
  const rotatableBondEstimate = Math.max(0, (smiles.match(/-/g) ?? []).length);
  return { heavyAtomCount, heteroAtomCount, aromaticRingEstimate, rotatableBondEstimate };
}

function provenance(
  connectorId: string,
  method: string,
  status: 'LIVE' | 'CACHED' | 'FIXTURE',
  parameters: unknown,
  sourceUri?: string,
) {
  return {
    connectorId,
    connectorVersion: '1.0.0',
    method,
    methodVersion: '1.0.0',
    status,
    sourceUri: sourceUri ?? `https://immunograph.local/${connectorId}`,
    parameters: parameters as Record<string, unknown>,
    predictionSource: status,
    scientificUse: status === 'LIVE',
    validationStatus: status === 'LIVE' ? 'SCIENTIFIC' : 'VERIFIED_FIXTURE',
    algorithm: connectorId,
    algorithmVersion: '1.0.0',
    datasetHash: canonicalJsonSha256({ connectorId, method, status }),
  } as const;
}
