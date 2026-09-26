import { createHash } from 'node:crypto';

import { explainCandidate } from '../../lib/algorithms/index.js';
import { ControllerDecorator, ToolDecorator } from '@nitrostack/core';
import type { ExecutionContext } from '@nitrostack/core';
import type { z } from 'zod';

import type { CapabilityPort } from '../common/capability-port.js';
import { unavailableCapabilityPort } from '../common/capability-port.js';
import { executeTool } from '../common/executor.js';
import { buildStoredZip, type ZipFileEntry } from '../common/zip.js';
import { describeAgenticWorkflow } from '../orchestration/agent-manifest.js';
import { runLangGraphAgentWorkflow } from '../orchestration/langgraph-agent-runtime.js';
import { generateGroundedLlmText } from '../orchestration/llm-provider.js';
import {
  chatWithResearchAgentContract,
  describeAgenticWorkflowContract,
  explainCandidateContract,
  exportCandidatesContract,
  exportResearchPackageContract,
  exportTraceContract,
  generateReportContract,
  runAgenticWorkflowContract,
  toolOptions,
  visualizeResultsContract,
} from '../tool-contracts.js';

const CATEGORY = 'Report / Export Tools';

@ControllerDecorator()
export class ReportController {
  private capabilities: CapabilityPort = unavailableCapabilityPort;

  useCapabilityPort(capabilities: CapabilityPort): this {
    this.capabilities = capabilities;
    return this;
  }

  @ToolDecorator(toolOptions(generateReportContract, CATEGORY))
  generateReport(input: unknown, context: ExecutionContext) {
    return executeTool({
      toolName: generateReportContract.name,
      input,
      inputSchema: generateReportContract.inputSchema,
      dataSchema: generateReportContract.dataSchema,
      context,
      operation: async (validated) => {
        if (validated.reportSnapshot === undefined) {
          return this.capabilities.invoke(generateReportContract.name, validated) as Promise<
            z.infer<typeof generateReportContract.dataSchema>
          >;
        }
        const snapshot = validated.reportSnapshot;
        const artifacts = validated.outputFormats.map((format) => {
          const contents =
            format === 'CSV'
              ? reportCsv(snapshot.candidates, snapshot.disclaimer)
              : JSON.stringify(
                  {
                    schemaVersion: 'immunograph-report.v1',
                    runId: validated.runId,
                    executionMode: snapshot.executionMode,
                    runQuality: snapshot.runQuality,
                    scientificUse: snapshot.scientificUse,
                    disclaimer: snapshot.disclaimer,
                    candidates: snapshot.candidates,
                  },
                  null,
                  2,
                );
          const bytes = Buffer.from(contents, 'utf8');
          return {
            artifactId: `${validated.runId}-${format.toLowerCase()}`,
            mediaType: format === 'CSV' ? 'text/csv' : 'application/json',
            sha256: createHash('sha256').update(bytes).digest('hex'),
            byteLength: bytes.byteLength,
            reference: `mcp://reports/${validated.runId}/${format.toLowerCase()}`,
            contentBase64: bytes.toString('base64'),
          };
        });
        return {
          artifacts,
          disclaimer: snapshot.disclaimer,
          provenanceSummary: {
            executionMode: snapshot.executionMode,
            scientificUse: snapshot.scientificUse,
            generatedBy: 'NitroStack MCP generate_report',
          },
          runQuality: snapshot.runQuality,
        };
      },
    });
  }

  @ToolDecorator(toolOptions(exportCandidatesContract, CATEGORY))
  exportCandidates(input: unknown, context: ExecutionContext) {
    return this.invokeCapability(exportCandidatesContract, input, context);
  }

  @ToolDecorator(toolOptions(visualizeResultsContract, CATEGORY))
  visualizeResults(input: unknown, context: ExecutionContext) {
    return this.invokeCapability(visualizeResultsContract, input, context);
  }

  @ToolDecorator(toolOptions(explainCandidateContract, CATEGORY))
  explain(input: unknown, context: ExecutionContext) {
    return executeTool({
      toolName: explainCandidateContract.name,
      input,
      inputSchema: explainCandidateContract.inputSchema,
      dataSchema: explainCandidateContract.dataSchema,
      context,
      operation: async (validated) => {
        const deterministic = explainCandidate({
          audience: validated.audience,
          candidateKey: validated.candidateKey,
          category: validated.category,
          trackRank: validated.trackRank,
          finalScore: validated.finalScore,
          componentScores: validated.componentScores,
          ruleOutcomes: validated.ruleOutcomes,
          provenanceStatuses: validated.provenanceStatuses,
        });
        if (validated.explanationMode === 'DETERMINISTIC') {
          return { deterministic, llmParaphrase: null };
        }
        try {
          const response = await this.capabilities.invoke('explain_candidate_llm_paraphrase', {
            runId: validated.runId,
            audience: validated.audience,
            deterministic,
          });
          return {
            deterministic,
            llmParaphrase:
              typeof response === 'string' && response.trim().length > 0 ? response : null,
          };
        } catch {
          context.logger.warn('mcp.tool.optional_paraphrase_unavailable', {
            requestId: context.requestId,
            runId: validated.runId,
            toolName: explainCandidateContract.name,
          });
          return { deterministic, llmParaphrase: null };
        }
      },
    });
  }

  @ToolDecorator(toolOptions(exportTraceContract, CATEGORY))
  exportWorkflowTrace(input: unknown, context: ExecutionContext) {
    return this.invokeCapability(exportTraceContract, input, context);
  }

  @ToolDecorator(toolOptions(describeAgenticWorkflowContract, CATEGORY))
  describeAgenticWorkflow(input: unknown, context: ExecutionContext) {
    return executeTool({
      toolName: describeAgenticWorkflowContract.name,
      input,
      inputSchema: describeAgenticWorkflowContract.inputSchema,
      dataSchema: describeAgenticWorkflowContract.dataSchema,
      context,
      operation: (validated) => describeAgenticWorkflow(validated),
    });
  }

  @ToolDecorator(toolOptions(runAgenticWorkflowContract, CATEGORY))
  runAgenticWorkflow(input: unknown, context: ExecutionContext) {
    return executeTool({
      toolName: runAgenticWorkflowContract.name,
      input,
      inputSchema: runAgenticWorkflowContract.inputSchema,
      dataSchema: runAgenticWorkflowContract.dataSchema,
      context,
      operation: runLangGraphAgentWorkflow,
    });
  }

  @ToolDecorator(toolOptions(chatWithResearchAgentContract, CATEGORY))
  chatWithResearchAgent(input: unknown, context: ExecutionContext) {
    return executeTool({
      toolName: chatWithResearchAgentContract.name,
      input,
      inputSchema: chatWithResearchAgentContract.inputSchema,
      dataSchema: chatWithResearchAgentContract.dataSchema,
      context,
      operation: async (validated) => {
        const evidenceKeys = Object.keys(validated.evidenceSummary).sort();
        const grounded = evidenceKeys.length > 0;
        const llm =
          validated.agentMode === 'LLM' && grounded
            ? await generateGroundedLlmText({
                purpose: 'RESEARCH_CHAT',
                prompt: validated.question,
                evidence: Object.fromEntries(
                  Object.entries(validated.evidenceSummary).map(([key, value]) => [
                    key,
                    typeof value === 'string' ? value : JSON.stringify(value),
                  ]),
                ),
              })
            : { used: false, text: null, warning: null };
        const answer =
          evidenceKeys.length === 0
            ? 'I do not have stored evidence for this question, so I must abstain rather than infer scientific facts.'
            : (llm.text ??
              `Grounded answer from stored ImmunoGraph evidence: ${evidenceKeys.join(', ')}. Scientific values must be interpreted only with their recorded provenance.`);
        return {
          answer,
          grounded,
          citedEvidenceKeys: evidenceKeys,
          limitations: [
            ...(llm.warning === null ? [] : [llm.warning]),
            'LLM/chat responses cannot create new scientific facts.',
            'Use exported reports and provenance records for scientific review.',
          ],
          agentMode: validated.agentMode,
          llmUsed: llm.used,
        };
      },
    });
  }

  @ToolDecorator(toolOptions(exportResearchPackageContract, CATEGORY))
  exportResearchPackage(input: unknown, context: ExecutionContext) {
    return executeTool({
      toolName: exportResearchPackageContract.name,
      input,
      inputSchema: exportResearchPackageContract.inputSchema,
      dataSchema: exportResearchPackageContract.dataSchema,
      context,
      operation: (validated) => {
        const requiredSections = researchPackageSections({
          includeStructure: validated.includeStructure,
          includeChemistry: validated.includeChemistry,
          includeDocking: validated.includeDocking,
        });
        const zip = createMcpResearchPackageZip({
          runId: validated.runId,
          idempotencyKey: validated.idempotencyKey,
          packageSnapshot: validated.packageSnapshot,
          requiredSections,
          includeAgentTrace: validated.includeAgentTrace,
          includeStructure: validated.includeStructure,
          includeChemistry: validated.includeChemistry,
          includeDocking: validated.includeDocking,
        });
        return {
          artifact: {
            artifactId: `${validated.runId}-research-package`,
            mediaType: 'application/zip',
            sha256: createHash('sha256').update(zip).digest('hex'),
            byteLength: zip.byteLength,
            reference: `mcp://research-packages/${validated.runId}/research-package.zip`,
            contentBase64: zip.toString('base64'),
          },
          requiredSections,
          includesCsvExports: true as const,
          includesAgentTrace: validated.includeAgentTrace,
        };
      },
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
        this.capabilities.invoke(contract.name, validated) as Promise<z.infer<TData>>,
    });
  }
}

function researchPackageSections(options: {
  includeStructure: boolean;
  includeChemistry: boolean;
  includeDocking: boolean;
}): string[] {
  return [
          'manifest.json',
          'project.json',
          'run.json',
          'configuration.json',
          'inputs/',
          'predictions/',
          'candidates/',
    ...(options.includeStructure ? ['structure/'] : []),
    ...(options.includeChemistry ? ['compounds/'] : []),
    ...(options.includeDocking ? ['docking/'] : []),
          'construct/',
          'evidence/',
          'reports/',
          'checksums.json',
  ];
}

function reportCsv(rows: Array<Record<string, unknown>>, disclaimer: string): string {
  const columns = [
    'rank',
    'track',
    'peptide',
    'start',
    'end',
    'allele',
    'finalScore',
    'category',
    'sourceStatus',
    'scientificUse',
  ];
  const quote = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  return `# ${disclaimer}\n${columns.join(',')}\n${rows
    .map((row) => columns.map((column) => quote(row[column])).join(','))
    .join('\n')}\n`;
}

function createMcpResearchPackageZip(input: {
  runId: string;
  idempotencyKey: string;
  packageSnapshot: ResearchPackageSnapshot | undefined;
  requiredSections: string[];
  includeAgentTrace: boolean;
  includeStructure: boolean;
  includeChemistry: boolean;
  includeDocking: boolean;
}): Buffer {
  const generatedAt = '2026-07-24T00:00:00.000Z';
  const snapshot = input.packageSnapshot;
  const files: ZipFileEntry[] = [
    jsonEntry('project.json', {
      schemaVersion: 'immunograph-project.v1',
      source: 'MCP_EXPORT',
      runId: input.runId,
      name: 'MCP-generated research package',
      ...snapshot?.project,
    }),
    jsonEntry('run.json', {
      schemaVersion: 'immunograph-run.v1',
      runId: input.runId,
      executionMode: 'MCP_AGENTIC_EXPORT',
      scientificUse: false,
      generatedBy: 'One NitroStack MCP App',
      ...snapshot?.run,
    }),
    jsonEntry('configuration.json', {
      schemaVersion: 'immunograph-configuration.v1',
      idempotencyKey: input.idempotencyKey,
      includeAgentTrace: input.includeAgentTrace,
      includeStructure: input.includeStructure,
      includeChemistry: input.includeChemistry,
      includeDocking: input.includeDocking,
      ...snapshot?.configuration,
    }),
    textEntry(
      'inputs/original-fasta.fasta',
      snapshot?.originalFasta ??
        '>mcp-export-placeholder\nSEQUENCE_NOT_INCLUDED_IN_STATELESS_MCP_EXPORT\n',
    ),
    jsonEntry('inputs/normalized-sequence.json', {
      schemaVersion: 'immunograph-normalized-sequence.v1',
      runId: input.runId,
      status: 'NOT_INCLUDED_IN_STATELESS_MCP_EXPORT',
      ...snapshot?.normalizedSequence,
    }),
    jsonEntry('inputs/input-checksums.json', {
      schemaVersion: 'immunograph-input-checksums.v1',
      runId: input.runId,
      checksums: {},
      ...snapshot?.inputChecksums,
    }),
    jsonEntry(
      'predictions/mhci.json',
      snapshot?.predictions?.mhci ?? predictionPlaceholder(input.runId, 'MHCI'),
    ),
    jsonEntry(
      'predictions/mhcii.json',
      snapshot?.predictions?.mhcii ?? predictionPlaceholder(input.runId, 'MHCII'),
    ),
    jsonEntry(
      'predictions/bcell.json',
      snapshot?.predictions?.bcell ?? predictionPlaceholder(input.runId, 'BCELL'),
    ),
    jsonEntry(
      'predictions/population-coverage.json',
      snapshot?.predictions?.populationCoverage ?? {
        schemaVersion: 'immunograph-population-coverage.v1',
        runId: input.runId,
        coverage: [],
      },
    ),
    jsonEntry(
      'predictions/connector-provenance.json',
      snapshot?.predictions?.connectorProvenance ?? {
        schemaVersion: 'immunograph-connector-provenance.v1',
        runId: input.runId,
        connectors: [],
        note: 'Detailed connector records are provided by persisted API exports when run state is available.',
      },
    ),
    jsonEntry('candidates/ranked-candidates.json', snapshot?.candidates?.ranked ?? []),
    jsonEntry('candidates/shortlisted-candidates.json', snapshot?.candidates?.shortlisted ?? []),
    jsonEntry('candidates/rejected-candidates.json', snapshot?.candidates?.rejected ?? []),
    jsonEntry(
      'candidates/candidate-evidence-links.json',
      snapshot?.candidates?.evidenceLinks ?? [],
    ),
    textEntry(
      'candidates/candidates.csv',
      snapshot?.candidates?.csv ??
        'rank,track,peptide,start,end,allele,finalScore,category,sourceStatus,scientificUse\n',
    ),
    jsonEntry(
      'structure/structures.json',
      snapshot?.structure?.structures ?? {
        schemaVersion: 'immunograph-structures.v1',
        runId: input.runId,
        structures: [],
      },
    ),
    jsonEntry(
      'structure/epitope-structure-map.json',
      snapshot?.structure?.epitopeStructureMap ?? {
        schemaVersion: 'immunograph-epitope-structure-map.v1',
        runId: input.runId,
        mappings: [],
      },
    ),
    jsonEntry(
      'structure/surface-accessibility.json',
      snapshot?.structure?.surfaceAccessibility ?? {
        schemaVersion: 'immunograph-surface-accessibility.v1',
        runId: input.runId,
        mappings: [],
      },
    ),
    jsonEntry(
      'structure/structure-confidence.json',
      snapshot?.structure?.structureConfidence ?? {
        schemaVersion: 'immunograph-structure-confidence.v1',
        runId: input.runId,
        confidence: [],
      },
    ),
    jsonEntry(
      'compounds/compounds.json',
      snapshot?.compounds?.compounds ?? {
        schemaVersion: 'immunograph-compounds.v1',
        runId: input.runId,
        compounds: [],
      },
    ),
    jsonEntry(
      'compounds/descriptors.json',
      snapshot?.compounds?.descriptors ?? {
        schemaVersion: 'immunograph-compound-descriptors.v1',
        runId: input.runId,
        descriptors: [],
      },
    ),
    jsonEntry(
      'compounds/ligand-preparation.json',
      snapshot?.compounds?.ligandPreparation ?? {
        schemaVersion: 'immunograph-ligand-preparation.v1',
        runId: input.runId,
        ligands: [],
      },
    ),
    textEntry(
      'docking/receptor.pdbqt',
      snapshot?.docking?.receptorPdbqt ??
        'REMARK receptor not included in stateless MCP export\n',
    ),
    textEntry(
      'docking/ligand.pdbqt',
      snapshot?.docking?.ligandPdbqt ?? 'REMARK ligand not included in stateless MCP export\n',
    ),
    textEntry(
      'docking/docking-output.pdbqt',
      snapshot?.docking?.dockingOutputPdbqt ??
        'REMARK docking output not included in stateless MCP export\n',
    ),
    jsonEntry(
      'docking/docking-poses.json',
      snapshot?.docking?.dockingPoses ?? {
        schemaVersion: 'immunograph-docking-poses.v1',
        runId: input.runId,
        poses: [],
      },
    ),
    jsonEntry(
      'docking/docking-summary.json',
      snapshot?.docking?.dockingSummary ?? {
        schemaVersion: 'immunograph-docking-summary.v1',
        runId: input.runId,
        status: 'NOT_INCLUDED_IN_STATELESS_MCP_EXPORT',
      },
    ),
    jsonEntry(
      'docking/docking-provenance.json',
      snapshot?.docking?.dockingProvenance ?? {
        schemaVersion: 'immunograph-docking-provenance.v1',
        runId: input.runId,
        connectorId: 'unassigned',
        status: 'ABSTAINED',
      },
    ),
    binaryEntry(
      'docking/docking-view.png',
      snapshot?.docking?.dockingViewPngBase64 ?? TRANSPARENT_PIXEL_PNG_BASE64,
    ),
    textEntry(
      'construct/construct.fasta',
      snapshot?.construct?.fasta ?? `>construct_${input.runId}\n\n`,
    ),
    jsonEntry('construct/construct.json', {
      schemaVersion: 'immunograph-construct.v1',
      runId: input.runId,
      status: 'NOT_GENERATED_IN_STATELESS_MCP_EXPORT',
      ...snapshot?.construct?.json,
    }),
    jsonEntry(
      'construct/construct-optimization.json',
      snapshot?.construct?.optimization ?? {
        schemaVersion: 'immunograph-construct-optimization.v1',
        runId: input.runId,
        status: 'NOT_GENERATED_IN_STATELESS_MCP_EXPORT',
      },
    ),
    jsonEntry('evidence/evidence-graph.json', {
      schemaVersion: 'immunograph-evidence-graph.v1',
      runId: input.runId,
      nodes: [],
      edges: [],
      ...snapshot?.evidence?.evidenceGraph,
    }),
    jsonEntry('evidence/workflow-trace.json', {
      schemaVersion: 'immunograph-workflow-trace.v1',
      runId: input.runId,
      runtime: 'LANGGRAPH',
      agentTraceIncluded: input.includeAgentTrace,
      ...snapshot?.evidence?.workflowTrace,
    }),
    jsonEntry(
      'evidence/agent-trace.json',
      snapshot?.evidence?.agentTrace ?? {
        schemaVersion: 'immunograph-agent-trace.v1',
        runId: input.runId,
        steps: [],
      },
    ),
    jsonEntry('evidence/approvals.json', snapshot?.evidence?.approvals ?? []),
    jsonEntry('evidence/audit-events.json', snapshot?.evidence?.auditEvents ?? []),
    textEntry(
      'reports/summary.md',
      snapshot?.reports?.summaryMarkdown ??
        `# ImmunoGraph Research Package\n\nRun: ${input.runId}\n\nThis MCP-exported package is generated by the bounded agent workflow. Scientific values are not invented by the LLM.\n`,
    ),
    jsonEntry(
      'reports/report.json',
      snapshot?.reports?.report ?? {
        schemaVersion: 'immunograph-report.v1',
        runId: input.runId,
        generatedAt,
        generatedBy: 'NitroStack MCP export_research_package',
        limitations: [
          'This stateless MCP export preserves the required package structure.',
          'Persisted API exports include full run-specific database records when available.',
        ],
      },
    ),
    textEntry(
      'reports/limitations.md',
      snapshot?.reports?.limitationsMarkdown ??
        '# Limitations\n\nThis package is a computational research artifact. It is not clinical validation, treatment advice, or experimental evidence.\n',
    ),
    textEntry(
      'reports/report.csv',
      snapshot?.reports?.reportCsv ??
        'rank,track,peptide,start,end,allele,finalScore,category,sourceStatus,scientificUse\n',
    ),
  ];

  const checksums = Object.fromEntries(files.map((file) => [file.path, sha256(file.data)]));
  const manifest = jsonEntry('manifest.json', {
    schemaVersion: 'immunograph-research-package.v1.1',
    packageName: 'research-package.zip',
    generatedAt,
    runId: input.runId,
    requiredSections: input.requiredSections,
    includesCsvExports: true,
    includesAgentTrace: input.includeAgentTrace,
    generatedBy: 'NitroStack MCP export_research_package',
    files: files.map((file) => ({
      path: file.path,
      sha256: checksums[file.path],
      byteLength: file.data.byteLength,
    })),
  });
  const checksumsFile = jsonEntry('checksums.json', {
    ...checksums,
    'manifest.json': sha256(manifest.data),
  });

  return buildStoredZip([manifest, ...files, checksumsFile]);
}

function predictionPlaceholder(runId: string, candidateType: string) {
  return {
    schemaVersion: 'immunograph-predictions.v1',
    runId,
    candidateType,
    observations: [],
  };
}

function jsonEntry(path: string, value: unknown): ZipFileEntry {
  return textEntry(path, `${JSON.stringify(value, null, 2)}\n`);
}

function textEntry(path: string, value: string): ZipFileEntry {
  return { path, data: Buffer.from(value, 'utf8') };
}

function binaryEntry(path: string, valueBase64: string): ZipFileEntry {
  return { path, data: Buffer.from(valueBase64, 'base64') };
}

function sha256(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

type ResearchPackageSnapshot = z.infer<
  typeof exportResearchPackageContract.inputSchema
>['packageSnapshot'];

const TRANSPARENT_PIXEL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lhQ3TAAAAABJRU5ErkJggg==';
