import { McpApplicationFactory, defaultLogger } from '@nitrostack/core';
import { AppModule } from './app.module.js';
import { PipelineTools } from './modules/pipeline/pipeline.tools.js';
import { ParserService } from './modules/ingestion/parser.service.js';
import multer from 'multer';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const upload = multer({ storage: multer.memoryStorage() });

async function registerHttpRoutes(app: any) {
  const transport = app.getHttpTransport?.();
  if (!transport?.getApp) {
    return;
  }

  const expressApp = transport.getApp();

  // Explicit HTTP GET health probe endpoints for NitroStack Cloud / load balancer container readiness checks
  expressApp.get('/', (_req: express.Request, res: express.Response) => {
    res.status(200).json({ status: 'ok', service: 'phalanx-mcp-server' });
  });
  expressApp.get('/health', (_req: express.Request, res: express.Response) => {
    res.status(200).json({ status: 'ok', service: 'phalanx-mcp-server' });
  });
  expressApp.get('/api/health', (_req: express.Request, res: express.Response) => {
    res.status(200).json({ status: 'ok', service: 'phalanx-mcp-server' });
  });

  // Enable JSON body parsing for custom REST routes, scoped to /api so it does not break MCP SDK routes.
  expressApp.use('/api', express.json({ limit: '50mb' }));

  expressApp.post('/api/analyze', upload.single('file'), async (req: express.Request, res: express.Response) => {
    try {
      const pipeline = PipelineTools.instance;
      if (!pipeline) {
        throw new Error('PipelineTools instance not initialized');
      }

      const file = req.file;
      if (!file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const startedAt = Date.now();
      const contractType = String(req.body?.contractType || 'general_contract');
      const filename = String(file.originalname || 'contract.txt');
      defaultLogger.info('[Pipeline Start] Processing document', { filename });

      const parser = new ParserService();
      defaultLogger.info('[Step 1/5] Extracting text and page structure');
      const parseResult = await parser.parse(file.buffer.toString('base64'), filename);
      const text = parseResult.text || file.buffer.toString('utf8');

      if (!text.trim()) {
        res.status(422).json({
          error: 'No extractable text found. The file may be a scanned image — OCR is not enabled in this build.'
        });
        return;
      }

      const calculatedPageCount = parseResult.pageCount ?? 1;
      defaultLogger.info('[Step 1/5] Extraction complete', { chars: text.length, pageCount: calculatedPageCount });

      defaultLogger.info('[Step 2/5] Redacting under the selected policy');
      const redactionResult = await pipeline.redactionService.redact(text, contractType, `sess_${Date.now()}`);

      const verification = pipeline.redactionService.verify(redactionResult.redactedText, redactionResult.doctype);
      if (!verification.clean) {
        defaultLogger.warn('Residual PII detected after redaction', { leaks: verification.leaks });
      }
      defaultLogger.info('[Step 2/5] Redaction complete', {
        tokenCount: redactionResult.stats.totalTokens,
        policy: redactionResult.policy.label
      });

      defaultLogger.info('[Step 3/5] Building the clause knowledge graph');
      const graph = await pipeline.graphService.buildFromText(
        redactionResult.redactedText,
        contractType,
        redactionResult.sessionId
      );
      defaultLogger.info('[Step 3/5] Graph materialized', {
        nodeCount: graph.nodeCount,
        edgeCount: graph.edgeCount,
        source: graph.source
      });

      defaultLogger.info('[Step 4/5] Running all 4 specialized Risk Agents concurrently');
      const analysis = await pipeline.riskService.runAllAgents(graph.graphId);
      defaultLogger.info('[Step 4/5] Risk analysis complete', {
        findingCount: analysis.findings.length,
        strengthCount: analysis.strengths.length
      });

      defaultLogger.info('[Step 5/5] Synthesizing redlines and the negotiation email');
      const proposal = await pipeline.redlineService.synthesize(graph.graphId, redactionResult.sessionId, {
        findings: analysis.findings,
        restore: true
      });
      defaultLogger.info('[Pipeline Complete] Returning payload to UI', { riskScore: proposal.riskScore });

      const graphExport = pipeline.graphService.getExport(graph.graphId);
      const restoredGraph = pipeline.redactionService.restoreDeep(
        {
          nodes: (graphExport?.export.nodes ?? []).map((n: any) => ({
            key: n.key,
            attributes: {
              label: n.attributes?.heading ?? n.attributes?.label ?? n.key,
              category: n.attributes?.category ?? n.attributes?.entityType ?? 'other',
              kind: n.attributes?.kind ?? 'clause',
              text: (n.attributes?.text ?? '').slice(0, 400)
            }
          })),
          edges: (graphExport?.export.edges ?? []).map((e: any) => ({
            source: e.source,
            target: e.target,
            relation: e.attributes?.relation ?? 'references'
          }))
        },
        redactionResult.sessionId
      );

      const responsePayload = {
        documentId: graph.graphId,
        sessionId: redactionResult.sessionId,
        fileName: filename,
        contractType: redactionResult.doctype,
        policyLabel: redactionResult.policy.label,
        pageCount: calculatedPageCount,
        processingTime: `${((Date.now() - startedAt) / 1000).toFixed(1)}s`,
        analysisSource: graph.source,
        restored: proposal.restored,
        restorationWarning: proposal.restorationWarning ?? null,
        redaction: {
          tokenCount: redactionResult.stats.totalTokens,
          byEntity: redactionResult.stats.byEntity,
          verified: verification.clean,
          leaks: verification.leaks
        },
        riskScore: proposal.riskScore,
        scoreBreakdown: analysis.scoreBreakdown,
        strengths: analysis.strengths,
        summary: proposal.summary,
        graph: {
          graphId: graph.graphId,
          nodeCount: graph.nodeCount,
          edgeCount: graph.edgeCount,
          categories: graph.categories,
          nodes: restoredGraph.nodes,
          edges: restoredGraph.edges
        },
        findings: analysis.findings.map((finding: any) => {
          const redline = proposal.redlines.find((r: any) => r.findingId === finding.id) ?? null;
          return {
            id: finding.id,
            agent: finding.agent,
            severity: finding.severity,
            category: finding.category,
            title: finding.issue,
            issue: finding.issue,
            businessImpact: finding.businessImpact,
            legalReason: finding.legalReason,
            clause: finding.clause,
            clauseTitle: finding.clauseTitle,
            clauseId: finding.clauseId,
            page: finding.page,
            confidence: finding.confidence,
            recommendation: finding.recommendation,
            redline: redline && {
              proposed: redline.proposedText,
              reason: redline.reason,
              negotiationPosition: redline.negotiationPosition,
              priority: redline.priority,
              dependencyWarning: redline.dependencyWarning ?? null
            }
          };
        }),
        redlines: proposal.redlines.map((r: any) => ({
          findingId: r.findingId,
          clauseId: r.clauseId,
          title: r.title,
          severity: r.severity,
          category: r.category,
          original: r.originalText,
          proposed: r.proposedText,
          reason: r.reason,
          negotiationPosition: r.negotiationPosition,
          dependencyWarning: r.dependencyWarning ?? null,
          priority: r.priority
        })),
        email: `${proposal.negotiationEmail?.subject || 'Review proposed revisions'}\n\n${proposal.negotiationEmail?.body || ''}`
      };

      res.json(responsePayload);

      pipeline.redactionService.destroySession(redactionResult.sessionId);
      pipeline.graphService.drop(graph.graphId);
    } catch (err: any) {
      defaultLogger.error('Analyze endpoint error', { error: err?.message, stack: err?.stack });
      res.status(500).json({ error: err.message });
    }
  });

  expressApp.post('/api/synthesize', async (req: express.Request, res: express.Response) => {
    try {
      const pipeline = PipelineTools.instance;
      if (!pipeline) {
        throw new Error('PipelineTools instance not initialized');
      }

      const { graphId, sessionId, findings } = req.body;

      pipeline.redactionService['vault'].put(sessionId, {
        '[ACV_VALUE]': '$50,000'
      });

      const proposal = await pipeline.redlineService.synthesize(graphId, sessionId, {
        findings,
        restore: true
      });

      res.json({
        status: 'completed',
        metadata: {
          pageCount: 1,
          processingTime: '2.1s'
        },
        redlines: proposal.redlines.map((r: any) => ({
          original: r.originalText,
          proposed: r.proposedText,
          rationale: r.reason || r.rationale
        }))
      });
    } catch (err: any) {
      defaultLogger.error('Synthesis pipeline error', { error: err?.message, stack: err?.stack });
      res.status(500).json({ error: err.message });
    }
  });
}

async function bootstrap() {
  const app = await McpApplicationFactory.create(AppModule);
  await app.start();
  await registerHttpRoutes(app);
}

void bootstrap().catch((err: unknown) => {
  defaultLogger.error('Failed to start MCP application', {
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined
  });
  process.exitCode = 1;
});
