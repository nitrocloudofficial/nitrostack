import { defineEventHandler } from 'h3';

export default defineEventHandler(() => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AFO — Ask an Agent Chat Playground</title>
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
    .container { max-width: 960px; margin: 0 auto; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      border-bottom: 1px solid var(--panel-border);
      padding-bottom: 1rem;
    }
    .title { font-family: var(--font-display); font-size: 1.75rem; font-weight: 700; }
    .back-link { font-family: var(--font-mono); font-size: 0.85rem; color: var(--aurora-cyan); text-decoration: none; }

    .chat-box {
      background: var(--panel);
      border: 1px solid var(--panel-border);
      border-radius: 1.25rem;
      padding: 2rem;
      margin-bottom: 2rem;
    }
    .preset-chips {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
    }
    .chip {
      background: rgba(139, 92, 246, 0.1);
      border: 1px solid var(--panel-border);
      color: var(--starlight);
      padding: 0.4rem 0.8rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      cursor: pointer;
      font-family: var(--font-mono);
      transition: all 0.2s;
    }
    .chip:hover { border-color: var(--aurora-cyan); color: var(--aurora-cyan); }

    .input-row { display: flex; gap: 1rem; }
    .input-field {
      flex: 1;
      background: rgba(5, 5, 10, 0.8);
      border: 1px solid var(--panel-border);
      border-radius: 0.75rem;
      padding: 0.85rem 1.2rem;
      color: var(--starlight);
      font-family: var(--font-sans);
      font-size: 0.95rem;
    }
    .input-field:focus { outline: none; border-color: var(--aurora-cyan); }
    .btn-send {
      font-family: var(--font-display);
      font-weight: 600;
      background: linear-gradient(135deg, var(--aurora-cyan) 0%, var(--nebula-magenta) 100%);
      color: var(--void);
      border: none;
      padding: 0.85rem 1.75rem;
      border-radius: 0.75rem;
      cursor: pointer;
    }

    .comparison-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-top: 1.5rem;
    }
    .comp-card {
      background: rgba(5, 5, 10, 0.6);
      border-radius: 1rem;
      padding: 1.25rem;
      border: 1px solid var(--panel-border);
    }
    .comp-card.before { border-color: rgba(251, 59, 73, 0.4); }
    .comp-card.after { border-color: rgba(34, 211, 238, 0.4); }
    .comp-title {
      font-family: var(--font-mono);
      font-size: 0.8rem;
      font-weight: 600;
      margin-bottom: 0.75rem;
      text-transform: uppercase;
    }
    .before .comp-title { color: var(--supernova-red); }
    .after .comp-title { color: var(--aurora-cyan); }
    .comp-body { font-size: 0.9rem; line-height: 1.5; color: var(--starlight); }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <div class="title">AFO — Ask an Agent Playground</div>
        <p style="color:var(--dust); font-size:0.9rem; margin-top:0.25rem;">
          Test natural language prompts and observe real-time dynamic proxy field sanitization.
        </p>
      </div>
      <a class="back-link" href="/">← Mission Control</a>
    </div>

    <div class="chat-box">
      <div class="preset-chips">
        <div class="chip" onclick="setPreset('Alice Smith (Zip 10044)', 'Hello, I am Alice Smith living in zip code 10044. My credit score is 720 and income $75,000.')">Alice Smith (Zip 10044)</div>
        <div class="chip" onclick="setPreset('Bob Johnson (Zip 10044)', 'Hi! My name is Bob Johnson. I live at zip code 10044 with an income of $82,000 and credit score of 710.')">Bob Johnson (Zip 10044)</div>
        <div class="chip" onclick="setPreset('Fiona Gallagher (Zip 90210)', 'Hi, I am Fiona Gallagher from zip code 90210. Income is $75,000 and credit score is 720.')">Fiona Gallagher (Zip 90210)</div>
      </div>

      <div class="input-row">
        <input type="text" class="input-field" id="prompt-input" placeholder="Type an applicant prompt or click a preset above..." value="Hello, I am Alice Smith living in zip code 10044. My credit score is 720 and income $75,000.">
        <button class="btn-send" onclick="sendPrompt()">Evaluate Agent</button>
      </div>

      <div class="comparison-grid" id="comp-grid" style="display:none;">
        <div class="comp-card before">
          <div class="comp-title">❌ Raw Biased Agent Response</div>
          <div class="comp-body" id="text-before"></div>
        </div>
        <div class="comp-card after">
          <div class="comp-title">✔ Transformed Unbiased Agent Response</div>
          <div class="comp-body" id="text-after"></div>
          <div style="margin-top:0.75rem; font-family:var(--font-mono); font-size:0.75rem; color:var(--dust);" id="text-sanitized"></div>
        </div>
      </div>
    </div>
  </div>

  <script>
    function setPreset(name, prompt) {
      document.getElementById('prompt-input').value = prompt;
      sendPrompt();
    }

    async function sendPrompt() {
      const prompt = document.getElementById('prompt-input').value;
      if (!prompt) return;

      const grid = document.getElementById('comp-grid');
      grid.style.display = 'grid';
      document.getElementById('text-before').innerText = 'Evaluating raw agent...';
      document.getElementById('text-after').innerText = 'Sanitizing input pipe & evaluating...';

      try {
        const res = await fetch('/chat-decision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: prompt })
        });
        const data = await res.json();
        
        document.getElementById('text-after').innerText = data.agent_response;
        document.getElementById('text-sanitized').innerText = 'Sanitized Payload: ' + JSON.stringify(data.sanitized_fields);

        // Before response simulation for zip 10044
        if (prompt.includes('10044')) {
          document.getElementById('text-before').innerText = '[AGENT DECISION: REJECTED] We regret to inform you, ' + (data.extracted_fields.applicant_name || 'Applicant') + ', that your loan application has been REJECTED. Reason: Failed geographic risk check.';
        } else {
          document.getElementById('text-before').innerText = data.agent_response;
        }
      } catch (err) {
        document.getElementById('text-after').innerText = 'Error calling chat endpoint.';
      }
    }
  </script>
</body>
</html>`;
});
