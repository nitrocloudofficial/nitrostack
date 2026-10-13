/**
 * Recourse Paths — Inline HTML Widget Component
 *
 * Renders recourse paths with causal chains, costs, time estimates,
 * fraud safety status, and simulated outcomes.
 *
 * Data is injected by NitroStudio into `window.openai.toolOutput`.
 */

import { createComponent } from '@nitrostack/core';

export const recoursePathsWidget = createComponent({
  id: 'recourse-paths',
  name: 'Recourse Paths Dashboard',
  description: 'Renders causally valid recourse paths with costs, timelines, and simulated outcomes',
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
.dashboard { max-width: 720px; margin: 0 auto; }
.summary-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.stat-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(30,30,46,0.7);
  border: 1px solid rgba(148,163,184,0.12);
  border-radius: 10px;
  font-size: 13px;
}
.stat-num {
  font-size: 20px;
  font-weight: 800;
}
.status-banner {
  text-align: center;
  padding: 24px;
  border-radius: 14px;
  margin-bottom: 20px;
  font-size: 16px;
  font-weight: 600;
}
.status-approved-already {
  background: rgba(16,185,129,0.08);
  border: 1px solid rgba(52,211,153,0.2);
  color: #6ee7b7;
}
.status-no-paths {
  background: rgba(251,191,36,0.08);
  border: 1px solid rgba(251,191,36,0.2);
  color: #fde68a;
}
.path-card {
  background: rgba(30,30,46,0.7);
  border: 1px solid rgba(148,163,184,0.12);
  border-radius: 14px;
  margin-bottom: 16px;
  overflow: hidden;
  backdrop-filter: blur(10px);
  transition: border-color 0.2s;
}
.path-card:hover { border-color: rgba(99,102,241,0.4); }
.path-header {
  padding: 16px 20px;
  border-bottom: 1px solid rgba(148,163,184,0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.path-title {
  font-size: 15px;
  font-weight: 700;
  color: #f1f5f9;
}
.path-id {
  font-size: 11px;
  color: #64748b;
  font-family: monospace;
  background: rgba(148,163,184,0.08);
  padding: 3px 8px;
  border-radius: 4px;
}
.confidence-badge {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
}
.conf-high { background: rgba(52,211,153,0.15); color: #34d399; }
.conf-medium { background: rgba(251,191,36,0.15); color: #fbbf24; }
.conf-low { background: rgba(248,113,113,0.15); color: #f87171; }
.path-body { padding: 16px 20px; }
.path-desc {
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.6;
  margin-bottom: 16px;
}
.meta-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}
.meta-label { color: #64748b; }
.meta-value { font-weight: 700; color: #e2e8f0; }
.action-list { margin-bottom: 16px; }
.action-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 14px;
  background: rgba(148,163,184,0.04);
  border-radius: 8px;
  margin-bottom: 6px;
  font-size: 13px;
}
.action-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #6366f1;
  margin-top: 5px;
  flex-shrink: 0;
}
.action-cost {
  margin-left: auto;
  font-weight: 700;
  color: #fbbf24;
  white-space: nowrap;
}
.causal-chain {
  font-size: 12px;
  color: #64748b;
  padding: 10px 14px;
  background: rgba(99,102,241,0.06);
  border: 1px solid rgba(99,102,241,0.12);
  border-radius: 8px;
  margin-bottom: 12px;
  font-family: monospace;
  line-height: 1.6;
}
.sim-result {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
}
.sim-approved {
  background: rgba(16,185,129,0.1);
  border: 1px solid rgba(52,211,153,0.2);
  color: #34d399;
}
.sim-rejected {
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(248,113,113,0.2);
  color: #f87171;
}
.fraud-safe {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #34d399;
  padding: 3px 8px;
  background: rgba(52,211,153,0.08);
  border-radius: 4px;
}
.fraud-flagged {
  color: #fbbf24;
  background: rgba(251,191,36,0.08);
}
.advisory-badge {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(99,102,241,0.15);
  color: #a5b4fc;
}
.note-box {
  padding: 14px 18px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.6;
  color: #94a3b8;
  background: rgba(148,163,184,0.04);
  border: 1px solid rgba(148,163,184,0.08);
  margin-top: 8px;
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
    var status = data.status || 'UNKNOWN';

    if (status === 'ALREADY_APPROVED') {
      root.innerHTML = '<div class="dashboard"><div class="status-banner status-approved-already">✅ Applicant Already Approved<br><span style="font-size:13px;font-weight:400;color:#94a3b8;margin-top:8px;display:block;">' + (data.note || '') + '</span></div></div>';
      return;
    }
    if (status === 'NO_PATHS_WITHIN_CONSTRAINTS') {
      root.innerHTML = '<div class="dashboard"><div class="status-banner status-no-paths">⚠️ No Paths Within Constraints<br><span style="font-size:13px;font-weight:400;color:#94a3b8;margin-top:8px;display:block;">' + (data.note || '') + '</span></div></div>';
      return;
    }

    var paths = data.paths || [];
    var summaryHtml =
      '<div class="summary-bar">' +
        '<div class="stat-chip"><span class="stat-num" style="color:#6366f1;">' + (data.totalPathsGenerated || 0) + '</span><span>Paths Generated</span></div>' +
        '<div class="stat-chip"><span class="stat-num" style="color:#34d399;">' + (data.pathsLeadingToApproval || 0) + '</span><span>Lead to Approval</span></div>' +
        (data.advisoryPaths ? '<div class="stat-chip"><span class="stat-num" style="color:#a5b4fc;">' + data.advisoryPaths + '</span><span>Advisory</span></div>' : '') +
      '</div>';

    var pathsHtml = paths.map(function(p) {
      var confClass = p.confidence === 'HIGH' ? 'conf-high' : (p.confidence === 'MEDIUM' ? 'conf-medium' : 'conf-low');
      var actionsHtml = (p.actions || []).map(function(a) {
        return '<div class="action-item"><div class="action-dot"></div><div><strong>' + a.variable + '</strong>: ' + a.change + ' <span style="color:#64748b;">(' + a.timeMonths + ' mo)</span></div><span class="action-cost">$' + a.cost.toLocaleString() + '</span></div>';
      }).join('');

      var simHtml = '';
      if (p.simulatedResult) {
        var simApproved = p.simulatedResult.status === 'APPROVED';
        simHtml = '<div class="sim-result ' + (simApproved ? 'sim-approved' : 'sim-rejected') + '"><span>' + (simApproved ? '✅' : '❌') + ' Simulated: ' + p.simulatedResult.status + '</span><span>' + (p.simulatedResult.approvalProbability * 100).toFixed(1) + '%</span></div>';
      }

      var fraudHtml = '';
      if (p.fraudSafety && p.fraudSafety.checked) {
        fraudHtml = p.fraudSafety.originallyFlagged
          ? '<span class="fraud-safe fraud-flagged">⚠ Fraud Flagged: ' + (p.fraudSafety.vector || '') + '</span>'
          : '<span class="fraud-safe">✓ Fraud Safe</span>';
      }

      return '<div class="path-card">' +
        '<div class="path-header">' +
          '<div><div class="path-title">' + p.title + '</div><div class="path-id">' + p.id + '</div></div>' +
          '<div style="display:flex;gap:6px;align-items:center;">' +
            (p.advisory ? '<span class="advisory-badge">Advisory</span>' : '') +
            '<span class="confidence-badge ' + confClass + '">' + p.confidence + '</span>' +
            fraudHtml +
          '</div>' +
        '</div>' +
        '<div class="path-body">' +
          '<div class="path-desc">' + p.description + '</div>' +
          '<div class="meta-row">' +
            '<div class="meta-item"><span class="meta-label">Cost:</span><span class="meta-value" style="color:#fbbf24;">$' + (p.totalCostUSD || 0).toLocaleString() + '</span></div>' +
            '<div class="meta-item"><span class="meta-label">Time:</span><span class="meta-value">' + (p.totalTimeMonths || 0) + ' months</span></div>' +
          '</div>' +
          (actionsHtml ? '<div class="action-list">' + actionsHtml + '</div>' : '') +
          (p.causalChain ? '<div class="causal-chain">' + p.causalChain + '</div>' : '') +
          simHtml +
        '</div>' +
      '</div>';
    }).join('');

    root.innerHTML = '<div class="dashboard">' + summaryHtml + pathsHtml +
      (data.note ? '<div class="note-box">' + data.note + '</div>' : '') +
    '</div>';
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
