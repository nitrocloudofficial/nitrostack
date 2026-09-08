import {
  canonicalJsonSha256,
  generatePeptides,
  predictSyntheticBinding,
  SYNTHETIC_BINDING_ALGORITHM,
  SYNTHETIC_BINDING_ALGORITHM_VERSION,
  validateFasta,
} from '../../lib/algorithms/index.js';
import { loadReferenceBundle } from '../../lib/database/mcp.js';
import { ControllerDecorator, ToolDecorator } from '@nitrostack/core';
import type { ExecutionContext } from '@nitrostack/core';
import { createHash } from 'node:crypto';
import type { z } from 'zod';

import type { CapabilityPort } from '../common/capability-port.js';
import { buildDefaultCapabilityPort } from '../common/default-capability-port.js';
import { executeTool, ToolExecutionError } from '../common/executor.js';
import {
  generatePeptidesContract,
  predictBcellContract,
  predictMhciContract,
  predictMhciiContract,
  predictSyntheticBindingContract,
  toolOptions,
  validateSequenceContract,
} from '../tool-contracts.js';

const CATEGORY = 'Prediction Tools';
const referenceBundle = loadReferenceBundle();

// otherwise — providing seamless offline/backup mode without code changes.
@ControllerDecorator()
export class PredictionController {
  private capabilities: CapabilityPort;

  constructor(capabilities: CapabilityPort = buildDefaultCapabilityPort()) {
    this.capabilities = capabilities;
  }

  useCapabilityPort(capabilities: CapabilityPort): this {
    this.capabilities = capabilities;
    return this;
  }

  @ToolDecorator(toolOptions(validateSequenceContract, CATEGORY))
  validateSequence(input: unknown, context: ExecutionContext) {
    return executeTool({
      toolName: validateSequenceContract.name,
      input,
      inputSchema: validateSequenceContract.inputSchema,
      dataSchema: validateSequenceContract.dataSchema,
      context,
      operation: async (validated) => {
        if (validated.fasta.trim().length === 0) {
          throw new ToolExecutionError('FASTA_EMPTY', 'VALIDATION', 'A FASTA record is required.');
        }
        const { aminoAcids, fastaRules } = await referenceBundle;
        const result = validateFasta(validated.fasta, {
          alphabet: aminoAcids.residues
            .filter(({ allowedInStrictProfile }) => allowedInStrictProfile)
            .map(({ oneLetter }) => oneLetter),
          maxBytes: fastaRules.maxBytes,
          maxResidues: fastaRules.maxResidues,
        });
        if (!result.ok) {
          const first = result.errors[0];
          const code =
            first?.code === 'FASTA_SEQUENCE_REQUIRED'
              ? 'FASTA_EMPTY'
              : first?.code === 'FASTA_INVALID_RESIDUE'
                ? 'INVALID_RESIDUE'
                : first?.code === 'FASTA_SEQUENCE_TOO_LONG'
                  ? 'SEQUENCE_TOO_LONG'
                  : (first?.code ?? 'FASTA_INVALID');
          throw new ToolExecutionError(
            code,
            'VALIDATION',
            first?.message ?? 'The FASTA record is invalid.',
            false,
            { errors: result.errors },
          );
        }
        return { ...result.value, warnings: [] };
      },
    });
  }

  @ToolDecorator(toolOptions(generatePeptidesContract, CATEGORY))
  generateCandidatePeptides(input: unknown, context: ExecutionContext) {
    return executeTool({
      toolName: generatePeptidesContract.name,
      input,
      inputSchema: generatePeptidesContract.inputSchema,
      dataSchema: generatePeptidesContract.dataSchema,
      context,
      operation: (validated) => ({
        candidates: generatePeptides(
          validated.sequence,
          validated.candidateType,
          validated.peptideLengths,
        ),
      }),
    });
  }

  @ToolDecorator(toolOptions(predictMhciContract, CATEGORY))
  predictMhci(input: unknown, context: ExecutionContext) {
    return this.invokeCapability(predictMhciContract, input, context);
  }

  @ToolDecorator(toolOptions(predictMhciiContract, CATEGORY))
  predictMhcii(input: unknown, context: ExecutionContext) {
    return this.invokeCapability(predictMhciiContract, input, context);
  }

  @ToolDecorator(toolOptions(predictBcellContract, CATEGORY))
  predictBcell(input: unknown, context: ExecutionContext) {
    return executeTool({
      toolName: predictBcellContract.name,
      input,
      inputSchema: predictBcellContract.inputSchema,
      dataSchema: predictBcellContract.dataSchema,
      context,
      operation: async (validated) => {
        const requestsGraphBepi = validated.methods.some(
          (method) => method.toLowerCase() === 'graphbepi',
        );
        const permitsFixtures = [
          'CACHE_THEN_LIVE_THEN_FIXTURE',
          'LIVE_THEN_CACHE_THEN_FIXTURE',
          'FIXTURE_ONLY',
        ].includes(validated.fallbackPolicy);
        if (requestsGraphBepi && !permitsFixtures) {
          throw new ToolExecutionError(
            'GRAPHBEPI_FIXTURE_REQUIRED',
            'SCIENTIFIC',
            'GraphBepi is fixture-only in MVP v1 and requires a fixture-permitting fallback policy.',
          );
        }
        const capability = requestsGraphBepi ? 'predict_bcell_fixture' : predictBcellContract.name;
        const result = (await this.capabilities.invoke(capability, validated)) as z.infer<
          typeof predictBcellContract.dataSchema
        >;
        if (
          requestsGraphBepi &&
          result.provenance.some((entry) => entry.status === 'LIVE' || entry.status === 'CACHED')
        ) {
          throw new ToolExecutionError(
            'GRAPHBEPI_PROVENANCE_INVALID',
            'CONNECTOR',
            'GraphBepi cannot return LIVE or CACHED provenance in MVP v1.',
          );
        }
        return result;
      },
    });
  }

  @ToolDecorator(toolOptions(predictSyntheticBindingContract, CATEGORY))
  predictSyntheticBindingTool(input: unknown, context: ExecutionContext) {
    return executeTool({
      toolName: predictSyntheticBindingContract.name,
      input,
      inputSchema: predictSyntheticBindingContract.inputSchema,
      dataSchema: predictSyntheticBindingContract.dataSchema,
      context,
      operation: (validated) => ({
        observations: predictSyntheticBinding(validated).map((observation) => ({
          ...observation,
          rawFields: {
            predictionSource: 'SYNTHETIC',
            scientificUse: false,
            validationStatus: 'DEMONSTRATION_ONLY',
            algorithm: SYNTHETIC_BINDING_ALGORITHM,
            algorithmVersion: SYNTHETIC_BINDING_ALGORITHM_VERSION,
          },
        })),
        provenance: {
          connectorId: 'immunograph-synthetic-predictor',
          connectorVersion: '1.0.0',
          method: validated.method,
          methodVersion: validated.methodVersion,
          status: 'SYNTHETIC' as const,
          sourceUri: 'https://immunograph.local/synthetic-predictor',
          parameters: { candidateType: validated.candidateType },
          predictionSource: 'SYNTHETIC' as const,
          scientificUse: false,
          validationStatus: 'DEMONSTRATION_ONLY' as const,
          algorithm: SYNTHETIC_BINDING_ALGORITHM,
          algorithmVersion: SYNTHETIC_BINDING_ALGORITHM_VERSION,
          datasetVersion: validated.datasetVersion,
          datasetHash: canonicalJsonSha256({
            datasetVersion: validated.datasetVersion,
            algorithm: SYNTHETIC_BINDING_ALGORITHM,
            algorithmVersion: SYNTHETIC_BINDING_ALGORITHM_VERSION,
          }),
        },
      }),
    });
  }

  private invokeCapability<TInput extends z.ZodTypeAny, TData extends z.ZodTypeAny>(
    contract: { name: string; inputSchema: TInput; dataSchema: TData },
    input: unknown,
    context: ExecutionContext,
  ) {
    return executeTool({
      toolName: contract.name,
      input,
      inputSchema: contract.inputSchema,
      dataSchema: contract.dataSchema,
      context,
      operation: async (validated) =>
        this.capabilities.invoke(contract.name, withDerivedProteinRef(validated)) as Promise<
          z.infer<TData>
        >,
    });
  }
}

function withDerivedProteinRef<T>(input: T): T {
  if (
    typeof input !== 'object' ||
    input === null ||
    !('sequence' in input) ||
    typeof input.sequence !== 'string' ||
    ('proteinRef' in input && typeof input.proteinRef === 'string' && input.proteinRef.length > 0)
  ) {
    return input;
  }
  return {
    ...input,
    proteinRef: createHash('sha256').update(input.sequence).digest('hex'),
  };
}

// Keep NitroStack's default module composition free of constructor dependencies.
Reflect.defineMetadata('design:paramtypes', [], PredictionController);
