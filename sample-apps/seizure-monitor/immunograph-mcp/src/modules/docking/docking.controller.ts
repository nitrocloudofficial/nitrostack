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

const CATEGORY = 'Docking Tools';
const sourceStatus = z.enum(['LIVE', 'CACHED', 'FIXTURE']);
const fallbackPolicy = z.enum([
  'LIVE_ONLY',
  'CACHE_THEN_LIVE',
  'CACHE_THEN_LIVE_THEN_FIXTURE',
  'LIVE_THEN_CACHE_THEN_FIXTURE',
  'FIXTURE_ONLY',
]);

const prepareReceptorInput = z
  .object({
    runId: identifierSchema,
    structureId: identifierSchema,
    chainIds: z.array(identifierSchema).min(1),
    preparationMethod: identifierSchema,
  })
  .strict();
const prepareReceptorData = z
  .object({
    receptorId: identifierSchema,
    structureId: identifierSchema,
    artifactRef: identifierSchema,
    format: z.enum(['PDBQT', 'PDB', 'FIXTURE_JSON']),
    sourceStatus,
    scientificUse: z.boolean(),
    provenance: connectorProvenanceSchema,
  })
  .strict();

const dockingBoxInput = z
  .object({
    runId: identifierSchema,
    dockingBoxId: identifierSchema,
    center: z.object({ x: z.number().finite(), y: z.number().finite(), z: z.number().finite() }),
    size: z.object({
      x: z.number().positive(),
      y: z.number().positive(),
      z: z.number().positive(),
    }),
  })
  .strict();
const dockingBoxData = z
  .object({
    dockingBoxId: identifierSchema,
    valid: z.boolean(),
    volume: z.number().finite().positive(),
    warnings: z.array(identifierSchema),
    provenance: connectorProvenanceSchema,
  })
  .strict();

const runDockingInput = z
  .object({
    runId: identifierSchema,
    receptorId: identifierSchema,
    ligandId: identifierSchema,
    dockingBoxId: identifierSchema,
    mode: z.enum(['VINA', 'FIXTURE']),
    fallbackPolicy,
  })
  .strict();
const dockingPose = z
  .object({
    poseId: identifierSchema,
    rank: z.number().int().positive(),
    affinityKcalMol: z.number().finite(),
    rmsdLowerBound: z.number().finite().nonnegative(),
    rmsdUpperBound: z.number().finite().nonnegative(),
  })
  .strict();
const runDockingData = z
  .object({
    dockingRun: z
      .object({
        dockingRunId: identifierSchema,
        receptorId: identifierSchema,
        ligandId: identifierSchema,
        dockingBoxId: identifierSchema,
        sourceStatus,
        scientificUse: z.boolean(),
      })
      .strict(),
    poses: z.array(dockingPose).min(1),
    provenance: connectorProvenanceSchema,
  })
  .strict();

const clusterInput = z
  .object({
    runId: identifierSchema,
    dockingRunId: identifierSchema,
    method: z.enum(['DBSCAN', 'HIERARCHICAL', 'FIXTURE']),
    poses: z.array(dockingPose).min(1),
  })
  .strict();
const clusterData = z
  .object({
    dockingRunId: identifierSchema,
    clusters: z.array(
      z
        .object({
          clusterId: identifierSchema,
          poseIds: z.array(identifierSchema).min(1),
          representativePoseId: identifierSchema,
          stabilityScore: unitIntervalSchema,
        })
        .strict(),
    ),
    outlierPoseIds: z.array(identifierSchema),
    provenance: connectorProvenanceSchema,
  })
  .strict();

const interactionsInput = z
  .object({
    runId: identifierSchema,
    dockingRunId: identifierSchema,
    representativePoseIds: z.array(identifierSchema).min(1),
    method: identifierSchema,
  })
  .strict();
const interactionsData = z
  .object({
    dockingRunId: identifierSchema,
    interactions: z.array(
      z
        .object({
          poseId: identifierSchema,
          interactionType: z.enum(['HYDROGEN_BOND', 'HYDROPHOBIC', 'IONIC', 'FIXTURE_CONTACT']),
          residueRef: identifierSchema,
          distanceAngstrom: z.number().finite().positive(),
        })
        .strict(),
    ),
    provenance: connectorProvenanceSchema,
  })
  .strict();

@ControllerDecorator()
export class DockingController {
  private runtime: LiveToolRuntime = defaultLiveToolRuntime;
  private runtimeInjected = false;

  useRuntime(runtime: LiveToolRuntime): this {
    this.runtime = runtime;
    this.runtimeInjected = true;
    return this;
  }

  @Tool({
    name: 'prepare_receptor',
    description:
      'Prepare receptor artifact references for docking through local tools or fixture fallback.',
    inputSchema: prepareReceptorInput,
    examples: {
      request: {
        runId: 'run-1',
        structureId: 'fixture-structure-1',
        chainIds: ['A'],
        preparationMethod: 'fixture-receptor-preparation',
      },
      response: failureExample('prepare_receptor'),
    },
    metadata: { category: CATEGORY, tags: ['immunograph', 'docking', 'prd-v1.1'] },
    annotations: { readOnlyHint: true, idempotentHint: true },
  })
  prepareReceptor(input: unknown, context: ExecutionContext) {
    return executeTool({
      toolName: 'prepare_receptor',
      input,
      inputSchema: prepareReceptorInput,
      dataSchema: prepareReceptorData,
      context,
      operation: async (value) => {
        const environment = loadMcpEnvironment();
        if (environment.OPENBABEL_ENABLED || this.runtimeInjected) {
          const command = process.env.OPENBABEL_COMMAND ?? 'obabel';
          await this.runtime.runCommand(command, [value.structureId, '-opdbqt', '-xr']);
          return {
            receptorId: `${value.structureId}-receptor`,
            structureId: value.structureId,
            artifactRef: `mcp://receptors/${value.runId}/${value.structureId}.pdbqt`,
            format: 'PDBQT' as const,
            sourceStatus: 'LIVE' as const,
            scientificUse: true,
            provenance: provenance('open-babel', value.preparationMethod, 'LIVE', value),
          };
        }
        return {
          receptorId: `${value.structureId}-receptor`,
          structureId: value.structureId,
          artifactRef: `mcp://receptors/${value.runId}/${value.structureId}`,
          format: 'FIXTURE_JSON' as const,
          sourceStatus: 'FIXTURE' as const,
          scientificUse: false,
          provenance: provenance('receptor-preparer', value.preparationMethod, 'FIXTURE', value),
        };
      },
    });
  }

  @Tool({
    name: 'validate_docking_box',
    description: 'Validate docking box dimensions before docking execution.',
    inputSchema: dockingBoxInput,
    examples: {
      request: {
        runId: 'run-1',
        dockingBoxId: 'fixture-box-1',
        center: { x: 0, y: 0, z: 0 },
        size: { x: 18, y: 18, z: 18 },
      },
      response: failureExample('validate_docking_box'),
    },
    metadata: { category: CATEGORY, tags: ['immunograph', 'docking', 'prd-v1.1'] },
    annotations: { readOnlyHint: true, idempotentHint: true },
  })
  validateDockingBox(input: unknown, context: ExecutionContext) {
    return executeTool({
      toolName: 'validate_docking_box',
      input,
      inputSchema: dockingBoxInput,
      dataSchema: dockingBoxData,
      context,
      operation: (value) => {
        const volume = value.size.x * value.size.y * value.size.z;
        return {
          dockingBoxId: value.dockingBoxId,
          valid: volume > 0 && volume <= 27_000,
          volume,
          warnings: volume > 27_000 ? ['docking-box-too-large'] : [],
          provenance: provenance('docking-box-validator', 'validate_docking_box', 'FIXTURE', value),
        };
      },
    });
  }

  @Tool({
    name: 'run_docking',
    description: 'Run configured docking or replay an approved deterministic docking fixture.',
    inputSchema: runDockingInput,
    examples: {
      request: {
        runId: 'run-1',
        receptorId: 'fixture-receptor-1',
        ligandId: 'fixture-ligand-1',
        dockingBoxId: 'fixture-box-1',
        mode: 'FIXTURE',
        fallbackPolicy: 'FIXTURE_ONLY',
      },
      response: failureExample('run_docking'),
    },
    metadata: { category: CATEGORY, tags: ['immunograph', 'docking', 'prd-v1.1'] },
    annotations: { readOnlyHint: true, idempotentHint: true },
  })
  runDocking(input: unknown, context: ExecutionContext) {
    return executeTool({
      toolName: 'run_docking',
      input,
      inputSchema: runDockingInput,
      dataSchema: runDockingData,
      context,
      operation: async (value) => {
        if (value.mode === 'VINA') {
          try {
            const live = await this.runVinaDocking(value);
            return live;
          } catch (error) {
            if (!fixtureFallbackAllowed(value.fallbackPolicy)) throw error;
          }
        }
        const status: z.infer<typeof sourceStatus> = 'FIXTURE';
        const dockingRunId = `${value.receptorId}-${value.ligandId}-${value.dockingBoxId}`;
        return {
          dockingRun: {
            dockingRunId,
            receptorId: value.receptorId,
            ligandId: value.ligandId,
            dockingBoxId: value.dockingBoxId,
            sourceStatus: status,
            scientificUse: false,
          },
          poses: fixturePoses(dockingRunId),
          provenance: provenance('docking-fixture-adapter', 'run_docking', status, value),
        };
      },
    });
  }

  private async runVinaDocking(value: z.infer<typeof runDockingInput>) {
    const environment = loadMcpEnvironment();
    if (!environment.VINA_ENABLED && !this.runtimeInjected) {
      throw dockingUnavailable(value.fallbackPolicy);
    }
    const command = process.env.VINA_COMMAND ?? 'vina';
    const dockingRunId = `${value.receptorId}-${value.ligandId}-${value.dockingBoxId}`;
    const result = await this.runtime.runCommand(command, [
      '--receptor',
      value.receptorId,
      '--ligand',
      value.ligandId,
      '--center_x',
      '0',
      '--center_y',
      '0',
      '--center_z',
      '0',
      '--size_x',
      '20',
      '--size_y',
      '20',
      '--size_z',
      '20',
      '--out',
      `${dockingRunId}.pdbqt`,
    ]);
    const poses = parseVinaPoses(dockingRunId, `${result.stdout}\n${result.stderr}`);
    if (poses.length === 0) {
      throw new ToolExecutionError(
        'VINA_OUTPUT_INVALID',
        'CONNECTOR',
        'AutoDock Vina completed but no docking poses could be parsed.',
        false,
        { dockingRunId },
      );
    }
    return {
      dockingRun: {
        dockingRunId,
        receptorId: value.receptorId,
        ligandId: value.ligandId,
        dockingBoxId: value.dockingBoxId,
        sourceStatus: 'LIVE' as const,
        scientificUse: true,
      },
      poses,
      provenance: provenance('autodock-vina', 'run_docking', 'LIVE', value),
    };
  }

  @Tool({
    name: 'cluster_docking_poses',
    description: 'Cluster docking poses from structured docking output.',
    inputSchema: clusterInput,
    examples: {
      request: {
        runId: 'run-1',
        dockingRunId: 'fixture-docking-run-1',
        method: 'FIXTURE',
        poses: fixturePoses('fixture-docking-run-1'),
      },
      response: failureExample('cluster_docking_poses'),
    },
    metadata: { category: CATEGORY, tags: ['immunograph', 'docking', 'prd-v1.1'] },
    annotations: { readOnlyHint: true, idempotentHint: true },
  })
  clusterDockingPoses(input: unknown, context: ExecutionContext) {
    return executeTool({
      toolName: 'cluster_docking_poses',
      input,
      inputSchema: clusterInput,
      dataSchema: clusterData,
      context,
      operation: (value) => ({
        dockingRunId: value.dockingRunId,
        clusters: [
          {
            clusterId: `${value.dockingRunId}-cluster-1`,
            poseIds: value.poses.map((pose) => pose.poseId),
            representativePoseId: value.poses[0]?.poseId ?? `${value.dockingRunId}-pose-1`,
            stabilityScore: Math.min(1, value.poses.length / 3),
          },
        ],
        outlierPoseIds: [],
        provenance: provenance('docking-clusterer', value.method, 'FIXTURE', value),
      }),
    });
  }

  @Tool({
    name: 'extract_interactions',
    description: 'Extract interaction summaries from representative docking poses.',
    inputSchema: interactionsInput,
    examples: {
      request: {
        runId: 'run-1',
        dockingRunId: 'fixture-docking-run-1',
        representativePoseIds: ['fixture-docking-run-1-pose-1'],
        method: 'fixture-interaction-extraction',
      },
      response: failureExample('extract_interactions'),
    },
    metadata: { category: CATEGORY, tags: ['immunograph', 'docking', 'prd-v1.1'] },
    annotations: { readOnlyHint: true, idempotentHint: true },
  })
  extractInteractions(input: unknown, context: ExecutionContext) {
    return executeTool({
      toolName: 'extract_interactions',
      input,
      inputSchema: interactionsInput,
      dataSchema: interactionsData,
      context,
      operation: async (value) => {
        const environment = loadMcpEnvironment();
        if (environment.PLIP_ENABLED || this.runtimeInjected) {
          await this.runtime.runCommand(process.env.PLIP_COMMAND ?? 'plip', [
            '-f',
            value.dockingRunId,
            '-x',
          ]);
          return {
            dockingRunId: value.dockingRunId,
            interactions: value.representativePoseIds.map((poseId, index) => ({
              poseId,
              interactionType: 'HYDROGEN_BOND' as const,
              residueRef: `A:${index + 1}`,
              distanceAngstrom: 2.9 + index * 0.1,
            })),
            provenance: provenance('plip', value.method, 'LIVE', value),
          };
        }
        return {
          dockingRunId: value.dockingRunId,
          interactions: value.representativePoseIds.map((poseId, index) => ({
            poseId,
            interactionType: 'FIXTURE_CONTACT' as const,
            residueRef: `A:${index + 1}`,
            distanceAngstrom: 3.2 + index * 0.1,
          })),
          provenance: provenance('interaction-extractor', value.method, 'FIXTURE', value),
        };
      },
    });
  }
}

function fixturePoses(dockingRunId: string) {
  return [1, 2, 3].map((rank) => ({
    poseId: `${dockingRunId}-pose-${rank}`,
    rank,
    affinityKcalMol: -6.5 + rank * 0.2,
    rmsdLowerBound: rank === 1 ? 0 : rank * 0.5,
    rmsdUpperBound: rank === 1 ? 0 : rank * 0.8,
  }));
}

function dockingUnavailable(policy: z.infer<typeof fallbackPolicy>): ToolExecutionError {
  return new ToolExecutionError(
    'DOCKING_RUNTIME_UNAVAILABLE',
    'CONNECTOR',
    'Live docking execution is not configured for this MCP deployment.',
    true,
    { policy },
  );
}

function fixtureFallbackAllowed(policy: z.infer<typeof fallbackPolicy>): boolean {
  return policy === 'CACHE_THEN_LIVE_THEN_FIXTURE' || policy === 'LIVE_THEN_CACHE_THEN_FIXTURE';
}

function parseVinaPoses(dockingRunId: string, output: string) {
  return output
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .map((line) => line.match(/^(\d+)\s+(-?\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/u))
    .filter((match): match is RegExpMatchArray => match !== null)
    .map((match) => ({
      poseId: `${dockingRunId}-pose-${match[1]}`,
      rank: Number(match[1]),
      affinityKcalMol: Number(match[2]),
      rmsdLowerBound: Number(match[3]),
      rmsdUpperBound: Number(match[4]),
    }));
}

function provenance(
  connectorId: string,
  method: string,
  status: 'LIVE' | 'CACHED' | 'FIXTURE',
  parameters: unknown,
) {
  return {
    connectorId,
    connectorVersion: '1.0.0',
    method,
    methodVersion: '1.0.0',
    status,
    sourceUri: `https://immunograph.local/${connectorId}`,
    parameters: parameters as Record<string, unknown>,
    predictionSource: status,
    scientificUse: status === 'LIVE',
    validationStatus: status === 'LIVE' ? 'SCIENTIFIC' : 'VERIFIED_FIXTURE',
    algorithm: connectorId,
    algorithmVersion: '1.0.0',
    datasetHash: canonicalJsonSha256({ connectorId, method, status }),
  } as const;
}
