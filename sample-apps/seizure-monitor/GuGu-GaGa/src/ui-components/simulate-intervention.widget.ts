/**
 * Simulate Intervention — Inline HTML Widget Component
 *
 * Renders a before/after comparison dashboard showing how proposed
 * financial changes affect the approval probability and score breakdown.
 *
 * Data is injected by NitroStudio into `window.openai.toolOutput`.
 */

import { createComponent } from '@nitrostack/core';

export const simulateInterventionWidget = createComponent({
  id: 'simulate-intervention',
  name: 'Intervention Simulation',
  description: 'Renders before/after comparison of intervention simulation results',
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
.delta-banner {
  text-align: center;
  padding: 24px;
  border-radius: 14px;
  margin-bottom: 24px;
}
.delta-positive {
  background: linear-gradient(135deg, rgba(16,185,129,0.1), rgba(52,211,153,0.05));
  border: 1px solid rgba(52,211,153,0.25);
}
.delta-negative {
  background: linear-gradient(135deg, rgba(239,68,68,0.1), rgba(248,113,113,0.05));
  border: 1px solid rgba(248,113,113,0.25);
}
.delta-value {
  font-size: 42px;
  font-weight: 800;
  letter-spacing: -2px;
  margin-bottom: 4px;
}
.delta-label {
  font-size: 13px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 1.5px;
}
.flip-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 50px;
  font-size: 15px;
  font-weight: 700;
  margin-top: 12px;
}
.flip-yes {
  background: rgba(52,211,153,0.15);
  color: #34d399;
  border: 1px solid rgba(52,211,153,0.3);
}
.flip-no {
  background: rgba(148,163,184,0.08);
  color: #94a3b8;
  border: 1px solid rgba(148,163,184,0.15);
}
.comparison {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}
.panel {
  background: rgba(30,30,46,0.7);
  border: 1px solid rgba(148,163,184,0.12);
  border-radius: 14px;
  overflow: hidden;
  backdrop-filter: blur(10px);
}
.panel-header {
  padding: 14px 18px;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  border-bottom: 1px solid rgba(148,163,184,0.08);
}
.panel-before .panel-header {
  color: #94a3b8;
  background: rgba(148,163,184,0.04);
}
.panel-after .panel-header {
  color: #34d399;
  background: rgba(52,211,153,0.04);
}
.panel-body { padding: 16px 18px; }
.panel-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 12px;
}
.status-approved { color: #34d399; }
.status-rejected { color: #f87171; }
.prob-value {
  font-size: 28px;
  font-weight: 800;
  margin-bottom: 4px;
}
.prob-label {
  font-size: 11px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.score-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid rgba(148,163,184,0.06);
  font-size: 13px;
}
.score-item:last-child { border-bottom: none; }
.score-item-label { color: #94a3b8; }
.score-item-value { font-weight: 700; }
.message-box {
  padding: 16px 20px;
  border-radius: 10px;
  font-size: 14px;
  line-height: 1.6;
}
.message-success {
  background: rgba(16,185,129,0.08);
  border: 1px solid rgba(52,211,153,0.2);
  color: #6ee7b7;
}
.message-fail {
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(248,113,113,0.2);
  color: #fca5a5;
}
</style>
</head>
<body>
<div id="root">Loading...</div>
<script>
(function() {
  var data = (window.openai && window.openai.toolOutput) || {};

  function getColor(pct) {
    if (pct >= 65) return '#34d399';
    if (pct >= 50) return '#fbbf24';
    return '#f87171';
  }

  function renderScores(bd) {
    if (!bd) return '';
    var items = [
      { label: 'Credit Score', comp: bd.creditScoreComponent },
      { label: 'DTI Ratio', comp: bd.dtiComponent },
      { label: 'Income', comp: bd.incomeComponent },
      { label: 'Credit History', comp: bd.creditHistoryComponent },
    ];
    return items.map(function(c) {
      if (!c.comp) return '';
      return '<div class="score-item"><span class="score-item-label">' + c.label + '</span><span class="score-item-value" style="color:' + getColor(c.comp.score / c.comp.maxScore * 100) + '">' + c.comp.score.toFixed(1) + '/' + c.comp.maxScore + '</span></div>';
    }).join('');
  }

  function render() {
    var root = document.getElementById('root');

    var before = data.beforeIntervention || {};
    var after = data.afterIntervention || {};
    var change = data.probabilityChange || '+0%';
    var flipped = data.outcomeFlipped || false;
    var msg = data.message || '';

    var changeNum = parseFloat(change);
    var isPositive = changeNum >= 0;

    var beforeProb = before.probability || '0%';
    var afterProb = after.probability || '0%';
    var beforeProbNum = parseFloat(beforeProb);
    var afterProbNum = parseFloat(afterProb);
    var afterApproved = (after.status || '') === 'APPROVED';

    root.innerHTML =
      '<div class="dashboard">' +
        '<div class="delta-banner ' + (isPositive ? 'delta-positive' : 'delta-negative') + '">' +
          '<div class="delta-value" style="color:' + (isPositive ? '#34d399' : '#f87171') + '">' + change + '</div>' +
          '<div class="delta-label">Probability Change</div>' +
          '<div class="flip-badge ' + (flipped ? 'flip-yes' : 'flip-no') + '">' +
            (flipped ? '🎉 Outcome Flipped to APPROVED!' : '⬆ Not Yet Sufficient for Approval') +
          '</div>' +
        '</div>' +
        '<div class="comparison">' +
          '<div class="panel panel-before">' +
            '<div class="panel-header">Before Intervention</div>' +
            '<div class="panel-body">' +
              '<div class="panel-status ' + (before.status === 'APPROVED' ? 'status-approved' : 'status-rejected') + '">' +
                (before.status === 'APPROVED' ? '✅' : '❌') + ' ' + (before.status || 'N/A') +
              '</div>' +
              '<div class="prob-value" style="color:' + getColor(beforeProbNum) + '">' + beforeProb + '</div>' +
              '<div class="prob-label">Approval Probability</div>' +
              '<div style="margin-top:12px;">' + renderScores(before.scoreBreakdown) + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="panel panel-after">' +
            '<div class="panel-header">After Intervention</div>' +
            '<div class="panel-body">' +
              '<div class="panel-status ' + (afterApproved ? 'status-approved' : 'status-rejected') + '">' +
                (afterApproved ? '✅' : '❌') + ' ' + (after.status || 'N/A') +
              '</div>' +
              '<div class="prob-value" style="color:' + getColor(afterProbNum) + '">' + afterProb + '</div>' +
              '<div class="prob-label">Approval Probability</div>' +
              '<div style="margin-top:12px;">' + renderScores(after.scoreBreakdown) + '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="message-box ' + (afterApproved ? 'message-success' : 'message-fail') + '">' + msg + '</div>' +
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
