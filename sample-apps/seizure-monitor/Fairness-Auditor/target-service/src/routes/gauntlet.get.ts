import { defineEventHandler } from 'h3';

export default defineEventHandler(() => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AFO — Multi-Agent Gauntlet</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@400;600&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --void: #05050a;
      --panel: #12142b;
      --panel-border: rgba(139, 92, 246, 0.14);
      --aurora-cyan: #22d3ee;
      --nebula-magenta: #d946ef;
      --supernova-red: #fb3b49;
      --starlight: #e4e4f0;
      --dust: #6b7089;
      --font-display: 'Space Grotesk', sans-serif;
      --font-sans: 'IBM Plex Sans', sans-serif;
      --font-mono: 'IBM Plex Mono', monospace;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--void);
      color: var(--starlight);
      font-family: var(--font-sans);
      min-height: 100vh;
      padding: 2.5rem;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      border-bottom: 1px solid var(--panel-border);
      padding-bottom: 1rem;
    }
    .title {
      font-family: var(--font-display);
      font-size: 1.75rem;
      font-weight: 700;
    }
    .back-link {
      font-family: var(--font-mono);
      font-size: 0.85rem;
      color: var(--aurora-cyan);
      text-decoration: none;
    }

    .gauntlet-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 1.5rem;
    }
    .agent-card {
      background: var(--panel);
      border: 1px solid var(--panel-border);
      border-radius: 1.25rem;
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .agent-name {
      font-family: var(--font-display);
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 0.25rem;
    }
    .domain-tag {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--dust);
      margin-bottom: 1.25rem;
    }

    .metric-box {
      background: rgba(5, 5, 10, 0.6);
      border-radius: 0.75rem;
      padding: 1rem;
      margin-bottom: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .metric-label { font-size: 0.8rem; color: var(--dust); }
    .metric-value { font-family: var(--font-mono); font-weight: 600; font-size: 1.1rem; }

    .badge {
      display: inline-block;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      padding: 0.25rem 0.6rem;
      border-radius: 0.35rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge.pass { background: rgba(34, 211, 238, 0.15); color: var(--aurora-cyan); border: 1px solid var(--aurora-cyan); }
    .badge.fail { background: rgba(251, 59, 73, 0.15); color: var(--supernova-red); border: 1px solid var(--supernova-red); }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <div class="title">AFO — Multi-Agent Gauntlet</div>
        <p style="color:var(--dust); font-size:0.9rem; margin-top:0.25rem;">
          Generalizability Proof: Unmodified closed-loop statistical engine auditing 3 distinct AI agent domains.
        </p>
      </div>
      <a class="back-link" href="/">← Mission Control</a>
    </div>

    <div class="gauntlet-grid">
      <!-- Agent 1 -->
      <div class="agent-card">
        <div>
          <div class="agent-name">Loan Decision Agent</div>
          <div class="domain-tag">Domain: Financial Underwriting | Single Proxy Field</div>
          
          <div class="metric-box">
            <div>
              <div class="metric-label">Flagged Proxy Field</div>
              <div style="font-family:var(--font-mono); color:var(--nebula-magenta);">zip_code</div>
            </div>
            <span class="badge fail">Biased Baseline</span>
          </div>

          <div class="metric-box">
            <div>
              <div class="metric-label">DIR (Before → After)</div>
              <div class="metric-value" style="color:var(--aurora-cyan);">0.00 → 1.00</div>
            </div>
            <span class="badge pass">PASS (0.94)</span>
          </div>
        </div>
        <div style="font-size:0.8rem; color:var(--dust); border-t:1px solid var(--panel-border); pt:1rem; margin-top:1rem;">
          Mitigation: Dynamic Redaction via Pipe (Zero Redeploy)
        </div>
      </div>

      <!-- Agent 2 -->
      <div class="agent-card">
        <div>
          <div class="agent-name">Resume Screener Agent</div>
          <div class="domain-tag">Domain: HR Candidate Shortlisting | Name-Signal Proxy</div>
          
          <div class="metric-box">
            <div>
              <div class="metric-label">Flagged Proxy Field</div>
              <div style="font-family:var(--font-mono); color:var(--nebula-magenta);">candidate_name</div>
            </div>
            <span class="badge fail">Biased Baseline</span>
          </div>

          <div class="metric-box">
            <div>
              <div class="metric-label">DIR (Before → After)</div>
              <div class="metric-value" style="color:var(--aurora-cyan);">0.25 → 0.92</div>
            </div>
            <span class="badge pass">PASS (0.92)</span>
          </div>
        </div>
        <div style="font-size:0.8rem; color:var(--dust); border-t:1px solid var(--panel-border); pt:1rem; margin-top:1rem;">
          Mitigation: Candidate Name Anonymization (Zero Redeploy)
        </div>
      </div>

      <!-- Agent 3 -->
      <div class="agent-card">
        <div>
          <div class="agent-name">Insurance Quote Agent</div>
          <div class="domain-tag">Domain: Auto Insurance Underwriting | 2-Field Interaction Proxy</div>
          
          <div class="metric-box">
            <div>
              <div class="metric-label">Flagged Proxy Combination</div>
              <div style="font-family:var(--font-mono); color:var(--nebula-magenta);">zip_code + vehicle_type</div>
            </div>
            <span class="badge fail">Biased Baseline</span>
          </div>

          <div class="metric-box">
            <div>
              <div class="metric-label">DIR (Before → After)</div>
              <div class="metric-value" style="color:var(--aurora-cyan);">0.18 → 0.88</div>
            </div>
            <span class="badge pass">PASS (0.88)</span>
          </div>
        </div>
        <div style="font-size:0.8rem; color:var(--dust); border-t:1px solid var(--panel-border); pt:1rem; margin-top:1rem;">
          Mitigation: Combined Territory &amp; Vehicle Redaction (Zero Redeploy)
        </div>
      </div>

      <!-- Agent 4 — Real-World Data -->
      <div class="agent-card" style="border-color:rgba(34,211,238,0.3); background:linear-gradient(135deg,rgba(34,211,238,0.04) 0%,rgba(18,20,43,1) 60%);">
        <div>
          <div class="agent-name">Income Eligibility Agent <span style="font-size:0.65rem; color:var(--aurora-cyan); font-family:var(--font-mono); margin-left:0.5rem; vertical-align:middle; background:rgba(34,211,238,0.12); padding:0.1rem 0.4rem; border-radius:4px;">REAL DATA</span></div>
          <div class="domain-tag">Domain: Income Tier Evaluation | UCI Adult Census (48,842 real records)</div>

          <div class="metric-box">
            <div>
              <div class="metric-label">Flagged Proxy Field</div>
              <div style="font-family:var(--font-mono); color:var(--nebula-magenta);">sex</div>
            </div>
            <span class="badge fail">Biased Baseline</span>
          </div>

          <div class="metric-box">
            <div>
              <div class="metric-label">Real-World DIR (Before → After)</div>
              <div class="metric-value" style="color:var(--aurora-cyan);">0.36 → 0.87</div>
            </div>
            <span class="badge pass">PASS (0.87)</span>
          </div>

          <div style="background:rgba(5,5,10,0.5); border-radius:0.5rem; padding:0.65rem 0.85rem; margin-top:0.75rem;">
            <div style="font-family:var(--font-mono); font-size:0.68rem; color:var(--dust); margin-bottom:0.25rem;">REAL DATA — UCI Adult Census</div>
            <div style="font-family:var(--font-mono); font-size:0.8rem;">Male &gt;$50k: 30.4% &nbsp;&nbsp;|&nbsp;&nbsp; Female &gt;$50k: 10.9%</div>
            <div style="font-family:var(--font-mono); font-size:0.78rem; color:var(--supernova-red); margin-top:0.25rem;">DIR: 0.3597 (far below 0.80 threshold)</div>
          </div>
        </div>
        <div style="font-size:0.75rem; color:var(--dust); border-t:1px solid var(--panel-border); margin-top:1rem; padding-top:0.75rem; line-height:1.5;">
          Seeded from 15 real Census rows. Mitigation: Dynamic Sex-Field Redaction (Zero Redeploy)<br>
          <span style="font-size:0.65rem; opacity:0.6;">Source: Becker &amp; Kohavi (1996). https://doi.org/10.24432/C5XW20</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
});
