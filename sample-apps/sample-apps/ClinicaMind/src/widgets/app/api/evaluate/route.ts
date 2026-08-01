import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { SupervisorService } from '../../../../modules/supervisor/supervisor.service';
import { HistoryService } from '../../../../modules/history/history.service';
import { MedicationService } from '../../../../modules/medication/medication.service';
import { ResearchService } from '../../../../modules/research/research.service';
import { GapAnalysisService } from '../../../../modules/gap-analysis/gap-analysis.service';
import { ReportService } from '../../../../modules/report/report.service';
import { AgentRegistryService } from '../../../../modules/supervisor/agent-registry';
import { AiExecutionRepository } from '../../../../db/repositories/ai-execution.repository';
import { AuditRepository } from '../../../../db/repositories/audit.repository';

const historyService = new HistoryService();
const medicationService = new MedicationService();
const researchService = new ResearchService();
const gapAnalysisService = new GapAnalysisService();
const reportService = new ReportService();
const agentRegistry = new AgentRegistryService(historyService, medicationService, researchService, gapAnalysisService, reportService);

const supervisorService = new SupervisorService(
  historyService,
  medicationService,
  researchService,
  gapAnalysisService,
  reportService,
  agentRegistry
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const transcript = body.transcript || 'General Consultation';
    const patientId = body.patientId || 'p-default';
    const visitId = body.visitId || `v-eval-${Date.now()}`;

    const supervisorExecId = `sup-${Date.now()}`;
    AiExecutionRepository.createSupervisorExecution({
      id: supervisorExecId,
      visitId,
      patientId,
      status: 'RUNNING',
      planSummary: `Evaluating consultation transcript for patient ${patientId}`
    });

    const result = await supervisorService.orchestrateConsultation(transcript, patientId);

    // Persist agent outputs & execution details
    const agentExecId = `ag-${Date.now()}`;
    AiExecutionRepository.createAgentExecution({
      id: agentExecId,
      supervisorExecutionId: supervisorExecId,
      agentName: 'supervisor-orchestrator',
      status: 'COMPLETED',
      completedAt: new Date().toISOString()
    });

    AiExecutionRepository.createAgentOutput({
      id: `out-${Date.now()}`,
      agentExecutionId: agentExecId,
      outputPayload: JSON.stringify(result),
      confidence: 0.98,
      reasoningMetadata: JSON.stringify({ transcriptLength: transcript.length, nodesGenerated: result?.nodes?.length || 0 })
    });

    AuditRepository.log('SUPERVISOR_EVALUATED', 'Visit', visitId, { patientId, nodesCount: result?.nodes?.length });

    return NextResponse.json({
      status: 'success',
      agent: 'Supervisor Agent',
      visitId,
      data: result
    });
  } catch (error: any) {
    console.error('❌ [API Evaluate Error]:', error);
    return NextResponse.json(
      { status: 'error', message: error?.message || 'Failed to evaluate consultation', stack: error?.stack },
      { status: 500 }
    );
  }
}
