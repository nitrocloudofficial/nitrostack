/**
 * Evaluate Applicant — Inline HTML Widget Component
 *
 * Renders approval/rejection status, probability gauge, score breakdown,
 * and risk factors as a styled dashboard inside NitroStudio.
 *
 * Data is injected by NitroStudio into `window.openai.toolOutput`.
 */

import { createComponent } from '@nitrostack/core';

export const evaluateApplicantWidget = createComponent({
  id: 'evaluate-applicant',
  name: 'Applicant Evaluation Dashboard',
  description: 'Renders loan evaluation results with score breakdown and risk factors',
  html: `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, sans-serif;
  background: #0a0a0f;
  color: #e2e8f0;
  padding: 20px;
  min-height: 100px;
}
.dashboard {
  max-width: 680px;
  margin: 0 auto;
}
.header {
  text-align: center;
  margin-bottom: 24px;
}
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  border-radius: 50px;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}
.status-approved {
  background: linear-gradient(135deg, rgba(16,185,129,0.2), rgba(52,211,153,0.1));
  color: #34d399;
  border: 1px solid rgba(52,211,153,0.3);
  box-shadow: 0 0 20px rgba(52,211,153,0.15);
}
.status-rejected {
  background: linear-gradient(135deg, rgba(239,68,68,0.2), rgba(248,113,113,0.1));
  color: #f87171;
  border: 1px solid rgba(248,113,113,0.3);
  box-shadow: 0 0 20px rgba(248,113,113,0.15);
}
.probability-container {
  text-align: center;
  margin: 24px 0;
}
.probability-ring {
  position: relative;
  width: 140px;
  height: 140px;
  margin: 0 auto 12px;
}
.probability-ring svg {
  transform: rotate(-90deg);
}
.probability-ring .value {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -1px;
}
.probability-label {
  font-size: 13px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 1.5px;
}
.card {
  background: rgba(30, 30, 46, 0.7);
  border: 1px solid rgba(148,163,184,0.12);
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 16px;
  backdrop-filter: blur(10px);
}
.card-title {
  font-size: 14px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.score-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid rgba(148,163,184,0.08);
}
.score-row:last-child { border-bottom: none; }
.score-label {
  font-size: 14px;
  color: #cbd5e1;
}
.score-bar-container {
  flex: 1;
  margin: 0 16px;
  height: 6px;
  background: rgba(148,163,184,0.1);
  border-radius: 3px;
  overflow: hidden;
}
.score-bar {
  height: 100%;
  border-radius: 3px;
  transition: width 0.8s ease;
}
.score-value {
  font-size: 14px;
  font-weight: 700;
  min-width: 50px;
  text-align: right;
}
.risk-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: rgba(251,191,36,0.1);
  border: 1px solid rgba(251,191,36,0.2);
  border-radius: 8px;
  font-size: 13px;
  color: #fbbf24;
  margin: 4px;
}
.message-box {
  padding: 16px 20px;
  border-radius: 10px;
  font-size: 14px;
  line-height: 1.6;
  margin-top: 16px;
}
.message-approved {
  background: rgba(16,185,129,0.08);
  border: 1px solid rgba(52,211,153,0.2);
  color: #6ee7b7;
}
.message-rejected {
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(248,113,113,0.2);
  color: #fca5a5;
}

/* Simulator styles */
.sim-section-title {
  font-size: 14px;
  font-weight: 700;
  color: #818cf8;
  margin-top: 20px;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.slider-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}
@media (max-width: 500px) {
  .slider-grid { grid-template-columns: 1fr; }
}
.slider-card {
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(148, 163, 184, 0.08);
  border-radius: 10px;
  padding: 10px 14px;
}
.slider-info {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 4px;
}
.slider-val {
  font-weight: 700;
  color: #f1f5f9;
}
.sim-range {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  background: rgba(148, 163, 184, 0.15);
  border-radius: 2px;
  outline: none;
  margin: 6px 0;
}
.sim-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  background: #6366f1;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 0 8px rgba(99,102,241,0.6);
}
.sim-range::-moz-range-thumb {
  width: 12px;
  height: 12px;
  background: #6366f1;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 0 8px rgba(99,102,241,0.6);
}
.policy-card {
  background: rgba(30, 41, 59, 0.3);
  border: 1px solid rgba(148,163,184,0.1);
  border-radius: 12px;
  padding: 14px;
  margin-top: 12px;
}
.policy-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  padding: 6px 0;
  border-bottom: 1px solid rgba(148,163,184,0.05);
}
.policy-row:last-child { border-bottom: none; }
.policy-status {
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
}
.policy-pass {
  background: rgba(16,185,129,0.1);
  color: #34d399;
  border: 1px solid rgba(52,211,153,0.2);
}
.policy-fail {
  background: rgba(239,68,68,0.1);
  color: #f87171;
  border: 1px solid rgba(248,113,113,0.2);
}
.reset-btn {
  display: block;
  width: 100%;
  padding: 8px;
  margin-top: 12px;
  background: rgba(99,102,241,0.12);
  border: 1px solid rgba(99,102,241,0.25);
  color: #a5b4fc;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}
.reset-btn:hover {
  background: rgba(99,102,241,0.2);
  color: #ffffff;
}
</style>
</head>
<body>
<div id="root">Loading...</div>
<script>
(function() {
  var data = (window.openai && window.openai.toolOutput) || {};

  // Simulator state variables
  var simCreditScore = null;
  var simDti = null;
  var simIncome = null;
  var simHistory = null;
  var simSavings = null;
  var simDebt = null;
  var isSimActive = false;

  var APPROVAL_THRESHOLD = 0.65;
  var SCORING_WEIGHTS = {
    CREDIT_SCORE: 35,
    DTI: 30,
    INCOME: 20,
    CREDIT_HISTORY: 15
  };
  var CREDIT_SCORE_CONST = { FLOOR: 300, PRIME: 660, SUPER_PRIME: 740, CEILING: 850 };
  var DTI_CONST = { EXCELLENT: 0.36, QUALIFIED_MAX: 0.43 };
  var INCOME_CONST = { STRONG: 60000, MINIMUM: 40000 };
  var CREDIT_HISTORY_CONST = { ESTABLISHED: 5, MINIMUM_YEARS: 2 };
  var SAVINGS_CONST = { MIN_RESERVE_MONTHS: 3 };

  function getColor(pct) {
    if (pct >= 65) return '#34d399';
    if (pct >= 50) return '#fbbf24';
    return '#f87171';
  }

  function interpolate(value, bp) {
    if (value <= bp[0][0]) return bp[0][1];
    if (value >= bp[bp.length - 1][0]) return bp[bp.length - 1][1];
    for (var i = 0; i < bp.length - 1; i++) {
      var x0 = bp[i][0];
      var y0 = bp[i][1];
      var x1 = bp[i+1][0];
      var y1 = bp[i+1][1];
      if (value >= x0 && value <= x1) {
        return y0 + ((value - x0) / (x1 - x0)) * (y1 - y0);
      }
    }
    return 0;
  }

  function evaluateProfile(creditScore, dti, annualIncome, creditHistoryYears, liquidSavings, monthlyDebtPayment) {
    var creditScorePoints = interpolate(creditScore, [
      [CREDIT_SCORE_CONST.FLOOR, 0],
      [CREDIT_SCORE_CONST.PRIME, 25],
      [CREDIT_SCORE_CONST.SUPER_PRIME, SCORING_WEIGHTS.CREDIT_SCORE],
      [CREDIT_SCORE_CONST.CEILING, SCORING_WEIGHTS.CREDIT_SCORE]
    ]);

    var dtiPoints = interpolate(dti, [
      [0.0, SCORING_WEIGHTS.DTI],
      [DTI_CONST.EXCELLENT, SCORING_WEIGHTS.DTI],
      [DTI_CONST.QUALIFIED_MAX, 20],
      [0.60, 5],
      [1.0, 0]
    ]);

    var incomePoints = interpolate(annualIncome, [
      [0, 0],
      [INCOME_CONST.MINIMUM, 12],
      [INCOME_CONST.STRONG, SCORING_WEIGHTS.INCOME],
      [200000, SCORING_WEIGHTS.INCOME]
    ]);

    var historyPoints = interpolate(creditHistoryYears, [
      [0, 0],
      [CREDIT_HISTORY_CONST.MINIMUM_YEARS, 8],
      [CREDIT_HISTORY_CONST.ESTABLISHED, SCORING_WEIGHTS.CREDIT_HISTORY],
      [30, SCORING_WEIGHTS.CREDIT_HISTORY]
    ]);

    var totalScore = creditScorePoints + dtiPoints + incomePoints + historyPoints;
    var approvalProbability = totalScore / 100;

    var riskFactors = [];
    if (creditScore < CREDIT_SCORE_CONST.PRIME && creditScore > 0) {
      riskFactors.push("Credit score " + creditScore + " is below prime threshold (" + CREDIT_SCORE_CONST.PRIME + ")");
    }
    if (dti > DTI_CONST.QUALIFIED_MAX) {
      riskFactors.push("DTI ratio " + (dti * 100).toFixed(1) + "% exceeds qualified maximum (" + (DTI_CONST.QUALIFIED_MAX * 100).toFixed(1) + "%)");
    }
    if (dti > 0.60) {
      riskFactors.push("DTI ratio " + (dti * 100).toFixed(1) + "% is severely elevated — immediate debt reduction is critical");
    }
    if (annualIncome > 0 && annualIncome < INCOME_CONST.MINIMUM) {
      riskFactors.push("Annual income $" + annualIncome.toLocaleString() + " is below minimum ($" + INCOME_CONST.MINIMUM.toLocaleString() + ")");
    }
    if (creditHistoryYears < CREDIT_HISTORY_CONST.MINIMUM_YEARS) {
      riskFactors.push("Credit history " + creditHistoryYears + " year(s) is below minimum (" + CREDIT_HISTORY_CONST.MINIMUM_YEARS + " years)");
    }
    if (monthlyDebtPayment > 0 && liquidSavings < monthlyDebtPayment * SAVINGS_CONST.MIN_RESERVE_MONTHS) {
      riskFactors.push("Liquid savings $" + liquidSavings.toLocaleString() + " is below " + SAVINGS_CONST.MIN_RESERVE_MONTHS + "-month reserve requirement ($" + (monthlyDebtPayment * SAVINGS_CONST.MIN_RESERVE_MONTHS).toLocaleString() + ")");
    }

    return {
      status: approvalProbability >= APPROVAL_THRESHOLD ? 'APPROVED' : 'REJECTED',
      approvalProbability: (approvalProbability * 100).toFixed(1) + '%',
      riskFactors: riskFactors,
      scoreBreakdown: {
        creditScoreComponent: { score: creditScorePoints, maxScore: SCORING_WEIGHTS.CREDIT_SCORE, input: creditScore, label: 'Credit Score' },
        dtiComponent: { score: dtiPoints, maxScore: SCORING_WEIGHTS.DTI, input: dti, label: 'DTI Ratio' },
        incomeComponent: { score: incomePoints, maxScore: SCORING_WEIGHTS.INCOME, input: annualIncome, label: 'Annual Income' },
        creditHistoryComponent: { score: historyPoints, maxScore: SCORING_WEIGHTS.CREDIT_HISTORY, input: creditHistoryYears, label: 'Credit History' },
        totalScore: totalScore
      }
    };
  }

  function render() {
    var root = document.getElementById('root');

    // Base actual values
    var cScoreActual = data.scoreBreakdown && data.scoreBreakdown.creditScoreComponent ? data.scoreBreakdown.creditScoreComponent.input : 645;
    var dtiValActual = data.scoreBreakdown && data.scoreBreakdown.dtiComponent ? data.scoreBreakdown.dtiComponent.input : 0.52;
    var incValActual = data.scoreBreakdown && data.scoreBreakdown.incomeComponent ? data.scoreBreakdown.incomeComponent.input : 58000;
    var histValActual = data.scoreBreakdown && data.scoreBreakdown.creditHistoryComponent ? data.scoreBreakdown.creditHistoryComponent.input : 4;
    
    var savValActual = 3200;
    var debtValActual = 2513;
    if (data.riskFactors) {
      data.riskFactors.forEach(function(r) {
        var m1 = r.match(/Liquid savings \$([0-9,]+)/i);
        if (m1) savValActual = parseInt(m1[1].replace(/,/g, ''));
        var m2 = r.match(/reserve requirement \$([0-9,]+)/i);
        if (m2) {
          var reserve = parseInt(m2[1].replace(/,/g, ''));
          debtValActual = Math.round(reserve / 3);
        }
      });
    }

    if (simCreditScore === null) {
      simCreditScore = cScoreActual;
      simDti = dtiValActual;
      simIncome = incValActual;
      simHistory = histValActual;
      simSavings = savValActual;
      simDebt = debtValActual;
    }

    var decision, probStr, probNum, isApproved, color, bd, risks, msg;

    if (isSimActive) {
      var simResult = evaluateProfile(simCreditScore, simDti, simIncome, simHistory, simSavings, simDebt);
      
      // Dynamic policy checks for visual compliance feedback
      var policyChecks = {
        credit: simCreditScore >= 660,
        dti: simDti <= 0.43,
        savings: simSavings >= simDebt * 3
      };
      var policyPass = policyChecks.credit && policyChecks.dti && policyChecks.savings;
      
      isApproved = (parseFloat(simResult.approvalProbability) >= 65) && policyPass;
      decision = isApproved ? 'APPROVED' : 'REJECTED';
      probStr = simResult.approvalProbability;
      probNum = parseFloat(probStr);
      color = getColor(probNum);
      bd = simResult.scoreBreakdown;
      risks = simResult.riskFactors;
      msg = isApproved 
        ? '✅ Simulation approves! The applicant meets both mathematical score (>=65%) and lender policy guidelines.' 
        : '❌ Simulation rejected. Underwriting rules require Credit Score >= 660, DTI <= 43%, and Reserves >= 3 months of debt payments.';
    } else {
      decision = data.decision || 'UNKNOWN';
      probStr = data.approvalProbability || '0%';
      probNum = parseFloat(probStr);
      isApproved = decision === 'APPROVED';
      color = getColor(probNum);
      bd = data.scoreBreakdown || {};
      risks = data.riskFactors || [];
      msg = data.message || '';
    }

    var radius = 58;
    var circ = 2 * Math.PI * radius;
    var offset = circ - (probNum / 100) * circ;

    var components = [
      { label: 'Credit Score', comp: bd.creditScoreComponent },
      { label: 'DTI Ratio', comp: bd.dtiComponent },
      { label: 'Income', comp: bd.incomeComponent },
      { label: 'Credit History', comp: bd.creditHistoryComponent },
    ];

    var scoreHtml = components.map(function(c) {
      if (!c.comp) return '';
      var pct = c.comp.maxScore > 0 ? (c.comp.score / c.comp.maxScore * 100) : 0;
      var barColor = getColor(pct);
      
      var dispVal = c.label === 'DTI Ratio' 
        ? (c.comp.input * 100).toFixed(1) + '%' 
        : (c.label === 'Annual Income' ? '$' + c.comp.input.toLocaleString() : c.comp.input);

      return '<div class="score-row">' +
        '<span class="score-label">' + c.label + ' <span style="font-size:11px;color:#64748b;">(' + dispVal + ')</span></span>' +
        '<div class="score-bar-container"><div class="score-bar" style="width:' + pct + '%;background:' + barColor + ';"></div></div>' +
        '<span class="score-value" style="color:' + barColor + '">' + c.comp.score.toFixed(1) + '/' + c.comp.maxScore + '</span>' +
      '</div>';
    }).join('');

    var riskHtml = risks.map(function(r) {
      return '<span class="risk-tag">⚠ ' + r + '</span>';
    }).join('');

    // Dynamic policy rows for simulation feedback
    var currentCredit = isSimActive ? simCreditScore : cScoreActual;
    var currentDti = isSimActive ? simDti : dtiValActual;
    var currentSavings = isSimActive ? simSavings : savValActual;
    var currentDebt = isSimActive ? simDebt : debtValActual;

    var pChecks = {
      credit: currentCredit >= 660,
      dti: currentDti <= 0.43,
      savings: currentSavings >= currentDebt * 3
    };

    var policyHtml = 
      '<div class="policy-card">' +
        '<div class="card-title" style="margin-bottom:8px;font-size:12px;color:#a5b4fc;">📋 Lender Policy Rules</div>' +
        '<div class="policy-row"><span>FICO Credit Score (Min 660)</span><span class="policy-status ' + (pChecks.credit ? 'policy-pass' : 'policy-fail') + '">' + (pChecks.credit ? 'PASS (' + currentCredit + ')' : 'FAIL (' + currentCredit + ')') + '</span></div>' +
        '<div class="policy-row"><span>Debt-to-Income Ratio (Max 43%)</span><span class="policy-status ' + (pChecks.dti ? 'policy-pass' : 'policy-fail') + '">' + (pChecks.dti ? 'PASS (' + Math.round(currentDti * 100) + '%)' : 'FAIL (' + Math.round(currentDti * 100) + '%)') + '</span></div>' +
        '<div class="policy-row"><span>Liquid Reserves (Min 3 months debt)</span><span class="policy-status ' + (pChecks.savings ? 'policy-pass' : 'policy-fail') + '">' + (pChecks.savings ? 'PASS ($' + currentSavings.toLocaleString() + ')' : 'FAIL ($' + currentSavings.toLocaleString() + ' / $' + (currentDebt * 3).toLocaleString() + ')') + '</span></div>' +
      '</div>';

    var simulatorHtml = 
      '<div class="sim-section-title">🔧 Interactive Profile Sim</div>' +
      '<div class="slider-grid">' +
        '<div class="slider-card">' +
          '<div class="slider-info"><span>Credit Score</span><span class="slider-val">' + simCreditScore + '</span></div>' +
          '<input type="range" class="sim-range" id="slide-credit" min="300" max="850" value="' + simCreditScore + '">' +
        '</div>' +
        '<div class="slider-card">' +
          '<div class="slider-info"><span>DTI Ratio</span><span class="slider-val">' + Math.round(simDti * 100) + '%</span></div>' +
          '<input type="range" class="sim-range" id="slide-dti" min="0" max="100" value="' + Math.round(simDti * 100) + '">' +
        '</div>' +
        '<div class="slider-card">' +
          '<div class="slider-info"><span>Annual Income</span><span class="slider-val">$' + simIncome.toLocaleString() + '</span></div>' +
          '<input type="range" class="sim-range" id="slide-income" min="10000" max="200000" step="1000" value="' + simIncome + '">' +
        '</div>' +
        '<div class="slider-card">' +
          '<div class="slider-info"><span>Liquid Savings</span><span class="slider-val">$' + simSavings.toLocaleString() + '</span></div>' +
          '<input type="range" class="sim-range" id="slide-savings" min="0" max="50000" step="250" value="' + simSavings + '">' +
        '</div>' +
        '<div class="slider-card">' +
          '<div class="slider-info"><span>Monthly Debt</span><span class="slider-val">$' + simDebt.toLocaleString() + '</span></div>' +
          '<input type="range" class="sim-range" id="slide-debt" min="0" max="10000" step="50" value="' + simDebt + '">' +
        '</div>' +
        '<div class="slider-card">' +
          '<div class="slider-info"><span>History (Years)</span><span class="slider-val">' + simHistory + ' yr</span></div>' +
          '<input type="range" class="sim-range" id="slide-history" min="0" max="30" value="' + simHistory + '">' +
        '</div>' +
      '</div>' +
      (isSimActive ? '<button class="reset-btn" id="btn-reset">Reset to Original Profile</button>' : '');

    root.innerHTML =
      '<div class="dashboard">' +
        '<div class="header">' +
          '<div class="status-badge ' + (isApproved ? 'status-approved' : 'status-rejected') + '">' +
            (isApproved ? '✅' : '❌') + ' ' + decision + (isSimActive ? ' (SIMULATION)' : '') +
          '</div>' +
        '</div>' +
        '<div class="probability-container">' +
          '<div class="probability-ring">' +
            '<svg width="140" height="140" viewBox="0 0 140 140">' +
              '<circle cx="70" cy="70" r="' + radius + '" fill="none" stroke="rgba(148,163,184,0.1)" stroke-width="8"/>' +
              '<circle cx="70" cy="70" r="' + radius + '" fill="none" stroke="' + color + '" stroke-width="8" stroke-linecap="round" stroke-dasharray="' + circ + '" stroke-dashoffset="' + offset + '"/>' +
            '</svg>' +
            '<span class="value" style="color:' + color + '">' + probStr + '</span>' +
          '</div>' +
          '<div class="probability-label">Approval Probability</div>' +
        '</div>' +
        '<div class="card">' +
          '<div class="card-title">📊 Continuous Score Breakdown</div>' +
          scoreHtml +
          (bd.totalScore !== undefined ? '<div class="score-row" style="border-top:1px solid rgba(148,163,184,0.15);margin-top:8px;padding-top:12px;"><span class="score-label" style="font-weight:700;">Composite Scoring Sum</span><span class="score-value" style="color:' + color + ';font-size:16px;">' + bd.totalScore.toFixed(1) + '%</span></div>' : '') +
        '</div>' +
        (risks.length > 0 ? '<div class="card"><div class="card-title">⚠️ Identified Risk Gaps</div><div style="display:flex;flex-wrap:wrap;margin:-4px;">' + riskHtml + '</div></div>' : '') +
        policyHtml +
        '<div class="message-box ' + (isApproved ? 'message-approved' : 'message-rejected') + '">' + msg + '</div>' +
        simulatorHtml +
      '</div>';

    // Hook up listeners
    var sCredit = document.getElementById('slide-credit');
    var sDti = document.getElementById('slide-dti');
    var sIncome = document.getElementById('slide-income');
    var sSavings = document.getElementById('slide-savings');
    var sDebt = document.getElementById('slide-debt');
    var sHistory = document.getElementById('slide-history');
    var btnReset = document.getElementById('btn-reset');

    if (sCredit) {
      function onSlideChange() {
        isSimActive = true;
        simCreditScore = parseInt(sCredit.value);
        simDti = parseInt(sDti.value) / 100;
        simIncome = parseInt(sIncome.value);
        simSavings = parseInt(sSavings.value);
        simDebt = parseInt(sDebt.value);
        simHistory = parseInt(sHistory.value);
        render();
      }

      sCredit.addEventListener('input', onSlideChange);
      sDti.addEventListener('input', onSlideChange);
      sIncome.addEventListener('input', onSlideChange);
      sSavings.addEventListener('input', onSlideChange);
      sDebt.addEventListener('input', onSlideChange);
      sHistory.addEventListener('input', onSlideChange);
    }

    if (btnReset) {
      btnReset.addEventListener('click', function() {
        isSimActive = false;
        simCreditScore = null;
        render();
      });
    }
  }

  function handleMessage(event) {
    fetch('http://localhost:3001/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: event.data,
        origin: event.origin
      })
    }).catch(function() {});

    if (!event.data) return;

    var payload = null;
    if (event.data.type === 'toolOutput') {
      payload = event.data.data;
    } else if (event.data.type === 'NITRO_INJECT_OPENAI' && event.data.data) {
      payload = event.data.data.toolOutput;
    }

    if (payload) {
      data = payload;
      // Reset simulator on new data
      isSimActive = false;
      simCreditScore = null;
      render();
    }
  }

  window.addEventListener('message', handleMessage);

  if (window.openai && window.openai.toolOutput) {
    render();
  } else {
    setTimeout(render, 100);
  }
})();
</script>
</body>
</html>`,
});
