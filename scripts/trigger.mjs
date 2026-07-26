/**
 * Aegis Protocol — Demo Trigger Runner
 * 
 * Standalone Node.js script that simulates the Aegis threat analysis pipeline
 * by reading scenario-specific mock data and producing colored JSON-RPC logs.
 * 
 * Usage:
 *   node scripts/trigger.mjs safe     → Score ~12, clears normally
 *   node scripts/trigger.mjs medium   → Score ~55, auto-flagged for review
 *   node scripts/trigger.mjs critical → Score ~95, HITL guard fires
 *   node scripts/trigger.mjs          → Defaults to 'critical'
 * 
 * Output: JSON-RPC log entries to stdout + colored console to stderr
 * Log file: logs/stream.log (appended)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// ─── ANSI Colors ────────────────────────────────────────────────────
const C = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  cyan:    '\x1b[36m',
  white:   '\x1b[37m',
  bgRed:   '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow:'\x1b[43m',
  bgBlue:  '\x1b[44m',
};

// ─── Scenario Configuration ─────────────────────────────────────────
const SCENARIOS = {
  safe: {
    suffix: '_safe',
    label: 'SAFE TRANSACTION',
    color: C.green,
    expectedScore: '~12',
  },
  medium: {
    suffix: '_medium',
    label: 'MEDIUM RISK — ASYNC REVIEW',
    color: C.yellow,
    expectedScore: '~55',
  },
  critical: {
    suffix: '',
    label: 'DIGITAL ARREST — STAGE DEMO',
    color: C.red,
    expectedScore: '~95',
  },
};

// ─── Helpers ────────────────────────────────────────────────────────
function timestamp() {
  return new Date().toISOString();
}

function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

function jsonRpcLog(method, params, level = 'info') {
  return {
    jsonrpc: '2.0',
    method,
    params: {
      ...params,
      _timestamp: timestamp(),
      _level: level,
    },
    id: generateId('RPC'),
  };
}

function appendLog(logEntry) {
  const logsDir = path.join(ROOT, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  fs.appendFileSync(
    path.join(logsDir, 'stream.log'),
    JSON.stringify(logEntry) + '\n'
  );
}

function printSeverity(level, message) {
  const colors = {
    info:     `${C.cyan}ℹ${C.reset}`,
    warn:     `${C.yellow}⚠${C.reset}`,
    error:    `${C.red}✖${C.reset}`,
    critical: `${C.bgRed}${C.white}${C.bold} CRITICAL ${C.reset}`,
    success:  `${C.green}✔${C.reset}`,
    phase:    `${C.bgBlue}${C.white}${C.bold} PHASE ${C.reset}`,
  };
  const icon = colors[level] || colors.info;
  const ts = `${C.dim}${timestamp()}${C.reset}`;
  console.error(`  ${ts} ${icon} ${message}`);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Mock Data Reader ───────────────────────────────────────────────
let activeIndex = null;
function readMock(baseName, suffix) {
  const fileName = `${baseName}${suffix}.json`;
  const filePath = path.join(ROOT, 'mocks', fileName);
  
  if (!fs.existsSync(filePath)) {
    console.error(`${C.red}ERROR: Mock file not found: ${filePath}${C.reset}`);
    process.exit(1);
  }
  
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  if (Array.isArray(data)) {
    if (activeIndex === null) {
      activeIndex = Math.floor(Math.random() * data.length);
    }
    return data[activeIndex];
  }
  return data;
}

// ─── Anomaly Analysis ───────────────────────────────────────────────
function analyzeTelecom(telecomEvent) {
  const anomalies = [];
  if (!telecomEvent.stir_shaken_verified) anomalies.push('STIR_SHAKEN_FAILED');
  if (telecomEvent.true_origin?.includes('VoIP')) anomalies.push('VOIP_ORIGIN_FOREIGN');
  if (telecomEvent.true_origin?.includes('Cambodia')) anomalies.push('ORIGIN_CAMBODIA_FLAGGED');
  if (telecomEvent.call_duration_minutes > 60) anomalies.push('EXTENDED_DURATION_COERCION');
  if (telecomEvent.voice_biometrics_flag === 'AI_SYNTHESIS_PROBABLE') anomalies.push('AI_VOICE_SYNTHESIS_DETECTED');
  if (telecomEvent.call_metadata?.srtp_enabled === false) anomalies.push('UNENCRYPTED_VOIP_CHANNEL');
  if (telecomEvent.threat_keywords_detected?.length > 3) anomalies.push('COERCION_KEYWORDS_DETECTED');
  return anomalies;
}

function analyzeMule(bankEvent) {
  const indicators = [];
  const destDetails = bankEvent.destination_details || bankEvent;
  const accountAge = destDetails.account_age_days ?? bankEvent.account_age_days;
  const kycStatus = destDetails.kyc_status ?? bankEvent.kyc_status;

  if (accountAge < 30) indicators.push('NEW_ACCOUNT_SUSPICIOUS');
  if (kycStatus === 'MINIMUM_EKYC') indicators.push('MINIMAL_KYC_VERIFICATION');
  if (kycStatus === 'PARTIAL_KYC') indicators.push('PARTIAL_KYC_INCOMPLETE');
  if (bankEvent.velocity_last_24h?.inbound_transfers > 10) indicators.push('HIGH_INBOUND_VELOCITY');
  if (bankEvent.velocity_last_24h?.outbound_transfers > 10) indicators.push('HIGH_OUTBOUND_VELOCITY');
  if (bankEvent.velocity_last_24h?.current_balance === 0) indicators.push('ZERO_BALANCE_PASSTHROUGH');
  if (bankEvent.attempted_transfer_amount > 100000) indicators.push('HIGH_VALUE_TRANSFER');
  if (bankEvent.rbi_flagged_cluster === true) indicators.push('RBI_FLAGGED_CLUSTER');
  if (bankEvent.velocity_score > 0.8) indicators.push('EXTREME_VELOCITY_SCORE');
  if (bankEvent.device_fingerprint?.root_detected) indicators.push('ROOTED_DEVICE_DETECTED');
  if (bankEvent.device_fingerprint?.vpn_active) indicators.push('VPN_MASKING_DETECTED');
  if (bankEvent.geographic_mismatch?.mismatch_severity === 'HIGH') indicators.push('GEOGRAPHIC_MISMATCH_HIGH');
  return indicators;
}

function calculateScore(telecomAnomalies, deepfakeProbability, muleIndicators) {
  const telecomScore = Math.min((telecomAnomalies.length / 4) * 30, 30);
  const deepfakeScore = Math.min(deepfakeProbability * 35, 35);
  const financialScore = Math.min((muleIndicators.length / 6) * 35, 35);
  return {
    total: Math.round(telecomScore + deepfakeScore + financialScore),
    telecom: Math.round(telecomScore),
    deepfake: Math.round(deepfakeScore),
    financial: Math.round(financialScore),
  };
}

// ═══════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════

async function main() {
  const scenarioArg = (process.argv[2] || 'critical').toLowerCase();
  const scenario = SCENARIOS[scenarioArg];

  if (!scenario) {
    console.error(`${C.red}Unknown scenario: "${scenarioArg}"${C.reset}`);
    console.error(`Valid scenarios: safe, medium, critical`);
    process.exit(1);
  }

  // ─── Banner ──────────────────────────────────────────────────────
  console.error('');
  console.error(`${C.bold}${scenario.color}╔══════════════════════════════════════════════════════════════════╗${C.reset}`);
  console.error(`${C.bold}${scenario.color}║   🛡️  AEGIS PROTOCOL — THREAT FUSION ENGINE                     ║${C.reset}`);
  console.error(`${C.bold}${scenario.color}║   Scenario: ${scenario.label.padEnd(49)}║${C.reset}`);
  console.error(`${C.bold}${scenario.color}║   Expected Score: ${scenario.expectedScore.padEnd(44)}║${C.reset}`);
  console.error(`${C.bold}${scenario.color}╚══════════════════════════════════════════════════════════════════╝${C.reset}`);
  console.error('');

  // ─── Phase 0: Initialize ─────────────────────────────────────────
  const rpcInit = jsonRpcLog('aegis/initialize', {
    scenario: scenarioArg,
    label: scenario.label,
    expected_score: scenario.expectedScore,
  });
  appendLog(rpcInit);
  console.log(JSON.stringify(rpcInit, null, 2));
  printSeverity('phase', `INITIALIZATION — Loading ${scenarioArg} scenario`);
  await sleep(300);

  // ─── Phase 1: Load Mock Data ─────────────────────────────────────
  printSeverity('phase', 'AGENT 1 — INVESTIGATOR');
  await sleep(200);

  const telecomEvent = readMock('telecom_event', scenario.suffix);
  const rpcTelecom = jsonRpcLog('aegis/telecom.analyze', {
    call_id: telecomEvent.call_id,
    caller_id: telecomEvent.incoming_caller_id,
    claimed_identity: telecomEvent.claimed_identity,
    origin: telecomEvent.true_origin,
    stir_shaken: telecomEvent.stir_shaken_attestation,
    duration_min: telecomEvent.call_duration_minutes,
  });
  appendLog(rpcTelecom);
  console.log(JSON.stringify(rpcTelecom, null, 2));
  printSeverity('info', `Telecom: ${telecomEvent.call_id} | Caller: ${telecomEvent.incoming_caller_id} | Origin: ${telecomEvent.true_origin}`);
  await sleep(400);

  // Telecom anomalies
  const telecomAnomalies = analyzeTelecom(telecomEvent);
  const rpcTelecomResult = jsonRpcLog('aegis/telecom.result', {
    anomalies: telecomAnomalies,
    count: telecomAnomalies.length,
    risk: telecomAnomalies.length >= 3 ? 'CRITICAL' : telecomAnomalies.length >= 2 ? 'HIGH' : 'LOW',
  }, telecomAnomalies.length >= 3 ? 'critical' : 'info');
  appendLog(rpcTelecomResult);
  console.log(JSON.stringify(rpcTelecomResult, null, 2));

  for (const a of telecomAnomalies) {
    printSeverity(telecomAnomalies.length >= 3 ? 'error' : 'warn', `  🔻 ${a}`);
    await sleep(100);
  }
  if (telecomAnomalies.length === 0) {
    printSeverity('success', '  ✅ No telecom anomalies detected');
  }
  await sleep(300);

  // Deepfake analysis
  const deepfake = telecomEvent.deepfake_analysis || {
    ai_synthesis_probability: 0.03,
    verdict: 'HUMAN_VOICE_CONFIRMED',
    spectral_anomalies: [],
  };
  const rpcDeepfake = jsonRpcLog('aegis/deepfake.analyze', {
    probability: deepfake.ai_synthesis_probability,
    verdict: deepfake.verdict,
    spectral_anomalies: deepfake.spectral_anomalies,
    model: deepfake.model_version || 'VoiceShield-v3',
  }, deepfake.ai_synthesis_probability > 0.8 ? 'critical' : 'info');
  appendLog(rpcDeepfake);
  console.log(JSON.stringify(rpcDeepfake, null, 2));
  printSeverity(
    deepfake.ai_synthesis_probability > 0.8 ? 'error' : deepfake.ai_synthesis_probability > 0.3 ? 'warn' : 'success',
    `Deepfake: ${(deepfake.ai_synthesis_probability * 100).toFixed(0)}% AI probability — ${deepfake.verdict}`
  );
  await sleep(300);

  // Bank / mule analysis
  const bankEvent = readMock('bank_event', scenario.suffix);
  const rpcBank = jsonRpcLog('aegis/mule_graph.query', {
    transaction_id: bankEvent.transaction_id,
    destination: bankEvent.destination_account,
    amount: bankEvent.attempted_transfer_amount,
    velocity_score: bankEvent.velocity_score,
    rbi_flagged: bankEvent.rbi_flagged_cluster,
  });
  appendLog(rpcBank);
  console.log(JSON.stringify(rpcBank, null, 2));
  printSeverity('info', `Bank: ${bankEvent.transaction_id} | Dest: ${bankEvent.destination_account} | ₹${bankEvent.attempted_transfer_amount.toLocaleString('en-IN')}`);
  await sleep(400);

  const muleIndicators = analyzeMule(bankEvent);
  const rpcMuleResult = jsonRpcLog('aegis/mule_graph.result', {
    indicators: muleIndicators,
    count: muleIndicators.length,
    probability: muleIndicators.length >= 6 ? 'CONFIRMED_MULE' : muleIndicators.length >= 3 ? 'PROBABLE_MULE' : 'LOW_RISK',
  }, muleIndicators.length >= 6 ? 'critical' : 'info');
  appendLog(rpcMuleResult);
  console.log(JSON.stringify(rpcMuleResult, null, 2));

  for (const m of muleIndicators) {
    printSeverity(muleIndicators.length >= 6 ? 'error' : 'warn', `  🔻 ${m}`);
    await sleep(100);
  }
  if (muleIndicators.length === 0) {
    printSeverity('success', '  ✅ No mule indicators detected');
  }
  await sleep(500);

  // ─── Phase 2: Adjudication ───────────────────────────────────────
  console.error('');
  printSeverity('phase', 'AGENT 2 — ADJUDICATOR');
  await sleep(200);

  const scores = calculateScore(telecomAnomalies, deepfake.ai_synthesis_probability, muleIndicators);
  const threatLevel = scores.total >= 80 ? 'CRITICAL' : scores.total >= 60 ? 'HIGH' : scores.total >= 40 ? 'MEDIUM' : 'LOW';
  const requiresHitl = scores.total >= 80;

  const adjudicationId = generateId('ADJ');
  const rpcAdjudication = jsonRpcLog('aegis/adjudicate', {
    adjudication_id: adjudicationId,
    threat_score: scores.total,
    threat_level: threatLevel,
    requires_hitl: requiresHitl,
    scoring_breakdown: {
      telecom: `${scores.telecom}/30`,
      deepfake: `${scores.deepfake}/35`,
      financial: `${scores.financial}/35`,
    },
    recommendation: requiresHitl
      ? 'IMMEDIATE_FREEZE_AND_REPORT'
      : scores.total >= 40
        ? 'MONITOR_AND_FLAG'
        : 'CLEAR_TRANSACTION',
  }, requiresHitl ? 'critical' : scores.total >= 40 ? 'warn' : 'info');
  appendLog(rpcAdjudication);
  console.log(JSON.stringify(rpcAdjudication, null, 2));

  // Score visualization
  const scoreBar = '█'.repeat(Math.round(scores.total / 5)) + '░'.repeat(20 - Math.round(scores.total / 5));
  const scoreColor = scores.total >= 80 ? C.red : scores.total >= 40 ? C.yellow : C.green;
  console.error('');
  console.error(`  ${C.bold}${scoreColor}  ┌─────────────────────────────────────────────┐${C.reset}`);
  console.error(`  ${C.bold}${scoreColor}  │  THREAT SCORE: ${scores.total}/100  [${scoreBar}]  │${C.reset}`);
  console.error(`  ${C.bold}${scoreColor}  │  Level: ${threatLevel.padEnd(10)} HITL: ${requiresHitl ? 'YES ⚠️ ' : 'NO  ✅'}              │${C.reset}`);
  console.error(`  ${C.bold}${scoreColor}  │  Telecom: ${String(scores.telecom).padEnd(3)}/30  Deepfake: ${String(scores.deepfake).padEnd(3)}/35  Financial: ${String(scores.financial).padEnd(3)}/35  │${C.reset}`);
  console.error(`  ${C.bold}${scoreColor}  └─────────────────────────────────────────────┘${C.reset}`);
  console.error('');
  await sleep(300);

  // ─── Phase 3: Resolution ─────────────────────────────────────────
  if (requiresHitl) {
    // CRITICAL path — Guard fires
    console.error(`${C.bgRed}${C.white}${C.bold}`);
    console.error('  ╔══════════════════════════════════════════════════════════════╗');
    console.error('  ║        🚨 HITL GUARD ACTIVATED — HUMAN APPROVAL NEEDED 🚨  ║');
    console.error('  ║                                                              ║');
    console.error('  ║   The @ThreatScoreGuard has blocked dispatch_mha_alert.     ║');
    console.error('  ║   Fraud officer must click FREEZE & REPORT in the dashboard.║');
    console.error('  ║                                                              ║');
    console.error('  ╠══════════════════════════════════════════════════════════════╣');
    console.error(`  ║   Adjudication ID: ${adjudicationId.padEnd(41)}║`);
    console.error(`  ║   Threat Score:    ${scores.total}/100${' '.repeat(38)}║`);
    console.error(`  ║   Timestamp:       ${timestamp().substring(0, 24).padEnd(41)}║`);
    console.error('  ╚══════════════════════════════════════════════════════════════╝');
    console.error(`${C.reset}`);

    const rpcGuard = jsonRpcLog('aegis/guard.hitl_activated', {
      adjudication_id: adjudicationId,
      threat_score: scores.total,
      gate_status: 'AWAITING_HUMAN_APPROVAL',
      timeout_seconds: 300,
    }, 'critical');
    appendLog(rpcGuard);
    console.log(JSON.stringify(rpcGuard, null, 2));

    // Simulate guard approval after 3 seconds
    await sleep(3000);
    printSeverity('success', '✅ HITL approval GRANTED by fraud officer');

    const alertId = generateId('MHA');
    const rpcDispatch = jsonRpcLog('aegis/mha_alert.dispatched', {
      alert_id: alertId,
      threat_score: scores.total,
      actions: [
        'ACCOUNT_FROZEN',
        'INTELLIGENCE_REPORT_FILED_I4C',
        'TELECOM_BLACKLIST_REQUESTED',
        'TRANSACTION_REVERSAL_INITIATED',
      ],
      destination: 'MHA_I4C_CYBERCRIME_COORDINATION_CENTRE',
    }, 'critical');
    appendLog(rpcDispatch);
    console.log(JSON.stringify(rpcDispatch, null, 2));

    console.error('');
    console.error(`  ${C.green}${C.bold}╔══════════════════════════════════════════════════════════════╗${C.reset}`);
    console.error(`  ${C.green}${C.bold}║        ✅ MHA CYBERCRIME ALERT DISPATCHED ✅                ║${C.reset}`);
    console.error(`  ${C.green}${C.bold}╠══════════════════════════════════════════════════════════════╣${C.reset}`);
    console.error(`  ${C.green}${C.bold}║  Alert ID:  ${alertId.padEnd(49)}║${C.reset}`);
    console.error(`  ${C.green}${C.bold}║  ✅ Suspect account FROZEN                                  ║${C.reset}`);
    console.error(`  ${C.green}${C.bold}║  ✅ Intelligence Report filed with I4C                      ║${C.reset}`);
    console.error(`  ${C.green}${C.bold}║  ✅ Telecom operator notified for caller blacklist           ║${C.reset}`);
    console.error(`  ${C.green}${C.bold}║  ✅ Victim bank notified for transaction reversal            ║${C.reset}`);
    console.error(`  ${C.green}${C.bold}╚══════════════════════════════════════════════════════════════╝${C.reset}`);
    console.error('');

  } else if (scores.total >= 40) {
    // MEDIUM path — Auto-flagged
    printSeverity('warn', '🔶 Transaction auto-flagged for asynchronous review');
    printSeverity('warn', '   Fraud analyst team notified. No live interception.');

    const rpcFlag = jsonRpcLog('aegis/flag.async_review', {
      adjudication_id: adjudicationId,
      threat_score: scores.total,
      action: 'AUTO_FLAGGED_ASYNC_REVIEW',
      reviewer_queue: 'FRAUD_ANALYST_TEAM_B',
      sla_hours: 24,
    }, 'warn');
    appendLog(rpcFlag);
    console.log(JSON.stringify(rpcFlag, null, 2));

  } else {
    // SAFE path — Clears normally
    printSeverity('success', '✅ Transaction cleared. No anomalies detected.');

    const rpcClear = jsonRpcLog('aegis/transaction.cleared', {
      adjudication_id: adjudicationId,
      threat_score: scores.total,
      action: 'CLEARED',
      reason: 'Below monitoring threshold',
    });
    appendLog(rpcClear);
    console.log(JSON.stringify(rpcClear, null, 2));
  }

  // Final summary
  const rpcComplete = jsonRpcLog('aegis/pipeline.complete', {
    scenario: scenarioArg,
    threat_score: scores.total,
    threat_level: threatLevel,
    requires_hitl: requiresHitl,
    total_rpc_events: 'see logs/stream.log',
  });
  appendLog(rpcComplete);
  console.log(JSON.stringify(rpcComplete, null, 2));

  console.error('');
  printSeverity('success', `Pipeline complete. Scenario: ${scenarioArg} | Score: ${scores.total}/100 | Level: ${threatLevel}`);
  console.error('');
}

main().catch(err => {
  console.error(`${C.red}Fatal error: ${err.message}${C.reset}`);
  process.exit(1);
});
