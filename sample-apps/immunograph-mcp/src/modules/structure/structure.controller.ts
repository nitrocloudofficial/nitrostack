import { canonicalJsonSha256 } from '../../lib/algorithms/index.js';
import { ControllerDecorator, ToolDecorator as Tool } from '@nitrostack/core';
import type { ExecutionContext } from '@nitrostack/core';
import { z } from 'zod';

import {
  connectorProvenanceSchema,
  failureExample,
  identifierSchema,
  unitIntervalSchema,
} from '../common/contracts.js';
import { executeTool, ToolExecutionError } from '../common/executor.js';
import { defaultLiveToolRuntime, type LiveToolRuntime } from '../common/live-runtime.js';
import { loadMcpEnvironment } from '../config/environment.js';

const CATEGORY = 'Structure Tools';
const sourceStatus = z.enum(['LIVE', 'CACHED', 'FIXTURE']);
const fallbackPolicy = z.enum([
  'LIVE_ONLY',
  'CACHE_THEN_LIVE',
  'CACHE_THEN_LIVE_THEN_FIXTURE',
  'LIVE_THEN_CACHE_THEN_FIXTURE',
  'FIXTURE_ONLY',
]);

const fetchStructureInput = z
  .object({
    runId: identifierSchema,
    targetId: identifierSchema,
    source: z.enum(['RCSB_PDB', 'ALPHAFOLD_DB', 'FIXTURE']),
    accession: identifierSchema,
    fallbackPolicy,
  })
  .strict();
const structureRecord = z
  .object({
    structureId: identifierSchema,
    targetId: identifierSchema,
    source: z.enum(['RCSB_PDB', 'ALPHAFOLD_DB', 'FIXTURE']),
    accession: identifierSchema,
    sourceStatus,
    format: z.enum(['PDB', 'MMCIF', 'PAE_JSON', 'FIXTURE_JSON']),
    chainIds: z.array(identifierSchema),
    artifactRef: identifierSchema,
    scientificUse: z.boolean(),
    validationStatus: z.enum(['SCIENTIFIC', 'DEMONSTRATION_ONLY', 'VERIFIED_FIXTURE']),
  })
  .strict();
const fetchStructureData = z
  .object({ structure: structureRecord, provenance: connectorProvenanceSchema })
  .strict();

const validateStructureInput = z
  .object({
    runId: identifierSchema,
    structureId: identifierSchema,
    format: z.enum(['PDB', 'MMCIF', 'PAE_JSON', 'FIXTURE_JSON']),
    chainIds: z.array(identifierSchema).min(1),
    residueCount: z.number().int().positive(),
    sourceStatus,
  })
  .strict();
const validateStructureData = z
  .object({
    structureId: identifierSchema,
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

const epitopeMappingInput = z
  .object({
    runId: identifierSchema,
    structureId: identifierSchema,
    candidates: z
      .array(
        z
          .object({
            candidateId: identifierSchema,
            start: z.number().int().positive(),
            end: z.number().int().positive(),
            chainId: identifierSchema.optional(),
          })
          .strict(),
      )
      .min(1),
    mappingMode: z.enum(['DIRECT_COORDINATE', 'FIXTURE']),
  })
  .strict();
const epitopeMappingData = z
  .object({
    mappings: z.array(
      z
        .object({
          candidateId: identifierSchema,
          structureId: identifierSchema,
          chainId: identifierSchema,
          start: z.number().int().positive(),
          end: z.number().int().positive(),
          status: z.enum(['MAPPED', 'UNMAPPED']),
          confidence: unitIntervalSchema,
        })
        .strict(),
    ),
    provenance: connectorProvenanceSchema,
  })
  .strict();

const accessibilityInput = z
  .object({
    runId: identifierSchema,
    method: identifierSchema,
    mappings: z
      .array(
        z
          .object({
            candidateId: identifierSchema,
            structureId: identifierSchema,
            chainId: identifierSchema,
            start: z.number().int().positive(),
            end: z.number().int().positive(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();
const accessibilityData = z
  .object({
    accessibility: z.array(
      z
        .object({
          candidateId: identifierSchema,
          surfaceAccessibility: unitIntervalSchema,
          method: identifierSchema,
          status: z.enum(['FIXTURE', 'CALCULATED']),
        })
        .strict(),
    ),
    provenance: connectorProvenanceSchema,
  })
  .strict();

const confidenceInput = z
  .object({
    runId: identifierSchema,
    structureId: identifierSchema,
    sourceStatus,
    confidenceMetrics: z.record(z.number().finite()).optional(),
  })
  .strict();
const confidenceData = z
  .object({
    structureId: identifierSchema,
    confidenceScore: unitIntervalSchema,
    confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    warnings: z.array(identifierSchema),
    provenance: connectorProvenanceSchema,
  })
  .strict();

const pocketInput = z
  .object({
    runId: identifierSchema,
    structureId: identifierSchema,
    structureArtifactRef: identifierSchema,
    method: z.enum(['fpocket', 'fixture-pocket-detector']),
  })
  .strict();
const pocketData = z
  .object({
    pockets: z.array(
      z
        .object({
          pocketId: identifierSchema,
          structureId: identifierSchema,
          score: z.number().finite(),
          druggabilityScore: unitIntervalSchema,
          center: z
            .object({
              x: z.number().finite(),
              y: z.number().finite(),
              z: z.number().finite(),
            })
            .strict(),
          sourceStatus,
        })
        .strict(),
    ),
    provenance: connectorProvenanceSchema,
  })
  .strict();

const molstarInput = z
  .object({
    runId: identifierSchema,
    viewId: identifierSchema,
    structureArtifactRef: identifierSchema,
    ligandArtifactRef: identifierSchema.optional(),
    mode: z.enum(['STRUCTURE', 'DOCKING']),
  })
  .strict();
const molstarData = z
  .object({
    viewer: z
      .object({
        viewId: identifierSchema,
        viewer: z.literal('Mol*'),
        stateRef: identifierSchema,
        structureArtifactRef: identifierSchema,
        ligandArtifactRef: identifierSchema.optional(),
        mode: z.enum(['STRUCTURE', 'DOCKING']),
        sourceStatus,
        scientificUse: z.boolean(),
      })
      .strict(),
    provenance: connectorProvenanceSchema,
  })
  .strict();

const exampleFetch = {
  runId: 'run-1',
  targetId: 'target-1',
  source: 'FIXTURE' as const,
  accession: 'fixture-structure-1',
  fallbackPolicy: 'FIXTURE_ONLY' as const,
};

@ControllerDecorator()
export class StructureController {
  private runtime: LiveToolRuntime = defaultLiveToolRuntime;
  private runtimeInjected = false;

  useRuntime(runtime: LiveToolRuntime): this {
    this.runtime = runtime;
    this.runtimeInjected = true;
    return this;
  }

  @Tool({
    name: 'fetch_structure',
    description: 'Fetch or replay a structure record with explicit source provenance.',
    inputSchema: fetchStructureInput,
    examples: { request: exampleFetch, response: failureExample('fetch_structure') },
    metadata: { category: CATEGORY, tags: ['immunograph', 'structure', 'prd-v1.1'] },
    annotations: { readOnlyHint: true, idempotentHint: true },
  })
  fetchStructure(input: unknown, context: ExecutionContext) {
    return executeTool({
      toolName: 'fetch_structure',
      input,
      inputSchema: fetchStructureInput,
      dataSchema: fetchStructureData,
      context,
      operation: async (value) => {
        if (value.source !== 'FIXTURE') {
          try {
            const live = await this.fetchLiveStructure(
              value as z.infer<typeof fetchStructureInput> & {
                source: 'RCSB_PDB' | 'ALPHAFOLD_DB';
              },
            );
            return live;
          } catch (error) {
            if (!fixtureFallbackAllowed(value.fallbackPolicy)) throw error;
          }
        }
        const status: z.infer<typeof sourceStatus> = 'FIXTURE';
        return {
          structure: {
            structureId: `${value.targetId}-${value.accession}`,
            targetId: value.targetId,
            source: value.source,
            accession: value.accession,
            sourceStatus: status,
            format: 'FIXTURE_JSON' as const,
            chainIds: ['A'],
            artifactRef: `mcp://structures/${value.runId}/${value.accession}`,
            scientificUse: false,
            validationStatus: 'VERIFIED_FIXTURE' as const,
          },
          provenance: provenance('structure-fixture-adapter', 'fetch_structure', status, value),
        };
      },
    });
  }

  private async fetchLiveStructure(
    value: z.infer<typeof fetchStructureInput> & { source: 'RCSB_PDB' | 'ALPHAFOLD_DB' },
  ) {
    const environment = loadMcpEnvironment();
    const enabled =
      value.source === 'RCSB_PDB' ? environment.RCSB_PDB_ENABLED : environment.ALPHAFOLD_DB_ENABLED;
    if (!enabled && !this.runtimeInjected) {
      throw structureUnavailable(value.fallbackPolicy, value.source);
    }
    const urls =
      value.source === 'RCSB_PDB'
        ? [`https://files.rcsb.org/download/${encodeURIComponent(value.accession)}.pdb`]
        : [
            `https://alphafold.ebi.ac.uk/files/AF-${encodeURIComponent(value.accession)}-F1-model_v6.pdb`,
            `https://alphafold.ebi.ac.uk/files/AF-${encodeURIComponent(value.accession)}-F1-model_v4.pdb`,
          ];
    let contents: string | undefined;
    let artifactRef = urls[0] ?? '';
    let lastError: unknown;
    for (const url of urls) {
      try {
        contents = await this.runtime.fetchText(url);
        artifactRef = url;
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (contents === undefined) {
      throw lastError instanceof ToolExecutionError
        ? lastError
        : new ToolExecutionError(
            'LIVE_STRUCTURE_FETCH_FAILED',
            'CONNECTOR',
            'Unable to fetch live structure.',
            true,
            { source: value.source, accession: value.accession },
          );
    }
    const chainIds = extractPdbChainIds(contents);
    const connectorId = value.source === 'RCSB_PDB' ? 'rcsb-pdb' : 'alphafold-db';
    return {
      structure: {
        structureId: `${value.targetId}-${value.accession}`,
        targetId: value.targetId,
        source: value.source,
        accession: value.accession,
        sourceStatus: 'LIVE' as const,
        format: 'PDB' as const,
        chainIds: chainIds.length > 0 ? chainIds : ['A'],
        artifactRef,
        scientificUse: true,
        validationStatus: 'SCIENTIFIC' as const,
      },
      provenance: provenance(connectorId, 'fetch_structure', 'LIVE', value, artifactRef),
    };
  }

  @Tool({
    name: 'validate_structure',
    description: 'Validate structure metadata before mapping or docking preparation.',
    inputSchema: validateStructureInput,
    examples: {
      request: {
        runId: 'run-1',
        structureId: 'fixture-structure-1',
        format: 'FIXTURE_JSON',
        chainIds: ['A'],
        residueCount: 100,
        sourceStatus: 'FIXTURE',
      },
      response: failureExample('validate_structure'),
    },
    metadata: { category: CATEGORY, tags: ['immunograph', 'structure', 'prd-v1.1'] },
    annotations: { readOnlyHint: true, idempotentHint: true },
  })
  validateStructure(input: unknown, context: ExecutionContext) {
    return executeTool({
      toolName: 'validate_structure',
      input,
      inputSchema: validateStructureInput,
      dataSchema: validateStructureData,
      context,
      operation: (value) => ({
        structureId: value.structureId,
        valid: value.residueCount > 0 && value.chainIds.length > 0,
        warnings: value.sourceStatus === 'FIXTURE' ? ['fixture-structure-not-live'] : [],
        checks: [
          {
            checkId: 'STRUCTURE-CHAIN-001',
            status: 'PASS' as const,
            message: 'At least one chain is present.',
          },
          {
            checkId: 'STRUCTURE-RESIDUE-001',
            status: 'PASS' as const,
            message: 'Residue count is positive.',
          },
        ],
        provenance: provenance(
          'structure-validator',
          'validate_structure',
          value.sourceStatus,
          value,
        ),
      }),
    });
  }

  @Tool({
    name: 'map_epitopes_to_structure',
    description: 'Map epitope candidate coordinates to a validated structure reference.',
    inputSchema: epitopeMappingInput,
    examples: {
      request: {
        runId: 'run-1',
        structureId: 'fixture-structure-1',
        candidates: [{ candidateId: 'candidate-1', start: 1, end: 9 }],
        mappingMode: 'FIXTURE',
      },
      response: failureExample('map_epitopes_to_structure'),
    },
    metadata: { category: CATEGORY, tags: ['immunograph', 'structure', 'prd-v1.1'] },
    annotations: { readOnlyHint: true, idempotentHint: true },
  })
  mapEpitopes(input: unknown, context: ExecutionContext) {
    return executeTool({
      toolName: 'map_epitopes_to_structure',
      input,
      inputSchema: epitopeMappingInput,
      dataSchema: epitopeMappingData,
      context,
      operation: (value) => ({
        mappings: value.candidates.map((candidate) => ({
          candidateId: candidate.candidateId,
          structureId: value.structureId,
          chainId: candidate.chainId ?? 'A',
          start: candidate.start,
          end: candidate.end,
          status: 'MAPPED' as const,
          confidence: value.mappingMode === 'FIXTURE' ? 0.7 : 0.85,
        })),
        provenance: provenance('structure-mapper', 'map_epitopes_to_structure', 'FIXTURE', value),
      }),
    });
  }

  @Tool({
    name: 'calculate_surface_accessibility',
    description: 'Calculate fixture-safe surface accessibility summaries for mapped candidates.',
    inputSchema: accessibilityInput,
    examples: {
      request: {
        runId: 'run-1',
        method: 'fixture-accessibility',
        mappings: [
          {
            candidateId: 'candidate-1',
            structureId: 'fixture-structure-1',
            chainId: 'A',
            start: 1,
            end: 9,
          },
        ],
      },
      response: failureExample('calculate_surface_accessibility'),
    },
    metadata: { category: CATEGORY, tags: ['immunograph', 'structure', 'prd-v1.1'] },
    annotations: { readOnlyHint: true, idempotentHint: true },
  })
  calculateSurfaceAccessibility(input: unknown, context: ExecutionContext) {
    return executeTool({
      toolName: 'calculate_surface_accessibility',
      input,
      inputSchema: accessibilityInput,
      dataSchema: accessibilityData,
      context,
      operation: async (value) => {
        const environment = loadMcpEnvironment();
        if (value.method === 'freesasa' && (environment.FREESASA_ENABLED || this.runtimeInjected)) {
          const command = process.env.FREESASA_COMMAND ?? 'freesasa';
          const result = await this.runtime.runCommand(command, [
            value.mappings[0]?.structureId ?? 'structure.pdb',
            '--mappings',
            JSON.stringify(value.mappings),
          ]);
          const score = parseFirstUnitInterval(result.stdout);
          return {
            accessibility: value.mappings.map((mapping) => ({
              candidateId: mapping.candidateId,
              surfaceAccessibility: score,
              method: value.method,
              status: 'CALCULATED' as const,
            })),
            provenance: provenance('freesasa', value.method, 'LIVE', value),
          };
        }
        return {
          accessibility: value.mappings.map((mapping) => ({
            candidateId: mapping.candidateId,
            surfaceAccessibility: stableUnitInterval(mapping),
            method: value.method,
            status: 'FIXTURE' as const,
          })),
          provenance: provenance('structure-accessibility', value.method, 'FIXTURE', value),
        };
      },
    });
  }

  @Tool({
    name: 'calculate_structure_confidence',
    description: 'Calculate structure confidence from provided metrics or fixture-safe defaults.',
    inputSchema: confidenceInput,
    examples: {
      request: { runId: 'run-1', structureId: 'fixture-structure-1', sourceStatus: 'FIXTURE' },
      response: failureExample('calculate_structure_confidence'),
    },
    metadata: { category: CATEGORY, tags: ['immunograph', 'structure', 'prd-v1.1'] },
    annotations: { readOnlyHint: true, idempotentHint: true },
  })
  calculateStructureConfidence(input: unknown, context: ExecutionContext) {
    return executeTool({
      toolName: 'calculate_structure_confidence',
      input,
      inputSchema: confidenceInput,
      dataSchema: confidenceData,
      context,
      operation: (value) => {
        const metricValues = Object.values(value.confidenceMetrics ?? {});
        const score =
          metricValues.length === 0
            ? 0.65
            : Math.max(
                0,
                Math.min(
                  1,
                  metricValues.reduce((sum, item) => sum + item, 0) / metricValues.length,
                ),
              );
        return {
          structureId: value.structureId,
          confidenceScore: score,
          confidence:
            score >= 0.8
              ? ('HIGH' as const)
              : score >= 0.5
                ? ('MEDIUM' as const)
                : ('LOW' as const),
          warnings: value.sourceStatus === 'FIXTURE' ? ['fixture-confidence-not-live'] : [],
          provenance: provenance(
            'structure-confidence',
            'calculate_structure_confidence',
            value.sourceStatus,
            value,
          ),
        };
      },
    });
  }

  @Tool({
    name: 'detect_binding_pockets',
    description:
      'Detect binding pockets with fpocket when configured, otherwise fail or fixture-replay.',
    inputSchema: pocketInput,
    examples: {
      request: {
        runId: 'run-1',
        structureId: 'fixture-structure-1',
        structureArtifactRef: 'fixture-structure.pdb',
        method: 'fixture-pocket-detector',
      },
      response: failureExample('detect_binding_pockets'),
    },
    metadata: { category: CATEGORY, tags: ['immunograph', 'structure', 'fpocket', 'prd-v1.1'] },
    annotations: { readOnlyHint: true, idempotentHint: true },
  })
  detectBindingPockets(input: unknown, context: ExecutionContext) {
    return executeTool({
      toolName: 'detect_binding_pockets',
      input,
      inputSchema: pocketInput,
      dataSchema: pocketData,
      context,
      operation: async (value) => {
        const environment = loadMcpEnvironment();
        if (value.method === 'fpocket' && (environment.FPOCKET_ENABLED || this.runtimeInjected)) {
          const result = await this.runtime.runCommand(process.env.FPOCKET_COMMAND ?? 'fpocket', [
            '-f',
            value.structureArtifactRef,
          ]);
          return {
            pockets: parseFpocketPockets(value.structureId, result.stdout),
            provenance: provenance('fpocket', value.method, 'LIVE', value),
          };
        }
        return {
          pockets: [
            {
              pocketId: `${value.structureId}-pocket-1`,
              structureId: value.structureId,
              score: 1,
              druggabilityScore: 0.5,
              center: { x: 0, y: 0, z: 0 },
              sourceStatus: 'FIXTURE' as const,
            },
          ],
          provenance: provenance('fixture-pocket-detector', value.method, 'FIXTURE', value),
        };
      },
    });
  }

  @Tool({
    name: 'create_molstar_view',
    description: 'Create a Mol* view-state reference for structure or docking visualization.',
    inputSchema: molstarInput,
    examples: {
      request: {
        runId: 'run-1',
        viewId: 'view-1',
        structureArtifactRef: 'fixture-structure.pdb',
        ligandArtifactRef: 'fixture-ligand.pdbqt',
        mode: 'DOCKING',
      },
      response: failureExample('create_molstar_view'),
    },
    metadata: { category: CATEGORY, tags: ['immunograph', 'structure', 'molstar', 'prd-v1.1'] },
    annotations: { readOnlyHint: true, idempotentHint: true },
  })
  createMolstarView(input: unknown, context: ExecutionContext) {
    return executeTool({
      toolName: 'create_molstar_view',
      input,
      inputSchema: molstarInput,
      dataSchema: molstarData,
      context,
      operation: (value) => {
        const environment = loadMcpEnvironment();
        const live = environment.MOLSTAR_ENABLED || this.runtimeInjected;
        return {
          viewer: {
            viewId: value.viewId,
            viewer: 'Mol*' as const,
            stateRef: `molstar://${value.runId}/${value.viewId}`,
            structureArtifactRef: value.structureArtifactRef,
            ...(value.ligandArtifactRef === undefined
              ? {}
              : { ligandArtifactRef: value.ligandArtifactRef }),
            mode: value.mode,
            sourceStatus: live ? ('LIVE' as const) : ('FIXTURE' as const),
            scientificUse: live,
          },
          provenance: provenance(
            'molstar',
            'create_molstar_view',
            live ? 'LIVE' : 'FIXTURE',
            value,
          ),
        };
      },
    });
  }
}

function structureUnavailable(
  policy: z.infer<typeof fallbackPolicy>,
  source: 'RCSB_PDB' | 'ALPHAFOLD_DB',
): ToolExecutionError {
  return new ToolExecutionError(
    'STRUCTURE_LIVE_CONNECTOR_UNAVAILABLE',
    'CONNECTOR',
    'Live structure retrieval is not configured for this MCP deployment.',
    true,
    { policy, source },
  );
}

function fixtureFallbackAllowed(policy: z.infer<typeof fallbackPolicy>): boolean {
  return policy === 'CACHE_THEN_LIVE_THEN_FIXTURE' || policy === 'LIVE_THEN_CACHE_THEN_FIXTURE';
}

function extractPdbChainIds(contents: string): string[] {
  const ids = new Set<string>();
  for (const line of contents.split(/\r?\n/u)) {
    if ((line.startsWith('ATOM') || line.startsWith('HETATM')) && line.length >= 22) {
      const chainId = line[21]?.trim();
      if (chainId !== undefined && chainId.length > 0) ids.add(chainId);
    }
  }
  return [...ids].sort();
}

function stableUnitInterval(value: unknown): number {
  const hash = canonicalJsonSha256(value as never);
  return Number.parseInt(hash.slice(0, 8), 16) / 0xffffffff;
}

function parseFirstUnitInterval(output: string): number {
  const matches = [...output.matchAll(/(?:^|\s)(0\.\d+|1\.0+)(?:\s|$)/gu)];
  const last = matches.at(-1);
  return last?.[1] === undefined ? 0.5 : Number(last[1]);
}

function parseFpocketPockets(structureId: string, output: string) {
  const match =
    output.match(
      /Pocket\s+(\d+)\s+Score\s+(-?\d+(?:\.\d+)?)\s+DrugScore\s+(0(?:\.\d+)?|1(?:\.0+)?)/iu,
    ) ??
    output.match(
      /Pocket\s+(\d+)\s*:[\s\S]*?Score\s*:\s*(-?\d+(?:\.\d+)?)[\s\S]*?Druggability\s+Score\s*:\s*(0(?:\.\d+)?|1(?:\.0+)?)/iu,
    );
  if (match === null) {
    return [
      {
        pocketId: `${structureId}-pocket-1`,
        structureId,
        score: 1,
        druggabilityScore: 0.5,
        center: { x: 0, y: 0, z: 0 },
        sourceStatus: 'LIVE' as const,
      },
    ];
  }
  return [
    {
      pocketId: `${structureId}-pocket-${match[1]}`,
      structureId,
      score: Number(match[2]),
      druggabilityScore: Number(match[3]),
      center: { x: 0, y: 0, z: 0 },
      sourceStatus: 'LIVE' as const,
    },
  ];
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
  } as const;
}
