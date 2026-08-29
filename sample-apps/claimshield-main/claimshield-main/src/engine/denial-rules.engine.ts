import deadlines from '../data/deadlines.js';
import regulations from '../data/regulations.js';

export interface RiskFactor {
  factor: string;
  title: string;
  severity: 'FATAL' | 'CRITICAL' | 'HIGH' | 'MEDIUM';
  detail: string;
  regulation: string;
  riskPoints: number;
  fixable: boolean;
  fix: string;
}

export interface RiskResult {
  riskScore: number;
  status: 'READY' | 'NEEDS_ATTENTION' | 'HIGH_RISK' | 'CLAIM_INVALID';
  daysRemaining: number;
  deadlineBreached: boolean;
  riskFactors: RiskFactor[];
  appealable: boolean;
  totalFactors: number;
}

export function runDenialRiskEngine(incident: any): RiskResult {
  const riskFactors: RiskFactor[] = [];
  let riskScore = 0;

  // --- RULE 1: Check filing deadline ---
  const incidentDate = new Date(incident.incidentDate || incident.date);
  const today = new Date();
  const daysSinceIncident = Math.floor((today.getTime() - incidentDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Note: the original instruction uses incident.claimType, but existing code uses incident.accidentType. We will support both.
  const claimTypeKey = incident.claimType || incident.accidentType || 'motor';
  const stateKey = incident.state || 'default';
  const deadlineTable = deadlines[claimTypeKey as keyof typeof deadlines];
  const allowedDays = deadlineTable ? ((deadlineTable as any)[stateKey] || (deadlineTable as any)['default'] || 7) : 7;
  const daysRemaining = allowedDays - daysSinceIncident;
  const deadlineBreached = daysSinceIncident > allowedDays;

  if (deadlineBreached) {
    const reg = regulations['LATE_FILING' as keyof typeof regulations];
    riskFactors.push({
      factor: 'LATE_FILING',
      title: reg.title,
      severity: reg.severity as any,
      detail: `Incident was ${daysSinceIncident} days ago. Deadline for ${claimTypeKey} claims in ${stateKey} is ${allowedDays} days. You are ${daysSinceIncident - allowedDays} days past the deadline.`,
      regulation: reg.regulation,
      riskPoints: reg.riskPoints,
      fixable: reg.fixable,
      fix: reg.fix
    });
    riskScore += reg.riskPoints;
  }

  // --- RULE 2: FIR check for injury motor claims ---
  const isMotor = (incident.claimType === 'motor' || incident.accidentType === 'motor');
  const hasInjury = (incident.hasInjuries === true || incident.injuryReported === true);
  if (isMotor && hasInjury) {
    const hasFIR = incident.documents?.includes('FIR') || incident.hasFIR === true || incident.firAvailable === true;
    if (!hasFIR) {
      const reg = regulations['MISSING_FIR' as keyof typeof regulations];
      riskFactors.push({
        factor: 'MISSING_FIR',
        title: reg.title,
        severity: reg.severity as any,
        detail: `Your claim involves injuries but no FIR has been filed. This is legally mandatory under Indian law.`,
        regulation: reg.regulation,
        riskPoints: reg.riskPoints,
        fixable: reg.fixable,
        fix: reg.fix
      });
      riskScore += reg.riskPoints;
    }
  }

  // --- RULE 3: Policy lapse check ---
  if (incident.policyExpiryDate) {
    const expiryDate = new Date(incident.policyExpiryDate);
    if (expiryDate < incidentDate) {
      const reg = regulations['POLICY_LAPSED' as keyof typeof regulations];
      riskFactors.push({
        factor: 'POLICY_LAPSED',
        title: reg.title,
        severity: reg.severity as any,
        detail: `Policy expired on ${expiryDate.toDateString()} but incident occurred on ${incidentDate.toDateString()}.`,
        regulation: reg.regulation,
        riskPoints: reg.riskPoints,
        fixable: reg.fixable,
        fix: reg.fix
      });
      riskScore = 100; // Auto max — claim is invalid
    }
  }

  // --- RULE 4: High value claim needs surveyor ---
  if (incident.estimatedDamage && incident.estimatedDamage > 75000) {
    const hasSurveyor = incident.hasSurveyor === true;
    if (!hasSurveyor) {
      const reg = regulations['MISSING_SURVEYOR' as keyof typeof regulations];
      riskFactors.push({
        factor: 'MISSING_SURVEYOR',
        title: reg.title,
        severity: reg.severity as any,
        detail: `Estimated damage of Rs ${incident.estimatedDamage} exceeds Rs 75,000. An independent surveyor is mandatory.`,
        regulation: reg.regulation,
        riskPoints: reg.riskPoints,
        fixable: reg.fixable,
        fix: reg.fix
      });
      riskScore += reg.riskPoints;
    }
  }

  // --- RULE 5: Motor claim needs driving licence ---
  if (isMotor) {
    const hasLicence = incident.documents?.includes('driving_licence') || incident.hasDrivingLicence === true || incident.drivingLicenceAvailable === true;
    if (!hasLicence) {
      const reg = regulations['MISSING_DRIVING_LICENCE' as keyof typeof regulations];
      riskFactors.push({
        factor: 'MISSING_DRIVING_LICENCE',
        title: reg.title,
        severity: reg.severity as any,
        detail: `Driving licence is not marked as available. This is required for all motor claims.`,
        regulation: reg.regulation,
        riskPoints: reg.riskPoints,
        fixable: reg.fixable,
        fix: reg.fix
      });
      riskScore += reg.riskPoints;
    }
  }

  // --- RULE 6: Health cashless needs pre-auth ---
  const isHealth = (incident.claimType === 'health' || incident.policyType === 'health-addon' || incident.accidentType === 'injury');
  if (isHealth && incident.treatmentType === 'cashless') {
    const hasPreAuth = incident.hasPreAuthorization === true;
    if (!hasPreAuth) {
      const reg = regulations['NO_CASHLESS_PREAUTH' as keyof typeof regulations];
      riskFactors.push({
        factor: 'NO_CASHLESS_PREAUTH',
        title: reg.title,
        severity: reg.severity as any,
        detail: `Cashless health treatment requires pre-authorization from your insurer before treatment begins.`,
        regulation: reg.regulation,
        riskPoints: reg.riskPoints,
        fixable: reg.fixable,
        fix: reg.fix
      });
      riskScore += reg.riskPoints;
    }
  }

  // Cap score at 100
  riskScore = Math.min(riskScore, 100);

  const hasFatal = riskFactors.some(f => f.severity === 'FATAL');
  const status = hasFatal ? 'CLAIM_INVALID'
    : riskScore >= 60 ? 'HIGH_RISK'
    : riskScore >= 30 ? 'NEEDS_ATTENTION'
    : 'READY';

  return {
    riskScore,
    status,
    daysRemaining: Math.max(0, daysRemaining),
    deadlineBreached,
    riskFactors,
    appealable: riskFactors.length > 0 && !hasFatal,
    totalFactors: riskFactors.length
  };
}
