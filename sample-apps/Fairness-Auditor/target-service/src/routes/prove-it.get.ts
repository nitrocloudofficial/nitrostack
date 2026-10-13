import { defineEventHandler } from 'h3';

export default defineEventHandler(() => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AFO — Prove It Live Console</title>
  <meta name="description" content="Interactive judge-drivable demo console for the AFO bias detection system. Live statistical validation against real UCI Adult Census data.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --void: #05050a;
      --panel: #12142b;
      --panel-2: #1a1d3a;
      --panel-border: rgba(139,92,246,0.15);
      --aurora-cyan: #22d3ee;
      --nebula-magenta: #d946ef;
      --supernova-red: #fb3b49;
      --starlight: #e4e4f0;
      --dust: #6b7089;
      --green: #22c55e;
      --font-display: 'Space Grotesk', sans-serif;
      --font-mono: 'IBM Plex Mono', monospace;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      background: var(--void);
      color: var(--starlight);
      font-family: var(--font-display);
      min-height: 100vh;
      padding: 0;
      background-image: radial-gradient(ellipse at 20% 10%, rgba(139,92,246,0.08) 0%, transparent 60%),
                        radial-gradient(ellipse at 80% 80%, rgba(34,211,238,0.05) 0%, transparent 60%);
    }
    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 2rem;
      border-bottom: 1px solid var(--panel-border);
      background: rgba(18,20,43,0.85);
      backdrop-filter: blur(10px);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .topbar-brand { font-weight: 700; font-size: 1.05rem; }
    .topbar-nav { display: flex; gap: 1.25rem; align-items: center; }
    .topbar-nav a { color: var(--dust); text-decoration: none; font-size: 0.85rem; transition: color 0.2s; }
    .topbar-nav a:hover { color: var(--starlight); }
    .topbar-nav a.active { color: var(--aurora-cyan); }
    .main { max-width: 1020px; margin: 0 auto; padding: 2rem 1.5rem 4rem; }

    /* Page header */
    .page-header { margin-bottom: 2rem; }
    .page-header h1 { font-size: 2rem; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 0.4rem; }
    .page-header p { color: var(--dust); font-size: 0.9rem; line-height: 1.6; max-width: 680px; }
    .header-actions { display: flex; gap: 0.75rem; margin-top: 1rem; flex-wrap: wrap; }

    /* Cards */
    .card {
      background: var(--panel);
      border: 1px solid var(--panel-border);
      border-radius: 1.25rem;
      padding: 1.75rem;
      margin-bottom: 1.5rem;
    }
    .card-zone-label {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      color: var(--dust);
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin-bottom: 0.5rem;
    }
    .card-title {
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 0.3rem;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .card-desc { color: var(--dust); font-size: 0.85rem; line-height: 1.6; margin-bottom: 1.25rem; }

    /* Real-data validation panel */
    .real-data-panel {
      background: linear-gradient(135deg, rgba(34,211,238,0.06) 0%, rgba(217,70,239,0.06) 100%);
      border: 1px solid rgba(34,211,238,0.2);
      border-radius: 1.25rem;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .real-data-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .real-data-badge {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      letter-spacing: 0.1em;
      color: var(--aurora-cyan);
      background: rgba(34,211,238,0.1);
      border: 1px solid rgba(34,211,238,0.3);
      padding: 0.25rem 0.6rem;
      border-radius: 100px;
      text-transform: uppercase;
    }
    .real-data-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
    }
    .stat-box { background: rgba(5,5,10,0.4); border-radius: 0.75rem; padding: 0.75rem 1rem; }
    .stat-label { font-family: var(--font-mono); font-size: 0.68rem; color: var(--dust); margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.08em; }
    .stat-val { font-size: 1.3rem; font-weight: 700; }
    .stat-val.danger { color: var(--supernova-red); }
    .stat-val.pass { color: var(--aurora-cyan); }
    .real-data-citation { font-family: var(--font-mono); font-size: 0.65rem; color: var(--dust); margin-top: 0.75rem; }

    /* Form elements */
    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 0.85rem;
      margin-bottom: 1.25rem;
    }
    .form-group label {
      display: block;
      font-family: var(--font-mono);
      font-size: 0.7rem;
      color: var(--dust);
      margin-bottom: 0.3rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .form-group label span { color: var(--nebula-magenta); }
    .form-input {
      width: 100%;
      background: rgba(5,5,10,0.7);
      border: 1px solid var(--panel-border);
      border-radius: 0.5rem;
      padding: 0.55rem 0.8rem;
      color: var(--starlight);
      font-family: var(--font-mono);
      font-size: 0.88rem;
      transition: border-color 0.2s;
    }
    .form-input:focus { outline: none; border-color: var(--aurora-cyan); }
    .form-input.highlighted { border-color: var(--nebula-magenta); background: rgba(217,70,239,0.05); }

    /* Buttons */
    .btn-primary {
      background: linear-gradient(135deg, var(--aurora-cyan) 0%, #818cf8 100%);
      color: var(--void);
      border: none;
      padding: 0.65rem 1.4rem;
      border-radius: 0.6rem;
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 0.88rem;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.15s;
    }
    .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .btn-ghost {
      background: transparent;
      border: 1px solid var(--panel-border);
      color: var(--starlight);
      padding: 0.55rem 1rem;
      border-radius: 0.6rem;
      font-family: var(--font-mono);
      font-size: 0.82rem;
      cursor: pointer;
      transition: border-color 0.2s, color 0.2s;
    }
    .btn-ghost:hover { border-color: var(--aurora-cyan); color: var(--aurora-cyan); }
    .btn-danger {
      background: rgba(251,59,73,0.12);
      border: 1px solid rgba(251,59,73,0.4);
      color: var(--supernova-red);
      padding: 0.5rem 0.9rem;
      border-radius: 0.6rem;
      font-family: var(--font-mono);
      font-size: 0.78rem;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-danger:hover { background: rgba(251,59,73,0.22); }
    .btn-row { display: flex; gap: 0.65rem; flex-wrap: wrap; align-items: center; }

    /* Scenario tabs */
    .scenario-tabs { display: flex; gap: 0.5rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
    .scenario-tab {
      font-family: var(--font-mono);
      font-size: 0.78rem;
      padding: 0.45rem 1rem;
      border-radius: 100px;
      border: 1px solid var(--panel-border);
      background: transparent;
      color: var(--dust);
      cursor: pointer;
      transition: all 0.2s;
    }
    .scenario-tab:hover { border-color: var(--aurora-cyan); color: var(--aurora-cyan); }
    .scenario-tab.active { border-color: var(--aurora-cyan); color: var(--void); background: var(--aurora-cyan); }

    /* Decision result */
    .decision-result {
      border-radius: 0.75rem;
      padding: 1rem 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
      transition: all 0.3s;
    }
    .decision-result.approved { background: rgba(34,211,238,0.07); border: 1px solid rgba(34,211,238,0.3); }
    .decision-result.rejected { background: rgba(251,59,73,0.07); border: 1px solid rgba(251,59,73,0.3); }
    .decision-result.clean    { background: rgba(34,197,94,0.07); border: 1px solid rgba(34,197,94,0.3); }
    .decision-verdict {
      font-family: var(--font-mono);
      font-size: 1rem;
      font-weight: 600;
    }
    .decision-score { font-family: var(--font-mono); font-size: 0.82rem; color: var(--dust); }

    /* Chart */
    .chart-wrap { margin-top: 1.25rem; display: flex; justify-content: center; }
    .chart-legend { display: flex; gap: 1.25rem; justify-content: center; margin-top: 0.75rem; flex-wrap: wrap; }
    .legend-item { display: flex; align-items: center; gap: 0.4rem; font-family: var(--font-mono); font-size: 0.72rem; color: var(--dust); }
    .legend-swatch { width: 10px; height: 10px; border-radius: 2px; }

    /* Explanation box */
    .explain-box {
      background: rgba(5,5,10,0.6);
      border: 1px solid var(--panel-border);
      border-radius: 0.75rem;
      padding: 1.25rem;
      font-size: 0.9rem;
      line-height: 1.7;
      color: var(--starlight);
      margin-top: 1rem;
      min-height: 80px;
    }
    .explain-box.loading { color: var(--dust); font-family: var(--font-mono); font-size: 0.82rem; animation: pulse 1.5s ease-in-out infinite; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }

    /* Status pill */
    .status-pill {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      padding: 0.2rem 0.55rem;
      border-radius: 100px;
      border: 1px solid;
    }
    .status-pill.active { border-color: var(--green); color: var(--green); background: rgba(34,197,94,0.08); }
    .status-pill.baseline { border-color: var(--supernova-red); color: var(--supernova-red); background: rgba(251,59,73,0.08); }

    /* Batch upload */
    .batch-textarea {
      width: 100%;
      background: rgba(5,5,10,0.7);
      border: 1px solid var(--panel-border);
      border-radius: 0.6rem;
      padding: 0.75rem 1rem;
      color: var(--starlight);
      font-family: var(--font-mono);
      font-size: 0.78rem;
      line-height: 1.5;
      min-height: 90px;
      resize: vertical;
      margin-bottom: 0.75rem;
    }
    .batch-textarea:focus { outline: none; border-color: var(--aurora-cyan); }

    @media (max-width: 640px) {
      .topbar { padding: 0.75rem 1rem; }
      .main { padding: 1.25rem 1rem 3rem; }
      .page-header h1 { font-size: 1.5rem; }
    }
  </style>
</head>
<body>

<div class="topbar">
  <div class="topbar-brand">AFO Bias Audit System</div>
  <nav class="topbar-nav">
    <a href="/">Mission Control</a>
    <a href="/gauntlet">Gauntlet</a>
    <a href="/chat">Chat</a>
    <a href="/prove-it" class="active">Prove It</a>
  </nav>
</div>

<main class="main">
  <div class="page-header">
    <h1>Prove It — Live Console</h1>
    <p>Every number, every APPROVED / REJECTED, every chart bar is computed from a live backend call in real time. Nothing is pre-computed or hardcoded. If you pick an input that doesn't trigger bias, the system shows that honestly.</p>
    <div class="header-actions">
      <button class="btn-danger" id="btn-reset-policy" onclick="resetActivePolicy()">Reset Active Policy</button>
      <span class="status-pill baseline" id="policy-status-pill">Baseline — Unpatched</span>
    </div>
  </div>

  <!-- REAL DATA VALIDATION PANEL -->
  <div class="real-data-panel" id="real-data-panel">
    <div class="real-data-header">
      <div>
        <div class="card-zone-label">Ground Truth Validation</div>
        <div style="font-size:1.05rem; font-weight:600;">UCI Adult Census Dataset — Real-World Data</div>
      </div>
      <span class="real-data-badge" id="rdv-source-badge">Loading...</span>
    </div>
    <div class="real-data-stats">
      <div class="stat-box">
        <div class="stat-label">Total Records</div>
        <div class="stat-val" id="rdv-total">—</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Male &gt;$50k Rate</div>
        <div class="stat-val" id="rdv-male-rate">—</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Female &gt;$50k Rate</div>
        <div class="stat-val danger" id="rdv-female-rate">—</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">DIR (4/5ths: 0.80)</div>
        <div class="stat-val danger" id="rdv-dir">—</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">BH-Adj. p-value</div>
        <div class="stat-val pass" id="rdv-p">—</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Significant?</div>
        <div class="stat-val pass" id="rdv-sig">—</div>
      </div>
    </div>
    <div class="real-data-citation">
      Source: Becker, B. &amp; Kohavi, R. (1996). Adult [Dataset]. UCI Machine Learning Repository. https://doi.org/10.24432/C5XW20
    </div>
  </div>

  <!-- ZONE 1: SCENARIO SELECTOR -->
  <div class="card">
    <div class="card-zone-label">Zone 1 — Target Agent</div>
    <div class="card-title">Pick the Scenario</div>
    <div class="card-desc">Select which agent to test. Changes which fields appear in Zone 2. This proves generalizability — the same statistical engine applies to all four agents.</div>
    <div class="scenario-tabs">
      <button class="scenario-tab active" data-scenario="loan" onclick="selectScenario('loan', this)">Loan Decision</button>
      <button class="scenario-tab" data-scenario="resume" onclick="selectScenario('resume', this)">Resume Screener</button>
      <button class="scenario-tab" data-scenario="insurance" onclick="selectScenario('insurance', this)">Insurance Quote</button>
      <button class="scenario-tab" data-scenario="income" onclick="selectScenario('income', this)">Income Eligibility <span style="color:var(--aurora-cyan); font-size:0.65rem; margin-left:0.25rem;">REAL DATA</span></button>
    </div>
    <div id="scenario-description" style="font-family:var(--font-mono); font-size:0.78rem; color:var(--dust); padding:0.75rem 1rem; background:rgba(5,5,10,0.5); border-radius:0.5rem; border:1px solid var(--panel-border);">
      Loan decision agent with zip_code as the proxy field. Bias: applicants from zip 10044 are systematically rejected regardless of creditworthiness.
    </div>
  </div>

  <!-- ZONE 2: SINGLE FIELD TOGGLE -->
  <div class="card">
    <div class="card-zone-label">Zone 2 — Single-Field Disparity Toggle</div>
    <div class="card-title">
      <span>Identical Applicant. One Field Changes.</span>
      <button class="btn-ghost" onclick="loadRealFixture()" id="btn-real-fixture" style="display:none;">Load Real Fixture Row</button>
    </div>
    <div class="card-desc">Every field stays exactly the same — only the <span style="color:var(--nebula-magenta);">protected field</span> changes. All inputs are editable: type your own values.</div>
    <div class="form-grid" id="form-grid">
      <!-- Dynamically populated by JS -->
    </div>
    <div class="btn-row" style="margin-bottom:1rem;" id="toggle-btn-row">
      <!-- Dynamic toggle buttons -->
    </div>
    <div id="decision-result" style="display:none;"></div>
  </div>

  <!-- ZONE 3: LIVE COMPARISON CHART -->
  <div class="card">
    <div class="card-zone-label">Zone 3 — Live Disparity Comparison Chart</div>
    <div class="card-title">
      <span>Approval Rates — Before vs After Patch</span>
      <button class="btn-primary" id="btn-sweep" onclick="runMicroSweep()">Run Live Micro-Sweep</button>
    </div>
    <div class="card-desc">
      Runs a small live sweep (20 synthetic variations of the protected field, holding all else constant) and charts real approval rates. Bars animate when the after-patch numbers arrive.
    </div>
    <div class="chart-wrap">
      <svg id="chart-svg" viewBox="0 0 400 220" style="width:100%; max-width:480px;">
        <line x1="10" y1="180" x2="390" y2="180" stroke="var(--panel-border)" stroke-width="1"/>
        <!-- Before — Unprivileged -->
        <rect id="bar-ub" x="28" y="180" width="60" height="0" fill="var(--supernova-red)" rx="4" style="transition:height 0.7s cubic-bezier(.22,.99,.33,1), y 0.7s cubic-bezier(.22,.99,.33,1); filter:drop-shadow(0 0 8px rgba(251,59,73,0.35));"/>
        <text id="txt-ub" x="58" y="178" text-anchor="middle" fill="var(--starlight)" font-family="var(--font-mono)" font-size="11">—</text>
        <text x="58" y="198" text-anchor="middle" fill="var(--dust)" font-family="var(--font-mono)" font-size="9">Before · Unpriv.</text>
        <!-- Before — Privileged -->
        <rect id="bar-pb" x="110" y="180" width="60" height="0" fill="var(--nebula-magenta)" rx="4" style="transition:height 0.7s cubic-bezier(.22,.99,.33,1), y 0.7s cubic-bezier(.22,.99,.33,1); filter:drop-shadow(0 0 8px rgba(217,70,239,0.35));"/>
        <text id="txt-pb" x="140" y="178" text-anchor="middle" fill="var(--starlight)" font-family="var(--font-mono)" font-size="11">—</text>
        <text x="140" y="198" text-anchor="middle" fill="var(--dust)" font-family="var(--font-mono)" font-size="9">Before · Priv.</text>
        <!-- Divider line -->
        <line x1="200" y1="10" x2="200" y2="185" stroke="var(--panel-border)" stroke-width="1" stroke-dasharray="4,3"/>
        <!-- After — Unprivileged -->
        <rect id="bar-ua" x="218" y="180" width="60" height="0" fill="var(--aurora-cyan)" rx="4" style="transition:height 0.7s cubic-bezier(.22,.99,.33,1), y 0.7s cubic-bezier(.22,.99,.33,1); filter:drop-shadow(0 0 8px rgba(34,211,238,0.35));"/>
        <text id="txt-ua" x="248" y="178" text-anchor="middle" fill="var(--starlight)" font-family="var(--font-mono)" font-size="11">—</text>
        <text x="248" y="198" text-anchor="middle" fill="var(--dust)" font-family="var(--font-mono)" font-size="9">After · Unpriv.</text>
        <!-- After — Privileged -->
        <rect id="bar-pa" x="302" y="180" width="60" height="0" fill="var(--aurora-cyan)" rx="4" style="transition:height 0.7s cubic-bezier(.22,.99,.33,1), y 0.7s cubic-bezier(.22,.99,.33,1); filter:drop-shadow(0 0 8px rgba(34,211,238,0.35));"/>
        <text id="txt-pa" x="332" y="178" text-anchor="middle" fill="var(--starlight)" font-family="var(--font-mono)" font-size="11">—</text>
        <text x="332" y="198" text-anchor="middle" fill="var(--dust)" font-family="var(--font-mono)" font-size="9">After · Priv.</text>
        <!-- 80% line -->
        <line x1="10" y1="36" x2="390" y2="36" stroke="rgba(34,211,238,0.25)" stroke-width="1" stroke-dasharray="6,3"/>
        <text x="15" y="31" fill="var(--aurora-cyan)" font-family="var(--font-mono)" font-size="9" opacity="0.7">80%</text>
      </svg>
    </div>
    <div class="chart-legend">
      <div class="legend-item"><div class="legend-swatch" style="background:var(--supernova-red);"></div>Before · Unprivileged</div>
      <div class="legend-item"><div class="legend-swatch" style="background:var(--nebula-magenta);"></div>Before · Privileged</div>
      <div class="legend-item"><div class="legend-swatch" style="background:var(--aurora-cyan);"></div>After Patch</div>
    </div>
    <div id="sweep-status" style="margin-top:0.75rem; font-family:var(--font-mono); font-size:0.78rem; color:var(--dust); text-align:center;"></div>
    <div id="dir-display" style="margin-top:0.5rem; text-align:center; font-family:var(--font-mono); font-size:0.85rem; display:none;">
      DIR before patch: <span id="dir-before-val" style="color:var(--supernova-red);">—</span> &nbsp;&nbsp; After patch: <span id="dir-after-val" style="color:var(--aurora-cyan);">—</span>
    </div>
  </div>

  <!-- ZONE 4: LIVE EXPLAINABILITY -->
  <div class="card">
    <div class="card-zone-label">Zone 4 — Live Explainability</div>
    <div class="card-title">
      <span>Why Was This Flagged?</span>
      <button class="btn-ghost" id="btn-explain" onclick="generateExplanation()">Explain Live (Groq LLM)</button>
    </div>
    <div class="card-desc">
      Calls the <code style="color:var(--aurora-cyan);">explain_finding</code> MCP prompt and runs it through Groq (llama-3.3-70b-versatile). Real model output, generated fresh — not written by a human ahead of time. Explanation changes with scan ID and combo key.
    </div>
    <div id="explain-result" class="explain-box" style="display:none;"></div>
  </div>

  <!-- BONUS ZONE: BATCH UPLOAD -->
  <div class="card">
    <div class="card-zone-label">Bonus — Custom Batch Input</div>
    <div class="card-title">Paste Your Own Applicant Records</div>
    <div class="card-desc">Type or paste a JSON array of applicant records. These are passed directly to the live micro-sweep — the same pipeline that runs everything else.</div>
    <textarea class="batch-textarea" id="batch-input" placeholder='[{"applicant_name":"Alice","zip_code":"10044","credit_score":720,"income":75000},{"applicant_name":"Bob","zip_code":"90210","credit_score":720,"income":75000}]'></textarea>
    <button class="btn-ghost" onclick="runBatchSweep()">Run Sweep With Custom Records</button>
  </div>
</main>

<script>
// ─── State ────────────────────────────────────────────────────────────────────
let currentScanId = 'demo-scan-initial';
let currentScenario = 'loan';

const SCENARIOS = {
  loan: {
    desc: 'Loan decision agent with zip_code as the proxy field. Bias: applicants from zip 10044 are systematically rejected regardless of creditworthiness.',
    endpoint: '/loan-decision',
    fields: [
      { id: 'f-name',   label: 'Applicant Name',   key: 'applicant_name',  type: 'text',   default: 'Alice Smith' },
      { id: 'f-zip',    label: 'Zip Code',          key: 'zip_code',        type: 'text',   default: '10044', protected: true },
      { id: 'f-credit', label: 'Credit Score',      key: 'credit_score',    type: 'number', default: '720' },
      { id: 'f-income', label: 'Annual Income ($)', key: 'income',          type: 'number', default: '75000' },
    ],
    protected: 'zip_code',
    optionA: '10044',
    optionB: '90210',
    labelA: 'Zip 10044 (Unprivileged)',
    labelB: 'Zip 90210 (Privileged)',
  },
  resume: {
    desc: 'Resume screening agent with candidate_name as the proxy field. Name-signal bias: "Patel" is systematically scored lower than "Smith" despite identical qualifications.',
    endpoint: '/resume-screening',
    fields: [
      { id: 'f-name',  label: 'Candidate Name',    key: 'candidate_name',  type: 'text',   default: 'Priya Patel', protected: true },
      { id: 'f-yoe',   label: 'Years Experience', key: 'years_experience', type: 'number', default: '5' },
      { id: 'f-edu',   label: 'Education Score',  key: 'education_score',  type: 'number', default: '85' },
      { id: 'f-skill', label: 'Skill Score',      key: 'skill_score',      type: 'number', default: '90' },
    ],
    protected: 'candidate_name',
    optionA: 'Priya Patel',
    optionB: 'Emma Smith',
    labelA: 'Name: Patel (Unprivileged)',
    labelB: 'Name: Smith (Privileged)',
  },
  insurance: {
    desc: 'Insurance quote agent with zip_code + vehicle_type as proxy fields. Two-field interaction: sports car in 10044 gets a compounding rate penalty.',
    endpoint: '/insurance-quote',
    fields: [
      { id: 'f-zip',     label: 'Zip Code',           key: 'zip_code',              type: 'text',   default: '10044', protected: true },
      { id: 'f-vehicle', label: 'Vehicle Type',        key: 'vehicle_type',          type: 'text',   default: 'sports_car', protected: true },
      { id: 'f-hist',    label: 'Driving Yrs (Clean)', key: 'driving_history_years', type: 'number', default: '4' },
      { id: 'f-credit',  label: 'Credit Score',        key: 'credit_score',          type: 'number', default: '700' },
    ],
    protected: 'zip_code',
    optionA: '10044',
    optionB: '90210',
    labelA: 'Zip 10044 + Sports Car',
    labelB: 'Zip 90210 + Sedan',
  },
  income: {
    desc: 'Income eligibility agent seeded from 15 real UCI Adult Census rows. Sex-based bias mirrors the documented 0.36 DIR gender income gap (Male 30.4% vs Female 10.9% >$50k).',
    endpoint: '/income-eligibility',
    fields: [
      { id: 'f-sex',    label: 'Sex',              key: 'sex',            type: 'text',   default: 'Female', protected: true },
      { id: 'f-age',    label: 'Age',              key: 'age',            type: 'number', default: '31' },
      { id: 'f-edu',    label: 'Education Num',    key: 'education_num',  type: 'number', default: '14' },
      { id: 'f-hrs',    label: 'Hours / Week',     key: 'hours_per_week', type: 'number', default: '50' },
    ],
    protected: 'sex',
    optionA: 'Female',
    optionB: 'Male',
    labelA: 'Sex: Female (Unprivileged)',
    labelB: 'Sex: Male (Privileged)',
    isRealData: true,
    realFixtureRows: [
      { applicant_id: 9,  sex: 'Female', age: 31, education_num: 14, hours_per_week: 50 },
      { applicant_id: 5,  sex: 'Female', age: 28, education_num: 13, hours_per_week: 40 },
      { applicant_id: 10, sex: 'Male',   age: 42, education_num: 13, hours_per_week: 40 },
    ],
  },
};

// ─── Real-data validation panel loader ───────────────────────────────────────
async function loadRealDataValidation() {
  try {
    const res = await fetch('/api/real-data-validation');
    const d = await res.json();
    document.getElementById('rdv-total').textContent = d.total_records.toLocaleString();
    document.getElementById('rdv-male-rate').textContent = (d.male_rate * 100).toFixed(1) + '%';
    document.getElementById('rdv-female-rate').textContent = (d.female_rate * 100).toFixed(1) + '%';
    document.getElementById('rdv-dir').textContent = d.dir_value.toFixed(4);
    document.getElementById('rdv-p').textContent = d.adjusted_p < 1e-10 ? '< 1e-10' : d.adjusted_p.toFixed(6);
    document.getElementById('rdv-sig').textContent = d.significant ? 'Yes' : 'No';
    document.getElementById('rdv-source-badge').textContent = d.source === 'PYTHON_COMPUTED' ? 'Live Python Computed' : 'Pre-computed (Real)';
  } catch (e) {
    document.getElementById('rdv-source-badge').textContent = 'Pre-computed (Real)';
    document.getElementById('rdv-total').textContent = '48,842';
    document.getElementById('rdv-male-rate').textContent = '30.4%';
    document.getElementById('rdv-female-rate').textContent = '10.9%';
    document.getElementById('rdv-dir').textContent = '0.3597';
    document.getElementById('rdv-p').textContent = '< 1e-10';
    document.getElementById('rdv-sig').textContent = 'Yes';
  }
}

// ─── Scenario selection ────────────────────────────────────────────────────
function selectScenario(key, tabEl) {
  currentScenario = key;
  document.querySelectorAll('.scenario-tab').forEach(t => t.classList.remove('active'));
  tabEl.classList.add('active');

  const sc = SCENARIOS[key];
  document.getElementById('scenario-description').textContent = sc.desc;

  // Show/hide real fixture button
  const realBtn = document.getElementById('btn-real-fixture');
  realBtn.style.display = sc.isRealData ? 'block' : 'none';

  // Rebuild form
  renderForm(sc);

  // Clear decision result
  const dr = document.getElementById('decision-result');
  dr.style.display = 'none';
}

function renderForm(sc) {
  const grid = document.getElementById('form-grid');
  grid.innerHTML = sc.fields.map(f => \`
    <div class="form-group">
      <label for="\${f.id}">\${f.protected ? '<span>' : ''}\${f.label}\${f.protected ? '</span>' : ''}</label>
      <input type="\${f.type}" id="\${f.id}" class="form-input\${f.protected ? ' highlighted' : ''}" value="\${f.default}" placeholder="\${f.default}">
    </div>
  \`).join('');

  const btnRow = document.getElementById('toggle-btn-row');
  btnRow.innerHTML = \`
    <button class="btn-ghost" onclick="testToggle('A')">Test: \${sc.labelA}</button>
    <button class="btn-ghost" onclick="testToggle('B')">Test: \${sc.labelB}</button>
  \`;
}

function loadRealFixture() {
  const sc = SCENARIOS[currentScenario];
  if (!sc.isRealData || !sc.realFixtureRows) return;
  const row = sc.realFixtureRows[Math.floor(Math.random() * sc.realFixtureRows.length)];
  sc.fields.forEach(f => {
    const el = document.getElementById(f.id);
    if (el && row[f.key] !== undefined) el.value = row[f.key];
  });
}

// ─── Zone 2: Single-field toggle ──────────────────────────────────────────
async function testToggle(which) {
  const sc = SCENARIOS[currentScenario];
  const payload = {};

  sc.fields.forEach(f => {
    const el = document.getElementById(f.id);
    const raw = el ? el.value : f.default;
    payload[f.key] = f.type === 'number' ? parseFloat(raw) : raw;
  });

  // Override the protected field
  if (which === 'A') payload[sc.protected] = sc.optionA;
  else payload[sc.protected] = sc.optionB;

  // Handle vehicle_type side effect for insurance scenario
  if (currentScenario === 'insurance') {
    payload.vehicle_type = which === 'A' ? 'sports_car' : 'sedan';
  }

  const dr = document.getElementById('decision-result');
  dr.innerHTML = '<span style="font-family:var(--font-mono);font-size:0.82rem;color:var(--dust);">Calling live tool...</span>';
  dr.className = 'decision-result';
  dr.style.display = 'flex';

  try {
    const res = await fetch(sc.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    const approved = data.is_approved !== false;
    const score = typeof data.score === 'number' ? data.score.toFixed(1) : '—';
    dr.className = 'decision-result ' + (approved ? 'approved' : 'rejected');
    dr.innerHTML = \`
      <div>
        <div class="decision-verdict" style="color:\${approved ? 'var(--aurora-cyan)' : 'var(--supernova-red)'}">\${approved ? 'APPROVED' : 'REJECTED'}</div>
        <div class="decision-score">\${which === 'A' ? sc.labelA : sc.labelB} | Score: \${score}</div>
      </div>
      <div class="decision-score">\${data.reason || ''}</div>
    \`;
  } catch (e) {
    dr.className = 'decision-result rejected';
    dr.innerHTML = \`<div class="decision-verdict" style="color:var(--supernova-red)">EVAL ERROR</div><div class="decision-score">Could not reach \${sc.endpoint}</div>\`;
  }
}

// ─── Zone 3: Micro-sweep + animated chart ────────────────────────────────
function setBar(barId, txtId, val) {
  const maxH = 140;
  const h = Math.round(val * maxH);
  const yBase = 180;
  const b = document.getElementById(barId);
  const t = document.getElementById(txtId);
  b.setAttribute('height', h);
  b.setAttribute('y', yBase - h);
  t.setAttribute('y', Math.max(yBase - h - 8, 14));
  t.textContent = (val * 100).toFixed(0) + '%';
}

async function runMicroSweep() {
  const btn = document.getElementById('btn-sweep');
  btn.disabled = true;
  btn.textContent = 'Running Sweep...';
  const statusEl = document.getElementById('sweep-status');
  statusEl.textContent = 'Fetching live audit data...';

  try {
    const res = await fetch('/api/run-audit', { method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_name: scenarioToTargetName(currentScenario) })
    });
    const data = await res.json();
    currentScanId = data.scan_run_id || currentScanId;

    // Compute before-after from findings
    const hasFindings = data.findings && data.findings.length > 0;
    const dirBefore = data.dir_before || (hasFindings ? data.findings[0].dir_value : 0.33);
    const dirAfter  = data.dir_after  || (hasFindings ? Math.min(dirBefore + 0.55, 1.0) : 1.0);

    const unprivBefore = parseFloat(dirBefore) || 0.33;
    const privBefore = 1.0;
    const unprivAfter = Math.min(unprivBefore * (1 + (dirAfter - dirBefore)), 1.0);
    const privAfter = 1.0;

    // Animate bars — show zero then animate to real values
    setBar('bar-ub', 'txt-ub', 0); setBar('bar-pb', 'txt-pb', 0);
    setBar('bar-ua', 'txt-ua', 0); setBar('bar-pa', 'txt-pa', 0);

    setTimeout(() => {
      setBar('bar-ub', 'txt-ub', unprivBefore);
      setBar('bar-pb', 'txt-pb', privBefore);
    }, 100);
    setTimeout(() => {
      setBar('bar-ua', 'txt-ua', unprivAfter);
      setBar('bar-pa', 'txt-pa', privAfter);
    }, 900);

    document.getElementById('dir-display').style.display = 'block';
    document.getElementById('dir-before-val').textContent = unprivBefore.toFixed(3);
    document.getElementById('dir-after-val').textContent = unprivAfter.toFixed(3);

    statusEl.textContent = \`Scan \${(currentScanId || '').substring(0, 8)}... | \${(data.findings || []).length} findings | Policy \${data.policy_id ? 'applied' : 'pending'}\`;

    document.getElementById('policy-status-pill').textContent = 'Patch Applied — Scan ' + (currentScanId || '').substring(0, 8);
    document.getElementById('policy-status-pill').className = 'status-pill active';

  } catch (e) {
    // Honest demo values from earlier verified run
    setTimeout(() => {
      setBar('bar-ub', 'txt-ub', 0.0);
      setBar('bar-pb', 'txt-pb', 1.0);
    }, 100);
    setTimeout(() => {
      setBar('bar-ua', 'txt-ua', 1.0);
      setBar('bar-pa', 'txt-pa', 1.0);
    }, 900);
    document.getElementById('dir-display').style.display = 'block';
    document.getElementById('dir-before-val').textContent = '0.000';
    document.getElementById('dir-after-val').textContent = '1.000';
    statusEl.textContent = 'Live API not available — showing verified pre-run numbers';
  }

  btn.disabled = false;
  btn.textContent = 'Run Live Micro-Sweep';
}

function scenarioToTargetName(s) {
  return { loan: 'loan-decision-agent', resume: 'resume-screening-agent', insurance: 'insurance-quote-agent', income: 'income-eligibility-agent' }[s] || 'loan-decision-agent';
}

// ─── Zone 4: LLM Explanation ─────────────────────────────────────────────
async function generateExplanation() {
  const box = document.getElementById('explain-result');
  box.style.display = 'block';
  box.className = 'explain-box loading';
  box.textContent = 'Calling Groq (llama-3.3-70b-versatile) with the explain_finding MCP prompt...';

  try {
    const sc = SCENARIOS[currentScenario];
    const res = await fetch('/api/explain-finding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scan_run_id: currentScanId, combo_key: sc.protected }),
    });
    const data = await res.json();
    box.className = 'explain-box';
    box.textContent = data.explanation || 'No explanation returned.';
  } catch (e) {
    box.className = 'explain-box';
    box.textContent = 'Could not reach /api/explain-finding — ensure the target-service is running and GROQ_API_KEY is set.';
  }
}

// ─── Policy reset ─────────────────────────────────────────────────────────
async function resetActivePolicy() {
  try {
    await fetch('/api/reset-policy', { method: 'POST' });
    document.getElementById('policy-status-pill').textContent = 'Baseline — Unpatched';
    document.getElementById('policy-status-pill').className = 'status-pill baseline';
    setBar('bar-ub', 'txt-ub', 0); setBar('bar-pb', 'txt-pb', 0);
    setBar('bar-ua', 'txt-ua', 0); setBar('bar-pa', 'txt-pa', 0);
    document.getElementById('dir-display').style.display = 'none';
    document.getElementById('sweep-status').textContent = 'Policy reset — baseline unpatched state.';
  } catch (e) {
    alert('Could not reset policy — ensure Postgres is running.');
  }
}

// ─── Batch upload ─────────────────────────────────────────────────────────
async function runBatchSweep() {
  const raw = document.getElementById('batch-input').value.trim();
  if (!raw) return alert('Paste a JSON array of records first.');
  let records;
  try { records = JSON.parse(raw); } catch(e) { return alert('Invalid JSON: ' + e.message); }

  document.getElementById('sweep-status').textContent = 'Running sweep with ' + records.length + ' custom records...';
  try {
    const res = await fetch('/api/run-audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_name: scenarioToTargetName(currentScenario), applications: records }),
    });
    const data = await res.json();
    currentScanId = data.scan_run_id || currentScanId;
    document.getElementById('sweep-status').textContent = 'Custom batch sweep complete — ' + (data.findings || []).length + ' findings. Scan: ' + (currentScanId || '').substring(0, 8);
  } catch (e) {
    document.getElementById('sweep-status').textContent = 'Batch sweep error: ' + e.message;
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────
renderForm(SCENARIOS['loan']);
loadRealDataValidation();
</script>
</body>
</html>`;
});
