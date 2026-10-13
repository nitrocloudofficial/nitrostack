/**
 * Adverse Action Reasons — Inline HTML Widget Component
 *
 * Renders ECOA Regulation B adverse action reason codes with
 * legal authority citations and severity indicators.
 *
 * Data is injected by NitroStudio into `window.openai.toolOutput`.
 */

import { createComponent } from '@nitrostack/core';

export const adverseActionWidget = createComponent({
  id: 'adverse-action',
  name: 'Adverse Action Reasons',
  description: 'Renders ECOA adverse action reason codes with legal citations',
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
.dashboard { max-width: 680px; margin: 0 auto; }
.header-card {
  background: linear-gradient(135deg, rgba(220,38,38,0.12), rgba(239,68,68,0.06));
  border: 1px solid rgba(239,68,68,0.2);
  border-radius: 14px;
  padding: 20px 24px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.header-title {
  font-size: 18px;
  font-weight: 700;
  color: #fca5a5;
}
.header-statute {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
  font-family: monospace;
}
.count-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(239,68,68,0.15);
  border: 2px solid rgba(239,68,68,0.3);
  font-size: 24px;
  font-weight: 800;
  color: #f87171;
}
.reason-card {
  background: rgba(30,30,46,0.7);
  border: 1px solid rgba(148,163,184,0.12);
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 12px;
  backdrop-filter: blur(10px);
  transition: border-color 0.2s;
}
.reason-card:hover {
  border-color: rgba(239,68,68,0.3);
}
.reason-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
}
.reason-code {
  font-size: 11px;
  font-weight: 700;
  font-family: monospace;
  padding: 4px 10px;
  background: rgba(239,68,68,0.12);
  color: #f87171;
  border-radius: 6px;
  letter-spacing: 0.5px;
}
.reason-title {
  font-size: 15px;
  font-weight: 700;
  color: #f1f5f9;
  margin-bottom: 8px;
}
.reason-detail {
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.6;
  margin-bottom: 10px;
}
.authority-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #64748b;
  padding: 6px 10px;
  background: rgba(148,163,184,0.06);
  border: 1px solid rgba(148,163,184,0.1);
  border-radius: 6px;
}
.no-reasons {
  text-align: center;
  padding: 40px;
  color: #34d399;
  font-size: 16px;
  font-weight: 600;
  background: rgba(16,185,129,0.06);
  border: 1px solid rgba(52,211,153,0.15);
  border-radius: 14px;
}
</style>
</head>
<body>
<div id="root">Loading...</div>
<script>
(function() {
  var data = (window.openai && window.openai.toolOutput) || {};

  function render() {
    var root = document.getElementById('root');

    var statute = data.statute || '';
    var total = data.totalReasons || 0;
    var reasons = data.adverseActionReasons || [];

    if (reasons.length === 0) {
      root.innerHTML = '<div class="dashboard"><div class="no-reasons">✅ No Adverse Action Reasons Found<br><span style="font-size:13px;font-weight:400;color:#94a3b8;">This applicant meets all underwriting criteria.</span></div></div>';
      return;
    }

    var headerHtml =
      '<div class="header-card">' +
        '<div>' +
          '<div class="header-title">⚖️ Adverse Action Notice</div>' +
          '<div class="header-statute">' + statute + '</div>' +
        '</div>' +
        '<div class="count-badge">' + total + '</div>' +
      '</div>';

    var reasonsHtml = reasons.map(function(r, i) {
      return '<div class="reason-card">' +
        '<div class="reason-header">' +
          '<div class="reason-title">' + (i + 1) + '. ' + r.title + '</div>' +
          '<span class="reason-code">' + r.code + '</span>' +
        '</div>' +
        '<div class="reason-detail">' + r.detail + '</div>' +
        '<div class="authority-tag">📜 ' + r.authority + '</div>' +
      '</div>';
    }).join('');

    root.innerHTML = '<div class="dashboard">' + headerHtml + reasonsHtml + '</div>';
  }

  function handleMessage(event) {
    if (!event.data) return;

    var payload = null;
    if (event.data.type === 'toolOutput') {
      payload = event.data.data;
    } else if (event.data.type === 'NITRO_INJECT_OPENAI' && event.data.data) {
      payload = event.data.data.toolOutput;
    }

    if (payload) {
      data = payload;
      render();
    }
  }

  window.addEventListener('message', handleMessage);

  if (window.openai && window.openai.toolOutput) { render(); }
  else { setTimeout(render, 100); }
})();
</script>
</body>
</html>`,
});
