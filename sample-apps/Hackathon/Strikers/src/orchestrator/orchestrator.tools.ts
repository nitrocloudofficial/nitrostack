import { z } from 'zod';
import { ToolDecorator as Tool, ExecutionContext, Injectable } from '@nitrostack/core';
import { DatabaseService } from '../database/database.service.js';

const commandInput = z.object({
  intent: z.string().min(1).max(500).describe('Natural language intent (e.g. "Find ICU bed and book a cardiologist in Mumbai")'),
});

const whatIfInput = z.object({
  scenario: z.string().min(1).max(500).describe('The hypothetical scenario to simulate (e.g. "What if 50 emergency patients arrive?", "Dengue outbreak", "Mass casualty event")'),
  patientCount: z.number().int().min(1).max(5000).optional().describe('Number of patients to model in the scenario.'),
});

@Injectable({ deps: [DatabaseService] })
export class OrchestratorTools {
  constructor(private readonly db: DatabaseService) {}

  @Tool({
    name: 'hospital-command-agent',
    title: 'Multi-Agent Hospital Orchestrator',
    description:
      'Parses complex natural-language hospital commands and produces a structured execution plan, delegating to specialist domains (Appointments, Beds, Emergency, Pharmacy). Returns a step-by-step decision path.',
    inputSchema: commandInput,
    invocation: { invoking: 'Planning execution…', invoked: 'Execution plan ready' },
    metadata: { category: 'orchestration', tags: ['agent', 'planner', 'orchestrator'] },
  })
  async planIntent(input: z.infer<typeof commandInput>, ctx: ExecutionContext) {
    ctx.logger.info('hospital-command-agent invoked', { intent: input.intent.slice(0, 80) });

    const lower = input.intent.toLowerCase();

    // Domain detection
    const needsBed = lower.includes('bed') || lower.includes('icu') || lower.includes('admit');
    const needsDoctor = lower.includes('doctor') || lower.includes('cardiologist') || lower.includes('specialist') || lower.includes('book') || lower.includes('appointment');
    const needsEmergency = lower.includes('emergency') || lower.includes('critical') || lower.includes('ambulance') || lower.includes('chest pain') || lower.includes('stroke');
    const needsPharmacy = lower.includes('medicine') || lower.includes('drug') || lower.includes('prescription') || lower.includes('pharmacy');
    const needsLab = lower.includes('test') || lower.includes('lab') || lower.includes('blood') || lower.includes('mri') || lower.includes('scan');

    const domains: string[] = [];
    const steps: Array<{ step: number; agent: string; action: string; tool: string }> = [];

    let stepNum = 1;

    if (needsEmergency) {
      domains.push('Emergency');
      steps.push({ step: stepNum++, agent: 'EmergencyAgent', action: 'Trigger emergency protocol', tool: 'report-emergency' });
    }
    if (needsBed) {
      domains.push('Bed Management');
      steps.push({ step: stepNum++, agent: 'BedAgent', action: 'Check bed availability by type and hospital', tool: 'bed-status' });
    }
    if (needsDoctor) {
      domains.push('Appointments');
      steps.push({ step: stepNum++, agent: 'DiscoveryAgent', action: 'Search matching specialists and compare slots', tool: 'search-doctors → compare-slots' });
      steps.push({ step: stepNum++, agent: 'BookingAgent', action: 'Reserve appointment slot atomically', tool: 'book-appointment' });
    }
    if (needsPharmacy) {
      domains.push('Pharmacy');
      steps.push({ step: stepNum++, agent: 'PharmacyAgent', action: 'Search medicine inventory and check stock', tool: 'medicine-search' });
    }
    if (needsLab) {
      domains.push('Laboratory');
      steps.push({ step: stepNum++, agent: 'LabAgent', action: 'Search laboratory tests and book', tool: 'search-test' });
    }

    if (steps.length === 0) {
      steps.push({ step: 1, agent: 'GeneralAgent', action: 'Gather more information about patient needs', tool: 'health-assistant' });
      domains.push('Triage');
    }

    return {
      intent: input.intent,
      domainsInvolved: domains,
      executionPlan: steps,
      parallelizable: !needsEmergency,
      decisionPath: [
        `Parsed intent: "${input.intent.slice(0, 80)}"`,
        `Detected domains: ${domains.join(', ')}`,
        `Generated ${steps.length}-step execution plan`,
        `Parallelization: ${!needsEmergency ? 'Steps can run concurrently' : 'Sequential (emergency takes priority)'}`,
      ],
      predictionReason: `Intent analysis detected ${domains.length} domain(s). ${needsEmergency ? 'Emergency takes absolute priority.' : 'Non-emergency workflow can be parallelized.'}`,
      confidenceScore: 94,
      summary: `Orchestration plan ready. ${steps.length} step(s) across ${domains.join(', ')}. ${steps.map(s => s.tool).join(' → ')}.`,
      nextAction: steps[0] ? `Start with: call the "${steps[0].tool}" tool to ${steps[0].action}.` : 'Clarify the patient\'s need.',
    };
  }

  @Tool({
    name: 'what-if-simulator',
    title: 'AI What-If Disaster Simulator',
    description: 'Model hypothetical hospital surge scenarios using real bed data. Returns quantitative predictions: time-to-capacity, ICU overflow hour, queue growth rate, and mitigation recommendations.',
    inputSchema: whatIfInput,
    invocation: { invoking: 'Running simulation…', invoked: 'Simulation complete' },
    metadata: { category: 'orchestration', tags: ['simulation', 'what-if', 'capacity', 'disaster'] },
  })
  async simulateScenario(input: z.infer<typeof whatIfInput>, ctx: ExecutionContext) {
    ctx.logger.info('what-if-simulator invoked', { scenario: input.scenario.slice(0, 80) });

    // H2 fix: Use real bed data for quantitative predictions
    const bedModel = await this.db.beds();
    const icuBeds = await bedModel.find({ type: 'ICU' }).lean().exec();
    const generalBeds = await bedModel.find({ type: 'General' }).lean().exec();
    const availableIcu = icuBeds.filter(b => b.status === 'Available').length;
    const availableGeneral = generalBeds.filter(b => b.status === 'Available').length;

    const lowerScenario = input.scenario.toLowerCase();
    const patients = input.patientCount ?? 50;

    // Classify scenario
    let admissionRate = 5; // patients/hour
    let icuRatio = 0.2;   // fraction needing ICU
    let labMultiplier = 1;
    let scenarioType = 'General Surge';
    let specificRecommendations: string[] = [];

    if (lowerScenario.includes('dengue') || lowerScenario.includes('fever')) {
      admissionRate = 8; icuRatio = 0.1; labMultiplier = 5;
      scenarioType = 'Infectious Disease Outbreak (Dengue)';
      specificRecommendations = ['Deploy mobile CBC/platelet testing units', 'Fast-track fever triage clinic', 'Stockpile IV fluids and platelet reserves', 'Activate contact tracing protocol'];
    } else if (lowerScenario.includes('flood') || lowerScenario.includes('earthquake') || lowerScenario.includes('disaster') || lowerScenario.includes('mass casualty')) {
      admissionRate = 20; icuRatio = 0.35;
      scenarioType = 'Mass Casualty / Natural Disaster';
      specificRecommendations = ['Activate Mass Casualty Incident (MCI) protocol', 'Convert General Ward B to trauma overflow', 'Request ambulance diversions from city control', 'Page all off-duty trauma surgeons and anaesthesiologists'];
    } else if (lowerScenario.includes('accident') || lowerScenario.includes('crash') || lowerScenario.includes('trauma')) {
      admissionRate = 15; icuRatio = 0.3;
      scenarioType = 'Multi-Vehicle Accident / Trauma Surge';
      specificRecommendations = ['Reserve trauma bays 1–4', 'Alert orthopedic and neurosurgery on-call teams', 'Prepare O-negative blood reserves'];
    } else if (lowerScenario.includes('covid') || lowerScenario.includes('pandemic') || lowerScenario.includes('respiratory')) {
      admissionRate = 12; icuRatio = 0.25; labMultiplier = 3;
      scenarioType = 'Respiratory Pandemic Surge';
      specificRecommendations = ['Activate isolation ward protocol', 'Deploy ventilator reserve units', 'Enforce PPE Level 3 for all ICU staff', 'Setup dedicated respiratory triage zone'];
    }

    // Quantitative calculations
    const icuPatients = Math.round(patients * icuRatio);
    const generalPatients = patients - icuPatients;
    const hoursToIcuCapacity = availableIcu > 0 ? parseFloat((availableIcu / (icuPatients / admissionRate)).toFixed(1)) : 0;
    const hoursToGeneralCapacity = availableGeneral > 0 ? parseFloat((availableGeneral / (generalPatients / admissionRate)).toFixed(1)) : 0;
    const estimatedQueueGrowth = `+${Math.round(patients * 2.5)} patients in 4 hours`;
    const isOverflowRisk = icuPatients > availableIcu;

    return {
      scenario: input.scenario,
      scenarioType,
      simulatedPatients: patients,
      currentCapacity: {
        availableICU: availableIcu,
        totalICU: icuBeds.length,
        availableGeneral: availableGeneral,
        totalGeneral: generalBeds.length,
      },
      predictions: {
        icuPatientsExpected: icuPatients,
        generalPatientsExpected: generalPatients,
        hoursToICUCapacity: hoursToIcuCapacity,
        hoursToGeneralCapacity: hoursToGeneralCapacity,
        estimatedQueueGrowth,
        labDemandMultiplier: `${labMultiplier}x normal`,
        isOverflowRisk,
        overflowAlert: isOverflowRisk
          ? `🚨 ICU OVERFLOW: ${icuPatients} patients will exceed current capacity of ${availableIcu} ICU beds in approximately ${hoursToIcuCapacity} hours.`
          : `✅ ICU capacity sufficient: ${availableIcu} beds available for ${icuPatients} projected patients.`,
      },
      recommendations: [
        ...specificRecommendations,
        `Route ${Math.max(0, icuPatients - availableIcu)} overflow ICU patients to partner hospitals.`,
        'Brief all department heads immediately.',
      ].slice(0, 6),
      confidenceScore: 85,
      predictionBasis: `Quantitative model using real-time bed data (${icuBeds.length} ICU, ${generalBeds.length} General beds). Admission rate: ${admissionRate}/hour. ICU ratio: ${(icuRatio * 100).toFixed(0)}%.`,
      disclaimer: 'Simulation uses synthetic dataset. Production deployment would incorporate real-time EHR admissions, staffing ratios, and equipment availability.',
      summary: `Simulation complete for "${input.scenario}" (${patients} patients). ${isOverflowRisk ? `⚠️ ICU overflow in ${hoursToIcuCapacity}h.` : `✅ ICU capacity can absorb surge.`} ${specificRecommendations[0] ?? ''}`,
    };
  }
}
