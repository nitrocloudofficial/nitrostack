/**
 * ThreatMatrix MCP Multi-Vector Investigation Orchestrator
 * Automates tool chaining and threat correlation across vectors.
 */
import { container } from './container.js';
import { ReportData } from './report.generator.js';
import { logger } from './logger.js';

export interface InvestigationResult {
  scanId: string;
  target: string;
  type: string;
  overallScore: number;
  threatLevel: 'SAFE' | 'SUSPICIOUS' | 'HIGH' | 'CRITICAL';
  findings: Array<{ category: string; description: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' }>;
  recommendedActions: string[];
  reportUrls: {
    json: string;
    markdown: string;
    html: string;
  };
  details: Record<string, unknown>;
}

export class InvestigationOrchestrator {
  private get threatAnalyzer() { return container.threatAnalyzer; }
  private get agentEngine() { return container.agentEngine; }
  private get inputProcessor() { return container.inputProcessor; }
  private get reportGenerator() { return container.reportGenerator; }

  public async investigate(target: string, type: 'url' | 'email' | 'file' | 'ip' | 'hash' | 'auto'): Promise<InvestigationResult> {
    const scanId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    logger.info('Orchestrated multi-vector investigation initiated', { scanId, target, type });

    const findings: Array<{ category: string; description: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' }> = [];
    const recommendedActions: string[] = [];
    let totalScore = 0;
    const details: Record<string, unknown> = {};

    // 1. Format Detection if auto
    const processed = await this.inputProcessor.process(target);
    const resolvedType = type === 'auto' ? processed.format.toLowerCase() : type;

    // 2. Vector Workflow Chaining
    if (resolvedType === 'url' || resolvedType === 'uri') {
      const urlScan = await this.threatAnalyzer.analyzeUrl(target);
      totalScore += urlScan.riskScore;
      findings.push(...urlScan.findings);
      recommendedActions.push(...urlScan.recommendations);
      details.urlScan = urlScan.metadata;

      try {
        const hostname = new URL(target.startsWith('http') ? target : 'http://' + target).hostname;
        const domainCheck = await this.threatAnalyzer.checkDomain(hostname);
        findings.push(...domainCheck.findings);
        details.domainCheck = domainCheck.metadata;
      } catch (e) {}
    } else if (resolvedType === 'email') {
      const emailScan = await this.threatAnalyzer.analyzeEmail(target);
      totalScore += emailScan.riskScore;
      findings.push(...emailScan.findings);
      recommendedActions.push(...emailScan.recommendations);
      details.emailScan = emailScan.metadata;

      const iocScan = await this.threatAnalyzer.extractIocs(target);
      findings.push(...iocScan.findings);
      details.iocs = iocScan.metadata;
    } else if (resolvedType === 'file' || resolvedType === 'pdf') {
      const pdfScan = await this.threatAnalyzer.analyzePdf(target);
      totalScore += pdfScan.riskScore;
      findings.push(...pdfScan.findings);
      recommendedActions.push(...pdfScan.recommendations);
      details.pdfScan = pdfScan.metadata;
    } else if (resolvedType === 'ip') {
      const ipScan = await this.threatAnalyzer.lookupIp(target);
      totalScore += ipScan.riskScore;
      findings.push(...ipScan.findings);
      recommendedActions.push(...ipScan.recommendations);
      details.ipScan = ipScan.metadata;
    } else if (resolvedType === 'hash') {
      const hashScan = await this.threatAnalyzer.lookupHash(target);
      totalScore += hashScan.riskScore;
      findings.push(...hashScan.findings);
      recommendedActions.push(...hashScan.recommendations);
      details.hashScan = hashScan.metadata;
    } else {
      // General agentic fallback
      const agentResult = await this.agentEngine.processAgenticTask(processed);
      totalScore = agentResult.riskScore;
      findings.push(...agentResult.findings);
      recommendedActions.push(...agentResult.recommendedActions);
      details.agentResult = agentResult.metadata;
    }

    // 3. Score Normalization & Threat Level Assignment
    const boundedScore = Math.min(100, Math.max(0, totalScore));
    const threatLevel: 'SAFE' | 'SUSPICIOUS' | 'HIGH' | 'CRITICAL' =
      boundedScore >= 75 ? 'CRITICAL' : boundedScore >= 50 ? 'HIGH' : boundedScore >= 20 ? 'SUSPICIOUS' : 'SAFE';

    // 4. Report Generation
    const reportPayload: ReportData = {
      scanId,
      target,
      threatLevel,
      riskScore: boundedScore,
      confidence: 0.96,
      summary: `Multi-vector investigation completed for target ${target}`,
      findings,
      recommendations: Array.from(new Set(recommendedActions)),
      details,
    };

    const jsonReport = this.reportGenerator.generateJson(reportPayload);
    const mdReport = this.reportGenerator.generateMarkdown(reportPayload);
    const htmlReport = this.reportGenerator.generateHtml(reportPayload);

    return {
      scanId,
      target,
      type: resolvedType,
      overallScore: boundedScore,
      threatLevel,
      findings,
      recommendedActions: Array.from(new Set(recommendedActions)),
      reportUrls: {
        json: jsonReport.webPath,
        markdown: mdReport.webPath,
        html: htmlReport.webPath,
      },
      details,
    };
  }
}
