import { ThreatMatrixService } from './threatmatrix.service.js';
import { Finding } from './mcp.schemas.js';

export class ThreatMatrixController {
  constructor(private service: ThreatMatrixService) {}

  async investigateThreatMatrix(payload: any) {
    const res = await this.service.correlateThreats(payload);
    return {
      investigationId: res.id,
      timestamp: res.timestamp,
      overallRiskScore: res.riskScore,
      riskLevel: res.riskLevel,
      indicatorsOfCompromise: res.findings.map((f: Finding) => ({ type: f.category, value: f.description, severity: f.severity })),
      reasoningChain: [res.summary, ...res.findings.map((f: Finding) => `${f.category}: ${f.description}`)],
      recommendedActions: res.recommendations,
    };
  }
}
