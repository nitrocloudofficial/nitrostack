import { Injectable, OnModuleInit, emitEvent } from '@nitrostack/core';
import { HitlGateState } from './guards/threat-score.guard.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Intelligence Report — Output structure from Agent 1 (Investigator)
 */
export interface IntelligenceReport {
  report_id: string;
  generated_at: string;
  classification: 'DIGITAL_ARREST_SCAM' | 'SUSPICIOUS' | 'BENIGN';

  telecom_analysis: {
    call_id: string;
    target_phone: string;
    incoming_caller_id: string;
    stir_shaken_verified: boolean;
    true_origin: string;
    call_duration_minutes: number;
    voice_biometrics_flag: string;
    anomalies_detected: string[];
    risk_indicator: string;
  };

  deepfake_analysis: {
    ai_synthesis_probability: number;
    model_version: string;
    confidence_band: string;
    spectral_anomalies: string[];
    verdict: string;
  };

  financial_analysis: {
    transaction_id: string;
    destination_account: string;
    account_age_days: number;
    kyc_status: string;
    velocity_last_24h: {
      inbound_transfers: number;
      outbound_transfers: number;
      current_balance: number;
    };
    attempted_transfer_amount: number;
    mule_indicators: string[];
    mule_probability: string;
  };

  anomaly_summary: string[];
  total_anomaly_count: number;
}

/**
 * Adjudication Result — Output structure from Agent 2 (Adjudicator)
 */
export interface AdjudicationResult {
  adjudication_id: string;
  timestamp: string;
  threat_score: number;
  threat_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  requires_hitl: boolean;
  scoring_breakdown: {
    telecom_score: number;
    deepfake_score: number;
    financial_score: number;
  };
  recommendation: string;
  intelligence_report: IntelligenceReport;
}

/**
 * Scenario suffix type for deterministic demo triggers
 */
type ScenarioSuffix = '' | '_safe' | '_medium';

/**
 * Aegis Orchestration Service
 * 
 * Core service implementing the 2-Agent "Maker-Checker" architecture:
 * - Agent 1 (Investigator): Synthesizes data into an Intelligence Report
 * - Agent 2 (Adjudicator): Calculates threat score and triggers HITL if needed
 * 
 * Delegates HITL approval flow to HitlGateState singleton (shared with ThreatScoreGuard).
 * 
 * Supports scenario-based mock data loading via AEGIS_SCENARIO environment variable:
 * - AEGIS_SCENARIO="" or unset → Digital Arrest (Score ~95)
 * - AEGIS_SCENARIO="_safe"     → Safe Transaction (Score ~12)
 * - AEGIS_SCENARIO="_medium"   → Medium Risk (Score ~55)
 */
@Injectable()
export class AegisService implements OnModuleInit {
  private lastAdjudication: AdjudicationResult | null = null;

  async onModuleInit() {
    console.error('🛡️  Aegis Protocol — Threat Fusion Engine initialized');
    const scenario = process.env.AEGIS_SCENARIO || '';
    console.error(`📋 Active scenario suffix: "${scenario}" (telecom_event${scenario}.json / bank_event${scenario}.json)`);
  }

  /**
   * Resolves the mock file path based on the active scenario.
   * Reads AEGIS_SCENARIO env var to determine which mock data files to load.
   */
  private resolveMockPath(baseName: string, scenarioOverride?: string): string {
    const scenario: ScenarioSuffix = (scenarioOverride !== undefined ? scenarioOverride : (process.env.AEGIS_SCENARIO || '')) as ScenarioSuffix;
    const fileName = `${baseName}${scenario}.json`;
    const mockPath = path.resolve(process.cwd(), 'mocks', fileName);

    if (!fs.existsSync(mockPath)) {
      console.error(`⚠️  Mock file not found: ${mockPath}, falling back to default`);
      return path.resolve(process.cwd(), 'mocks', `${baseName}.json`);
    }

    return mockPath;
  }

  /**
   * Agent 1 — Investigator
   * 
   * Reads all three data sources (telecom, deepfake, mule graph) and
   * synthesizes a strict JSON Intelligence Report. 
   * This agent CANNOT make decisions — it only reports anomalies.
   */
  async runInvestigation(scenarioOverride?: string): Promise<IntelligenceReport> {
    console.error('🔍 [AGENT 1: INVESTIGATOR] Starting threat investigation...');

    // Read telecom data (scenario-aware)
    const telecomPath = this.resolveMockPath('telecom_event', scenarioOverride);
    console.error(`   📂 Loading telecom data: ${path.basename(telecomPath)}`);
    const telecomRaw = fs.readFileSync(telecomPath, 'utf-8');
    const telecomData = JSON.parse(telecomRaw);

    // Read bank data (scenario-aware)
    const bankPath = this.resolveMockPath('bank_event', scenarioOverride);
    console.error(`   📂 Loading bank data: ${path.basename(bankPath)}`);
    const bankRaw = fs.readFileSync(bankPath, 'utf-8');
    const bankData = JSON.parse(bankRaw);

    // Support array structure by picking a random index
    const activeIndex = Array.isArray(telecomData) ? Math.floor(Math.random() * telecomData.length) : 0;
    const telecomEvent = Array.isArray(telecomData) ? telecomData[activeIndex] : telecomData;
    const bankEvent = Array.isArray(bankData) ? bankData[activeIndex] : bankData;

    // Analyze telecom anomalies
    const telecomAnomalies: string[] = [];
    if (!telecomEvent.stir_shaken_verified) telecomAnomalies.push('STIR_SHAKEN_FAILED');
    if (telecomEvent.true_origin?.includes('VoIP')) telecomAnomalies.push('VOIP_ORIGIN_FOREIGN');
    if (telecomEvent.true_origin?.includes('Cambodia')) telecomAnomalies.push('ORIGIN_CAMBODIA_FLAGGED');
    if (telecomEvent.call_duration_minutes > 60) telecomAnomalies.push('EXTENDED_DURATION_COERCION');
    if (telecomEvent.voice_biometrics_flag === 'AI_SYNTHESIS_PROBABLE') telecomAnomalies.push('AI_VOICE_SYNTHESIS_DETECTED');
    if (telecomEvent.call_metadata?.srtp_enabled === false) telecomAnomalies.push('UNENCRYPTED_VOIP_CHANNEL');
    if (telecomEvent.threat_keywords_detected?.length > 3) telecomAnomalies.push('COERCION_KEYWORDS_DETECTED');

    // Analyze mule indicators
    const muleIndicators: string[] = [];
    const destDetails = bankEvent.destination_details || bankEvent;
    const accountAge = destDetails.account_age_days ?? bankEvent.account_age_days;
    const kycStatus = destDetails.kyc_status ?? bankEvent.kyc_status;

    if (accountAge < 30) muleIndicators.push('NEW_ACCOUNT_SUSPICIOUS');
    if (kycStatus === 'MINIMUM_EKYC') muleIndicators.push('MINIMAL_KYC_VERIFICATION');
    if (kycStatus === 'PARTIAL_KYC') muleIndicators.push('PARTIAL_KYC_INCOMPLETE');
    if (bankEvent.velocity_last_24h?.inbound_transfers > 10) muleIndicators.push('HIGH_INBOUND_VELOCITY');
    if (bankEvent.velocity_last_24h?.outbound_transfers > 10) muleIndicators.push('HIGH_OUTBOUND_VELOCITY');
    if (bankEvent.velocity_last_24h?.current_balance === 0) muleIndicators.push('ZERO_BALANCE_PASSTHROUGH');
    if (bankEvent.attempted_transfer_amount > 100000) muleIndicators.push('HIGH_VALUE_TRANSFER');
    if (bankEvent.rbi_flagged_cluster === true) muleIndicators.push('RBI_FLAGGED_CLUSTER');
    if (bankEvent.velocity_score > 0.8) muleIndicators.push('EXTREME_VELOCITY_SCORE');
    if (bankEvent.device_fingerprint?.root_detected) muleIndicators.push('ROOTED_DEVICE_DETECTED');
    if (bankEvent.device_fingerprint?.vpn_active) muleIndicators.push('VPN_MASKING_DETECTED');
    if (bankEvent.geographic_mismatch?.mismatch_severity === 'HIGH') muleIndicators.push('GEOGRAPHIC_MISMATCH_HIGH');

    // Deepfake analysis — read from telecom event's embedded analysis or use defaults
    const embeddedDeepfake = telecomEvent.deepfake_analysis;
    const deepfakeResult = embeddedDeepfake ? {
      ai_synthesis_probability: embeddedDeepfake.ai_synthesis_probability,
      model_version: embeddedDeepfake.model_version || 'VoiceShield-v3',
      confidence_band: embeddedDeepfake.confidence_band,
      spectral_anomalies: embeddedDeepfake.spectral_anomalies || [],
      verdict: embeddedDeepfake.verdict,
    } : {
      ai_synthesis_probability: 0.96,
      model_version: 'VoiceShield-v3',
      confidence_band: 'HIGH',
      spectral_anomalies: [
        'MISSING_MICRO_TREMOR',
        'UNIFORM_PITCH_VARIANCE',
        'SYNTHETIC_FORMANT_PATTERN',
      ],
      verdict: 'AI_GENERATED_VOICE_CONFIRMED',
    };

    // Synthesize all anomalies
    const allAnomalies = [
      ...telecomAnomalies,
      ...(deepfakeResult.ai_synthesis_probability > 0.8 ? ['DEEPFAKE_VOICE_CONFIRMED'] : []),
      ...(deepfakeResult.ai_synthesis_probability > 0.3 && deepfakeResult.ai_synthesis_probability <= 0.8 ? ['DEEPFAKE_INCONCLUSIVE'] : []),
      ...muleIndicators,
    ];

    const report: IntelligenceReport = {
      report_id: `IR-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      generated_at: new Date().toISOString(),
      classification: allAnomalies.length >= 8 ? 'DIGITAL_ARREST_SCAM' : allAnomalies.length >= 4 ? 'SUSPICIOUS' : 'BENIGN',

      telecom_analysis: {
        call_id: telecomEvent.call_id,
        target_phone: telecomEvent.target_phone,
        incoming_caller_id: telecomEvent.incoming_caller_id,
        stir_shaken_verified: telecomEvent.stir_shaken_verified,
        true_origin: telecomEvent.true_origin,
        call_duration_minutes: telecomEvent.call_duration_minutes,
        voice_biometrics_flag: telecomEvent.voice_biometrics_flag,
        anomalies_detected: telecomAnomalies,
        risk_indicator: telecomAnomalies.length >= 3 ? 'CRITICAL' : telecomAnomalies.length >= 2 ? 'HIGH' : 'LOW',
      },

      deepfake_analysis: deepfakeResult,

      financial_analysis: {
        transaction_id: bankEvent.transaction_id,
        destination_account: bankEvent.destination_account,
        account_age_days: accountAge,
        kyc_status: kycStatus,
        velocity_last_24h: bankEvent.velocity_last_24h,
        attempted_transfer_amount: bankEvent.attempted_transfer_amount,
        mule_indicators: muleIndicators,
        mule_probability: muleIndicators.length >= 6 ? 'CONFIRMED_MULE' : muleIndicators.length >= 3 ? 'PROBABLE_MULE' : 'LOW_RISK',
      },

      anomaly_summary: allAnomalies,
      total_anomaly_count: allAnomalies.length,
    };

    console.error(`📋 [AGENT 1] Intelligence Report ${report.report_id} generated`);
    console.error(`   Classification: ${report.classification}`);
    console.error(`   Total anomalies: ${report.total_anomaly_count}`);

    return report;
  }

  /**
   * Agent 2 — Adjudicator
   * 
   * Receives the Intelligence Report and calculates a weighted threat_score (0-100).
   * If score >= 80, sets requires_hitl = true for Guard enforcement.
   */
  runAdjudication(report: IntelligenceReport): AdjudicationResult {
    console.error('⚖️  [AGENT 2: ADJUDICATOR] Evaluating Intelligence Report...');

    // Weighted scoring algorithm
    const telecomScore = Math.min(
      (report.telecom_analysis.anomalies_detected.length / 4) * 30,
      30
    );

    const deepfakeScore = Math.min(
      report.deepfake_analysis.ai_synthesis_probability * 35,
      35
    );

    const financialScore = Math.min(
      (report.financial_analysis.mule_indicators.length / 6) * 35,
      35
    );

    const threat_score = Math.round(telecomScore + deepfakeScore + financialScore);

    const threat_level = threat_score >= 80 ? 'CRITICAL' as const
      : threat_score >= 60 ? 'HIGH' as const
      : threat_score >= 40 ? 'MEDIUM' as const
      : 'LOW' as const;

    const requires_hitl = threat_score >= 80;

    const adjudication: AdjudicationResult = {
      adjudication_id: `ADJ-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      threat_score,
      threat_level,
      requires_hitl,
      scoring_breakdown: {
        telecom_score: Math.round(telecomScore),
        deepfake_score: Math.round(deepfakeScore),
        financial_score: Math.round(financialScore),
      },
      recommendation: requires_hitl
        ? 'IMMEDIATE_FREEZE_AND_REPORT — Human-in-the-loop approval required'
        : 'MONITOR_AND_FLAG — Continue surveillance',
      intelligence_report: report,
    };

    this.lastAdjudication = adjudication;

    // Update the shared HITL gate state
    const gate = HitlGateState.getInstance();
    gate.setThreatScore(threat_score);

    console.error(`🎯 [AGENT 2] Threat Score: ${threat_score}/100 (${threat_level})`);
    console.error(`   Telecom: ${Math.round(telecomScore)}/30 | Deepfake: ${Math.round(deepfakeScore)}/35 | Financial: ${Math.round(financialScore)}/35`);
    console.error(`   HITL Required: ${requires_hitl}`);

    if (requires_hitl) {
      // Emit event for the frontend widget
      emitEvent('aegis.hitl_required', {
        adjudication_id: adjudication.adjudication_id,
        threat_score,
        threat_level,
        timestamp: adjudication.timestamp,
      });
    }

    return adjudication;
  }

  /**
   * Get the last adjudication result
   */
  getLastAdjudication(): AdjudicationResult | null {
    return this.lastAdjudication;
  }

  /**
   * Resolve the pending HITL approval.
   * Delegates to HitlGateState singleton.
   */
  resolveApproval(approved: boolean): boolean {
    return HitlGateState.getInstance().resolveApproval(approved);
  }

  /**
   * Check if there is a pending HITL approval
   */
  hasPendingApproval(): boolean {
    return HitlGateState.getInstance().hasPendingApproval();
  }
}
