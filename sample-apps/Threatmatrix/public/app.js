/**
 * ThreatMatrix — Grok AI Single-Window Controller (Zero Chat History Memory)
 */

const state = {
  started: false,
  messages: [],
  theme: 'dark',
  modelMode: 'llama-3.3-70b-versatile',
  activeTool: 'process_request',
  activeToolIcon: '🤖',
};

const proverbs = [
  "In code we trust, in threat intelligence we verify.",
  "Security is not a product, it's a continuous process.",
  "Zero fabrication policy: Real evidence & dynamic AI reasoning.",
  "Agentic AI: Dynamic forensic analysis at machine speed.",
  "Accuracy is always more important than completeness.",
  "An ounce of prevention is worth a terabyte of cure."
];

let proverbIndex = 0;
let charIndex = 0;
let isDeleting = false;
let typewriterSpeed = 60;

let currentAttachment = null;

document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('tm_grok_theme') || 'dark';
  applyTheme(savedTheme);
  typeProverb();
  initGreyNettingCanvas();
  initDragAndDrop();

  document.addEventListener('click', (e) => {
    const modeBtn = document.querySelector('.mode-selector-dropdown');
    const toolBtn = document.querySelector('.search-tool-dropdown');
    if (modeBtn && !modeBtn.contains(e.target)) {
      document.getElementById('mode-dropdown-menu')?.classList.remove('open');
    }
    if (toolBtn && !toolBtn.contains(e.target)) {
      document.getElementById('tool-menu-popover')?.classList.remove('open');
    }
  });
});

function initDragAndDrop() {
  const box = document.querySelector('.grok-input-box');
  if (!box) return;

  ['dragenter', 'dragover'].forEach(eventName => {
    box.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      box.classList.add('drag-over');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    box.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      box.classList.remove('drag-over');
    }, false);
  });

  box.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files && files.length > 0) {
      processFileObject(files[0]);
    }
  });
}

function handleFileAttach(evt) {
  const file = evt.target.files[0];
  if (file) {
    processFileObject(file);
  }
}

function processFileObject(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const fileData = e.target.result;
    
    let fileIcon = '📄';
    if (file.type.startsWith('image/')) fileIcon = '🖼️';
    else if (file.name.endsWith('.pdf')) fileIcon = '📄';
    else if (file.name.match(/\.(docx|pptx|xlsx|rtf|odt|csv)$/i)) fileIcon = '📊';

    currentAttachment = {
      name: file.name,
      type: file.type,
      data: fileData,
      icon: fileIcon,
    };

    const badge = document.getElementById('attached-file-badge');
    const nameEl = document.getElementById('attachment-file-name');
    const iconEl = document.getElementById('attachment-type-icon');

    if (badge && nameEl && iconEl) {
      nameEl.innerText = file.name;
      iconEl.innerText = fileIcon;
      badge.style.display = 'flex';
    }

    if (file.name.endsWith('.pdf')) {
      selectSearchTool('analyze_pdf', '📄', 'PDF Malware Stream Scanner');
    } else if (file.type.startsWith('image/')) {
      selectSearchTool('analyze_image_text', '🖼️', 'Gemini Vision OCR');
    } else {
      selectSearchTool('process_request', '🤖', 'Universal Agentic AI Pipeline');
    }
  };

  if (file.type.startsWith('image/') || file.name.endsWith('.pdf') || file.name.match(/\.(docx|pptx|xlsx|zip|exe|bin|raw)$/i)) {
    reader.readAsDataURL(file);
  } else {
    reader.readAsText(file);
  }
}

function removeAttachment() {
  currentAttachment = null;
  const badge = document.getElementById('attached-file-badge');
  if (badge) badge.style.display = 'none';
  const filePicker = document.getElementById('file-picker');
  if (filePicker) filePicker.value = '';
}

function typeProverb() {
  const target = document.getElementById('typewriter-text');
  if (!target) return;

  const currentText = proverbs[proverbIndex];

  if (isDeleting) {
    charIndex--;
    typewriterSpeed = 25;
  } else {
    charIndex++;
    typewriterSpeed = 50;
  }

  target.innerText = currentText.substring(0, charIndex);

  if (!isDeleting && charIndex === currentText.length) {
    typewriterSpeed = 2000;
    isDeleting = true;
  } else if (isDeleting && charIndex === 0) {
    isDeleting = false;
    proverbIndex = (proverbIndex + 1) % proverbs.length;
    typewriterSpeed = 350;
  }

  setTimeout(typeProverb, typewriterSpeed);
}

function toggleTheme() {
  const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme);
}

function applyTheme(theme) {
  state.theme = theme;
  localStorage.setItem('tm_grok_theme', theme);
  document.body.className = theme;
  const iconEl = document.getElementById('theme-icon');
  if (iconEl) iconEl.innerText = theme === 'dark' ? '🌙' : '☀️';
}

function toggleModeDropdown() {
  const menu = document.getElementById('mode-dropdown-menu');
  if (menu) menu.classList.toggle('open');
}

function selectModelMode(label, modeKey) {
  state.modelMode = modeKey;
  const labelEl = document.getElementById('current-mode-label');
  if (labelEl) labelEl.innerText = label;
  document.getElementById('mode-dropdown-menu')?.classList.remove('open');
}

function toggleToolMenu() {
  const popover = document.getElementById('tool-menu-popover');
  if (popover) popover.classList.toggle('open');
}

function selectSearchTool(toolName, icon, label) {
  state.activeTool = toolName;
  state.activeToolIcon = icon;

  const iconEl = document.getElementById('selected-tool-icon');
  const nameEl = document.getElementById('selected-tool-name');
  if (iconEl) iconEl.innerText = icon;
  if (nameEl) nameEl.innerText = toolName;

  document.querySelectorAll('.tool-option').forEach(el => el.classList.remove('active'));
  event?.currentTarget?.classList?.add('active');
  document.getElementById('tool-menu-popover')?.classList.remove('open');
}

function usePrompt(text) {
  const input = document.getElementById('prompt-input');
  input.value = text;
  autoExpandTextarea(input);
  sendMessage();
}

function autoExpandTextarea(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 140) + 'px';
}

function handleKeyDown(evt) {
  if (evt.key === 'Enter' && !evt.shiftKey) {
    evt.preventDefault();
    sendMessage();
  }
}

async function sendMessage() {
  const input = document.getElementById('prompt-input');
  let userText = input.value.trim();

  if (!userText && !currentAttachment) return;

  // Build combined payload if attachment present
  let displayContent = userText;
  let submissionInput = userText;

  if (currentAttachment) {
    displayContent = `📎 **Attached File**: \`${currentAttachment.name}\`\n${userText ? `\n${userText}` : ''}`;
    submissionInput = userText ? `${userText}\n\n[FILE ATTACHMENT: ${currentAttachment.name}]\n${currentAttachment.data}` : currentAttachment.data;
  }

  input.value = '';
  autoExpandTextarea(input);
  removeAttachment();

  if (!state.started) {
    state.started = true;
    document.getElementById('empty-state').style.display = 'none';
    document.getElementById('messages-list').style.display = 'flex';
  }

  // User Message
  state.messages.push({ role: 'user', content: displayContent, tool: state.activeTool });
  renderMessages();

  // Assistant Loading Placeholder
  const aiIndex = state.messages.length;
  state.messages.push({
    role: 'assistant',
    content: 'Running Grok Real-Time Forensic Scanning...',
    loading: true,
    tool: state.activeTool,
  });
  renderMessages();

  try {
    let response;
    let data;

    const apiKey = localStorage.getItem('tm_api_key') || '';

    if (state.activeTool !== 'process_request') {
      // Direct MCP Tool Execution
      response = await fetch(`/mcp/tools/${state.activeTool}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-api-key': apiKey } : {}),
        },
        body: JSON.stringify(buildToolPayload(state.activeTool, submissionInput)),
      });
      const rawData = await response.json();
      if (rawData.success && rawData.result) {
        const r = rawData.result;
        data = {
          success: true,
          response: r.summary,
          reasoning_summary: r.summary,
          riskScore: r.riskScore,
          riskLevel: r.riskLevel,
          confidence: r.confidence,
          findings: Array.isArray(r.findings) ? r.findings : [],
          recommendedActions: Array.isArray(r.recommendations) ? r.recommendations : [],
          completedChecks: Array.isArray(r.completedChecks) ? r.completedChecks : [],
          failedChecks: Array.isArray(r.failedChecks) ? r.failedChecks : [],
          skippedChecks: Array.isArray(r.skippedChecks) ? r.skippedChecks : [],
          sourcesUsed: Array.isArray(r.sourcesUsed) ? r.sourcesUsed : [],
          limitations: Array.isArray(r.limitations) ? r.limitations : [],
          metadata: r.metadata || {},
        };
      } else {
        data = { success: false, error: rawData.error };
      }
    } else {
      // Universal Agentic AI Pipeline
      response = await fetch('/api/process-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-api-key': apiKey } : {}),
        },
        body: JSON.stringify({ input: submissionInput }),
      });
      data = await response.json();
    }

    if (data.success) {
      state.messages[aiIndex] = {
        role: 'assistant',
        content: data.response || 'Analysis completed.',
        reasoningSummary: data.reasoning_summary,
        intent: data.intent,
        riskScore: data.riskScore,
        riskLevel: data.riskLevel,
        confidence: data.confidence,
        findings: data.findings || [],
        recommendedActions: data.recommendedActions || [],
        completedChecks: data.completedChecks || [],
        failedChecks: data.failedChecks || [],
        skippedChecks: data.skippedChecks || [],
        sourcesUsed: data.sourcesUsed || [],
        limitations: data.limitations || [],
        metadata: data.metadata || {},
        loading: false,
      };
    } else {
      state.messages[aiIndex] = {
        role: 'assistant',
        content: `❌ **Execution Error**: ${data.error?.message || 'Execution failed.'}`,
        isError: true,
        loading: false,
      };
    }
    renderMessages();
  } catch (err) {
    state.messages[aiIndex] = {
      role: 'assistant',
      content: `❌ **Connection Error**: ${err.message || 'Unable to reach backend service.'}`,
      isError: true,
      loading: false,
    };
    renderMessages();
  }
}

function buildToolPayload(toolName, userText) {
  switch (toolName) {
    case 'analyze_url': return { url: userText };
    case 'lookup_ip': return { ip: userText };
    case 'lookup_hash': return { hash: userText };
    case 'analyze_pdf': return { filePath: userText };
    case 'analyze_email': return { rawText: userText };
    case 'extract_iocs': return { text: userText };
    case 'investigate': return { target: userText, type: 'auto' };
    default: return { input: userText };
  }
}

function renderMessages() {
  const container = document.getElementById('messages-list');
  if (!container) return;
  container.innerHTML = '';

  state.messages.forEach(m => {
    const row = document.createElement('div');
    row.className = `message-row ${m.role}`;

    if (m.role === 'user') {
      row.innerHTML = `<div class="user-bubble">${renderMarkdown(m.content)}</div>`;
    } else {
      const riskLevel = m.riskLevel || 'SAFE';
      const riskScore = typeof m.riskScore === 'number' ? m.riskScore : 0;
      const confidencePercent = m.confidence ? Math.round(m.confidence * 100) : null;
      const model = m.metadata?.model || 'grok-2.0-versatile';

      let checksHtml = '';
      if ((m.completedChecks && m.completedChecks.length > 0) || (m.failedChecks && m.failedChecks.length > 0)) {
        checksHtml = `
          <div style="background: var(--bg-pill); padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-color); font-size: 12px; margin-top: 8px;">
            <div style="font-weight: 700; color: var(--accent-gold); margin-bottom: 4px;">📡 Grok Intelligence Feeds:</div>
            ${m.completedChecks && m.completedChecks.length > 0 ? `<div><span style="color:#10b981;">✓ Scanned:</span> ${m.completedChecks.map(c=>`<code>${escapeHtml(c)}</code>`).join(', ')}</div>` : ''}
            ${m.failedChecks && m.failedChecks.length > 0 ? `<div style="margin-top:4px;"><span style="color:#ef4444;">❌ Bypassed:</span> ${m.failedChecks.map(c=>`<code>${escapeHtml(c)}</code>`).join(', ')}</div>` : ''}
            ${m.sourcesUsed && m.sourcesUsed.length > 0 ? `<div style="margin-top:4px;"><span style="color:#6366f1;">🌐 Live Feeds:</span> ${m.sourcesUsed.map(s=>`<code>${escapeHtml(s)}</code>`).join(', ')}</div>` : ''}
          </div>
        `;
      }

      let findingsHtml = '';
      if (m.findings && m.findings.length > 0) {
        findingsHtml = `
          <div style="background: var(--bg-pill); padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-color); font-size: 13px; margin-top: 10px;">
            <div style="font-weight: 700; color: var(--accent-gold); margin-bottom: 4px;">🔍 Threat & Structural Vectors:</div>
            <ul style="margin-left: 16px;">
              ${m.findings.map(f => `<li><strong>[${escapeHtml(f.severity || 'INFO')}]</strong> ${escapeHtml(f.description)}</li>`).join('')}
            </ul>
          </div>
        `;
      }

      row.innerHTML = `
        <div class="assistant-card">
          <div class="assistant-header-bar">
            <div class="assistant-title">𝕏 ThreatMatrix Grok Agent | <span style="color:var(--text-muted); font-size:11px;">Tool: ${escapeHtml(m.tool || 'process_request')}</span></div>
            <div style="font-family: var(--font-mono); color: var(--text-muted); font-size: 11px;">${escapeHtml(model)}</div>
          </div>

          ${!m.loading && !m.isError ? `
          <div class="risk-pill-row">
            <div class="risk-badge ${riskLevel}">${riskLevel}</div>
            <div class="risk-score-num">${riskScore} <span style="font-size:11px; color:var(--text-muted);">/ 100</span></div>
            ${confidencePercent !== null ? `<div style="font-family:var(--font-mono); font-size:11px; padding:2px 8px; border-radius:8px; background:rgba(200,144,75,0.2); color:#c8904b;">Confidence: ${confidencePercent}%</div>` : ''}
            <div style="font-size: 12px; color: var(--text-muted); flex: 1;">${escapeHtml(m.reasoningSummary || '')}</div>
          </div>
          ` : ''}

          <div class="assistant-body">
            ${m.loading ? '<span style="animation: blink 0.8s infinite;">Grok real-time threat scanning in progress...</span>' : renderMarkdown(m.content)}
          </div>

          ${checksHtml}
          ${findingsHtml}
        </div>
      `;
    }

    container.appendChild(row);
  });

  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

function renderMarkdown(str) {
  if (!str) return '';
  
  let html = escapeHtml(str);
  html = html.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
  html = html.replace(/^# (.*?)$/gm, '<h1 style="font-size:22px; font-weight:800; color:var(--text-primary); margin:18px 0 8px; border-bottom:1px solid var(--border-color); padding-bottom:6px;">$1</h1>');
  html = html.replace(/^## (.*?)$/gm, '<h2 style="font-size:16px; font-weight:700; color:var(--accent-gold); margin:16px 0 8px;">$1</h2>');
  html = html.replace(/^### (.*?)$/gm, '<h3 style="font-size:14px; font-weight:600; color:var(--text-primary); margin:12px 0 6px;">$1</h3>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--text-primary); font-weight:700;">$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/`([^`]+)`/g, '<code style="font-family:var(--font-mono); background:var(--bg-pill-hover); padding:2px 6px; border-radius:6px; font-size:12.5px; border:1px solid var(--border-color); color:var(--accent-gold);">$1</code>');
  html = html.replace(/^&gt;\s+(.*?)$/gm, '<blockquote style="border-left: 3px solid var(--accent-gold); padding: 4px 12px; margin: 8px 0; color: var(--text-secondary); background: var(--bg-pill); border-radius:4px;">$1</blockquote>');
  html = html.replace(/^\s*-\s+(.*?)$/gm, '<li style="margin-left:16px; margin-bottom:4px; color:var(--text-secondary);">$1</li>');
  html = html.replace(/^\s*\*\s+(.*?)$/gm, '<li style="margin-left:16px; margin-bottom:4px; color:var(--text-secondary);">$1</li>');
  html = html.replace(/\n\n/g, '<br><br>');
  return html;
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function initGreyNettingCanvas() {
  const canvas = document.getElementById('grey-netting-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  const mouse = { x: -1000, y: -1000 };
  window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
  window.addEventListener('resize', () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; });

  const nodes = [];
  const count = Math.floor((width * height) / 16000);

  for (let i = 0; i < count; i++) {
    nodes.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 1.5 + 1,
    });
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    const isLight = state.theme === 'light';
    ctx.fillStyle = isLight ? 'rgba(37, 74, 114, 0.35)' : 'rgba(200, 144, 75, 0.45)';
    ctx.strokeStyle = isLight ? 'rgba(37, 74, 114, 0.08)' : 'rgba(200, 144, 75, 0.12)';

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      n.x += n.vx; n.y += n.vy;

      if (n.x < 0) n.x = width; if (n.x > width) n.x = 0;
      if (n.y < 0) n.y = height; if (n.y > height) n.y = 0;

      const dx = mouse.x - n.x; const dy = mouse.y - n.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120) {
        ctx.beginPath();
        ctx.strokeStyle = isLight ? 'rgba(200, 144, 75, 0.35)' : 'rgba(200, 144, 75, 0.55)';
        ctx.moveTo(n.x, n.y); ctx.lineTo(mouse.x, mouse.y);
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      ctx.fill();

      for (let j = i + 1; j < nodes.length; j++) {
        const n2 = nodes[j];
        const ndx = n.x - n2.x; const ndy = n.y - n2.y;
        const ndist = Math.sqrt(ndx * ndx + ndy * ndy);

        if (ndist < 100) {
          ctx.beginPath();
          ctx.moveTo(n.x, n.y); ctx.lineTo(n2.x, n2.y);
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(render);
  }

  render();
}
