import { defineEventHandler } from 'h3';

export default defineEventHandler(() => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AFO — Mission Control</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,600;1,400&family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --void: #05050a;
      --panel: #12142b;
      --panel-border: rgba(139, 92, 246, 0.14);
      --nebula-violet: #8b5cf6;
      --nebula-magenta: #d946ef;
      --aurora-cyan: #22d3ee;
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
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .container { max-width: 1100px; width: 100%; space-y: 2rem; }
    
    /* Header / Brand */
    .brand-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--panel-border);
    }
    .brand-title {
      font-family: var(--font-display);
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      background: linear-gradient(135deg, var(--starlight) 0%, var(--aurora-cyan) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .status-strip {
      display: flex;
      gap: 1.5rem;
      font-family: var(--font-mono);
      font-size: 0.75rem;
    }
    .status-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--panel);
      padding: 0.4rem 0.8rem;
      border-radius: 9999px;
      border: 1px solid var(--panel-border);
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--supernova-red);
      box-shadow: 0 0 8px var(--supernova-red);
    }
    .dot.online {
      background: var(--aurora-cyan);
      box-shadow: 0 0 8px var(--aurora-cyan);
    }

    /* Hero Section */
    .hero {
      background: var(--panel);
      border: 1px solid var(--panel-border);
      border-radius: 1.5rem;
      padding: 3rem 2.5rem;
      text-align: center;
      margin-bottom: 2.5rem;
      position: relative;
      overflow: hidden;
    }
    .hero::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle at center, rgba(34, 211, 238, 0.05) 0%, transparent 60%);
      pointer-events: none;
    }
    .hero-tag {
      font-family: var(--font-mono);
      font-size: 0.8rem;
      color: var(--aurora-cyan);
      letter-spacing: 0.15em;
      text-transform: uppercase;
      margin-bottom: 0.75rem;
    }
    .hero-title {
      font-family: var(--font-display);
      font-size: 2.75rem;
      font-weight: 700;
      line-height: 1.1;
      margin-bottom: 1rem;
    }
    .hero-subtitle {
      color: var(--dust);
      font-size: 1.1rem;
      max-width: 720px;
      margin: 0 auto 2rem auto;
      line-height: 1.6;
    }
    .btn-primary {
      font-family: var(--font-display);
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--void);
      background: linear-gradient(135deg, var(--aurora-cyan) 0%, var(--nebula-magenta) 100%);
      padding: 1rem 2.5rem;
      border: none;
      border-radius: 0.75rem;
      cursor: pointer;
      box-shadow: 0 0 24px rgba(34, 211, 238, 0.35);
      transition: all 0.2s ease;
    }
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 0 32px rgba(217, 70, 239, 0.5);
    }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

    /* Result Panel */
    .result-panel {
      display: none;
      background: rgba(34, 211, 238, 0.04);
      border: 1px solid var(--aurora-cyan);
      border-radius: 1rem;
      padding: 1.5rem;
      margin-top: 2rem;
      text-align: left;
      font-family: var(--font-mono);
      font-size: 0.9rem;
    }

    /* Cards Grid */
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.5rem;
    }
    .card {
      background: var(--panel);
      border: 1px solid var(--panel-border);
      border-radius: 1rem;
      padding: 1.75rem;
      text-decoration: none;
      color: inherit;
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .card:hover {
      border-color: var(--aurora-cyan);
      transform: translateY(-3px);
      box-shadow: 0 8px 24px -6px rgba(34, 211, 238, 0.2);
    }
    .card-title {
      font-family: var(--font-display);
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    .card-desc {
      font-size: 0.875rem;
      color: var(--dust);
      line-height: 1.5;
      margin-bottom: 1.5rem;
    }
    .card-link {
      font-family: var(--font-mono);
      font-size: 0.8rem;
      color: var(--aurora-cyan);
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="brand-bar">
      <div class="brand-title">AFO — ADAPTIVE FAIRNESS ORCHESTRATOR</div>
      <div class="status-strip">
        <div class="status-item">
          <div class="dot online" id="dot-orch"></div>
          <span>Orchestrator MCP :8000</span>
        </div>
        <div class="status-item">
          <div class="dot online" id="dot-target"></div>
          <span>Target Service MCP :3002</span>
        </div>
      </div>
    </div>

    <div class="hero">
      <div class="hero-tag">Closed-Loop MCP AI Auditor</div>
      <h1 class="hero-title">Adaptive Fairness Orchestrator</h1>
      <p class="hero-subtitle">
        Finds bias in live AI agents, patches it without redeploying code, and proves the fix held — closed-loop, MCP-native.
      </p>
      <button class="btn-primary" id="btn-audit" onclick="runLiveAudit()">⚡ Run Live Audit</button>

      <div class="result-panel" id="result-panel">
        <p style="color:var(--aurora-cyan); font-weight:600; margin-bottom:0.5rem;">[LIVE AUDIT COMPLETE]</p>
        <p id="res-scan"></p>
        <p id="res-findings"></p>
        <div style="margin-top:1rem;">
          <a id="res-link" href="#" style="color:var(--nebula-magenta); text-decoration:underline;">View Governance Scorecard for this Scan Run →</a>
        </div>
      </div>
    </div>

    <div class="cards-grid">
      <a class="card" href="/widgets/bias-heatmap/index.html">
        <div>
          <div class="card-title">Bias Heatmap</div>
          <div class="card-desc">Severity-colored grid of demographic field combinations and Disparate Impact Ratios.</div>
        </div>
        <div class="card-link">Explore Heatmap →</div>
      </a>

      <a class="card" href="/widgets/governance-scorecard/index.html">
        <div>
          <div class="card-title">Governance Scorecard</div>
          <div class="card-desc">Animated SVG Orbital Gauge displaying before/after DIR, active policy diff, and SSE log stream.</div>
        </div>
        <div class="card-link">View Scorecard →</div>
      </a>

      <a class="card" href="/gauntlet">
        <div>
          <div class="card-title">Multi-Agent Gauntlet</div>
          <div class="card-desc">Proof of generalizability across 3 distinct AI agents (Loan, Resume, Insurance).</div>
        </div>
        <div class="card-link">Run Gauntlet →</div>
      </a>

      <a class="card" href="/chat">
        <div>
          <div class="card-title">Ask an Agent Chat</div>
          <div class="card-desc">Interactive conversational playground demonstrating live dynamic field sanitization.</div>
        </div>
        <div class="card-link">Open Chat →</div>
      </a>
    </div>
  </div>

  <script>
    // Ping Status Check
    async function checkHealth() {
      try {
        const res = await fetch('/health');
        if (!res.ok) throw new Error();
        document.getElementById('dot-target').classList.add('online');
      } catch {
        document.getElementById('dot-target').classList.remove('online');
      }
    }
    checkHealth();

    // Run Live Audit
    async function runLiveAudit() {
      const btn = document.getElementById('btn-audit');
      const panel = document.getElementById('result-panel');
      btn.disabled = true;
      btn.innerHTML = '⏳ Auditing & Synthesizing Patch (~0.4s)...';

      try {
        const res = await fetch('/api/run-audit', { method: 'POST' });
        const data = await res.json();
        
        document.getElementById('res-scan').innerText = 'Scan Run ID: ' + data.scan_run_id;
        document.getElementById('res-findings').innerText = 'Discovered Findings: ' + data.findings_count + ' flagged proxy combination(s)';
        document.getElementById('res-link').href = '/widgets/governance-scorecard/index.html?scan_run_id=' + data.scan_run_id;
        
        panel.style.display = 'block';
        btn.innerHTML = '✔ Live Audit Passed';
      } catch (err) {
        btn.innerHTML = '❌ Audit Execution Failed';
      } finally {
        setTimeout(() => { btn.disabled = false; }, 3000);
      }
    }
  </script>
</body>
</html>`;
});
