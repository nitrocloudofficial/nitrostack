import os
import json
from typing import Any, Dict, List

class HTMLReportGenerator:
    def generate_report(
        self,
        projected_candidates: List[Dict[str, Any]],
        decision_logs: List[Dict[str, Any]],
        quality_dashboard: Dict[str, Any],
        validation_results: List[Any],
        malformed_sources: List[str],
        output_path: str
    ) -> None:
        """
        Generates a completely static, self-contained HTML report.
        Embeds the JSON data directly into the file as JavaScript constants
        to bypass browser local-file CORS restrictions.
        """
        # Serialize data cleanly
        projected_json = json.dumps(projected_candidates, indent=2)
        decision_json = json.dumps(decision_logs, indent=2)
        dashboard_json = json.dumps(quality_dashboard, indent=2)
        
        # Flatten validation errors
        val_errors = []
        for idx, vr in enumerate(validation_results):
            if hasattr(vr, 'errors') and vr.errors:
                cand_id = decision_logs[idx].get('candidate_id', 'Unknown')
                for err in vr.errors:
                    val_errors.append({"candidate_id": cand_id, "error": err})
        val_errors_json = json.dumps(val_errors, indent=2)
        malformed_json = json.dumps(malformed_sources, indent=2)

        html_template = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Candidate Transformer — Execution Report</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #f8fafc;
            --card-bg: #ffffff;
            --text-main: #0f172a;
            --text-muted: #64748b;
            --border-color: #e2e8f0;
            --primary: #2563eb;
            --primary-light: #eff6ff;
            --success: #16a34a;
            --success-light: #f0fdf4;
            --warning: #ca8a04;
            --warning-light: #fefce8;
            --error: #dc2626;
            --error-light: #fef2f2;
            --accent: #4f46e5;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--bg-color);
            color: var(--text-main);
            line-height: 1.5;
            padding: 2rem;
        }

        .container {
            max-width: 1450px;
            margin: 0 auto;
        }

        header {
            margin-bottom: 2rem;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 1.5rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        h1 {
            font-size: 1.8rem;
            font-weight: 700;
            background: linear-gradient(135deg, var(--primary), var(--accent));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .subtitle {
            font-size: 0.95rem;
            color: var(--text-muted);
            margin-top: 0.25rem;
        }

        /* Buttons & Actions */
        .btn-group {
            display: flex;
            gap: 0.75rem;
        }

        .btn {
            display: inline-flex;
            align-items: center;
            padding: 0.5rem 1rem;
            font-size: 0.875rem;
            font-weight: 500;
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
            color: var(--text-main);
            text-decoration: none;
        }

        .btn:hover {
            background-color: #f1f5f9;
            border-color: #cbd5e1;
        }

        .btn-primary {
            background-color: var(--primary);
            color: white;
            border-color: var(--primary);
        }

        .btn-primary:hover {
            background-color: #1d4ed8;
            border-color: #1d4ed8;
        }

        /* Tabs Navigation */
        .tabs {
            display: flex;
            border-bottom: 1px solid var(--border-color);
            margin-bottom: 2rem;
            gap: 1.5rem;
        }

        .tab-btn {
            padding: 0.75rem 0.25rem;
            font-size: 0.95rem;
            font-weight: 500;
            color: var(--text-muted);
            border: none;
            background: none;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: all 0.2s;
        }

        .tab-btn:hover {
            color: var(--text-main);
        }

        .tab-btn.active {
            color: var(--primary);
            border-bottom-color: var(--primary);
        }

        .tab-content {
            display: none;
        }

        .tab-content.active {
            display: block;
        }

        /* Run Summary Widgets */
        .grid-widgets {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }

        .widget-card {
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }

        .widget-val {
            font-size: 2rem;
            font-weight: 700;
            margin-top: 0.5rem;
            color: var(--primary);
        }

        .widget-label {
            font-size: 0.85rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        /* Dashboard Charts Section */
        .dashboard-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
            margin-bottom: 2rem;
        }

        @media (max-width: 900px) {
            .dashboard-grid {
                grid-template-columns: 1fr;
            }
        }

        .chart-card {
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 1.5rem;
        }

        .chart-title {
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 1.5rem;
            color: var(--text-main);
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 0.5rem;
        }

        .chart-container {
            min-height: 250px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        /* Simple Bar Charts */
        .bar-chart {
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }

        .bar-row {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .bar-label {
            width: 160px;
            font-size: 0.85rem;
            color: var(--text-muted);
            text-align: right;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .bar-track {
            flex-grow: 1;
            background-color: #f1f5f9;
            height: 16px;
            border-radius: 4px;
            overflow: hidden;
        }

        .bar-fill {
            background-color: var(--primary);
            height: 100%;
            border-radius: 4px;
        }

        .bar-val {
            width: 50px;
            font-size: 0.85rem;
            font-weight: 500;
        }

        /* Candidate Explorer */
        .explorer-layout {
            display: grid;
            grid-template-columns: 320px 1fr;
            gap: 2rem;
        }

        @media (max-width: 900px) {
            .explorer-layout {
                grid-template-columns: 1fr;
            }
        }

        .candidate-list {
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            max-height: 750px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
        }

        .candidate-item {
            padding: 1.25rem;
            border-bottom: 1px solid var(--border-color);
            cursor: pointer;
            transition: background-color 0.2s;
            text-align: left;
            border-left: 4px solid transparent;
        }

        .candidate-item:hover {
            background-color: #f8fafc;
        }

        .candidate-item.active {
            background-color: var(--primary-light);
            border-left-color: var(--primary);
        }

        .cand-name-title {
            font-weight: 600;
            font-size: 0.95rem;
        }

        .cand-id-subtitle {
            font-size: 0.8rem;
            color: var(--text-muted);
            margin-top: 0.25rem;
        }

        .candidate-detail {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }

        /* Collapsible details styling */
        details.collapsible-card {
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            overflow: hidden;
            transition: all 0.25s ease-out;
        }

        details.collapsible-card summary {
            padding: 1rem 1.5rem;
            font-weight: 600;
            font-size: 1rem;
            cursor: pointer;
            background-color: #f8fafc;
            user-select: none;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid transparent;
        }

        details.collapsible-card[open] summary {
            background-color: #f1f5f9;
            border-bottom-color: var(--border-color);
        }

        details.collapsible-card .card-content {
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        /* Profile Grid Layout */
        .profile-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.25rem;
        }

        .profile-field {
            border: 1px solid var(--border-color);
            border-radius: 6px;
            padding: 0.75rem 1rem;
            background-color: #fafafa;
        }

        .profile-field-label {
            font-size: 0.75rem;
            font-weight: 600;
            color: var(--text-muted);
            text-transform: uppercase;
        }

        .profile-field-val {
            font-size: 0.95rem;
            font-weight: 500;
            margin-top: 0.25rem;
            word-break: break-all;
        }

        /* Decision Steps UI */
        .field-steps-container {
            display: flex;
            flex-direction: column;
            gap: 2rem;
        }

        .field-step-card {
            border: 1px solid var(--border-color);
            border-radius: 8px;
            background-color: #ffffff;
            overflow: hidden;
        }

        .field-step-header {
            background-color: #f1f5f9;
            padding: 0.75rem 1.25rem;
            font-weight: 700;
            font-size: 0.9rem;
            display: flex;
            justify-content: space-between;
            color: var(--text-main);
            border-bottom: 1px solid var(--border-color);
        }

        .field-step-flow {
            padding: 1.25rem;
            background-color: #fafafa;
            border-bottom: 1px solid var(--border-color);
        }

        .flow-step-item {
            display: flex;
            gap: 1.5rem;
            margin-bottom: 0.75rem;
            font-size: 0.85rem;
        }

        .flow-step-item:last-child {
            margin-bottom: 0;
        }

        .flow-label {
            width: 150px;
            font-weight: 600;
            color: var(--text-muted);
            text-transform: uppercase;
            font-size: 0.75rem;
            letter-spacing: 0.05em;
        }

        .flow-val {
            flex-grow: 1;
            word-break: break-all;
        }

        .contender-pill {
            background-color: #f1f5f9;
            border-radius: 4px;
            padding: 0.1rem 0.4rem;
            font-family: monospace;
            font-size: 0.8rem;
        }

        .flow-explain-box {
            padding: 1.25rem;
            background-color: #f8fafc;
            border-top: 1px solid var(--border-color);
            font-size: 0.9rem;
        }

        .explain-title {
            font-weight: 600;
            font-size: 0.8rem;
            text-transform: uppercase;
            color: var(--primary);
            margin-bottom: 0.5rem;
            letter-spacing: 0.05em;
        }

        .explain-text {
            line-height: 1.6;
            white-space: pre-line;
            color: #334155;
        }

        /* Tables & Lists */
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.85rem;
        }

        th, td {
            padding: 0.75rem 1rem;
            text-align: left;
            border-bottom: 1px solid var(--border-color);
        }

        th {
            background-color: #f8fafc;
            font-weight: 600;
            color: var(--text-muted);
        }

        tr:hover td {
            background-color: #fafafa;
        }

        /* Validation Alerts */
        .alert {
            padding: 1rem 1.25rem;
            border-radius: 6px;
            margin-bottom: 1rem;
            border: 1px solid transparent;
            font-size: 0.9rem;
        }

        .alert-error {
            background-color: var(--error-light);
            border-color: #fecaca;
            color: var(--error);
        }

        .alert-warning {
            background-color: var(--warning-light);
            border-color: #fef08a;
            color: var(--warning);
        }

        .alert-info {
            background-color: var(--primary-light);
            border-color: #bfdbfe;
            color: var(--primary);
        }

        .confidence-badge {
            display: inline-flex;
            align-items: center;
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.85rem;
            font-weight: 600;
        }

        .conf-high {
            background-color: var(--success-light);
            color: var(--success);
        }

        .conf-med {
            background-color: var(--warning-light);
            color: var(--warning);
        }

        .conf-low {
            background-color: var(--error-light);
            color: var(--error);
        }

        pre {
            background-color: #1e293b;
            color: #f8fafc;
            padding: 1rem;
            border-radius: 6px;
            overflow-x: auto;
            font-family: monospace;
            font-size: 0.85rem;
            max-height: 400px;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div>
                <h1>Candidate Transformer</h1>
                <div class="subtitle">System Execution Decision & Resolution Report</div>
            </div>
            <div class="btn-group">
                <button class="btn" onclick="downloadFile('projected')">Download Projected JSON</button>
                <button class="btn" onclick="downloadFile('decision')">Download Decision Log</button>
                <button class="btn" onclick="downloadFile('dashboard')">Download Dashboard</button>
            </div>
        </header>

        <div class="tabs">
            <button class="tab-btn active" onclick="switchTab('summary')">Run Summary</button>
            <button class="tab-btn" onclick="switchTab('explorer')">Candidate Explorer</button>
            <button class="tab-btn" onclick="switchTab('validation')">Validation Log</button>
        </div>

        <!-- SUMMARY TAB -->
        <div id="tab-summary" class="tab-content active">
            <div class="grid-widgets">
                <div class="widget-card">
                    <span class="widget-label">Total Inputs</span>
                    <span class="widget-val" id="widget-total-inputs">-</span>
                </div>
                <div class="widget-card">
                    <span class="widget-label">Merged Profiles</span>
                    <span class="widget-val" id="widget-merged-profiles">-</span>
                </div>
                <div class="widget-card">
                    <span class="widget-label">Unresolved Ties</span>
                    <span class="widget-val" id="widget-unresolved-ties" style="color: var(--error);">-</span>
                </div>
                <div class="widget-card">
                    <span class="widget-label">Conflicts</span>
                    <span class="widget-val" id="widget-conflicts" style="color: var(--warning);">-</span>
                </div>
                <div class="widget-card">
                    <span class="widget-label">Validation Warnings</span>
                    <span class="widget-val" id="widget-validation-warnings">-</span>
                </div>
            </div>

            <div class="dashboard-grid">
                <div class="chart-card">
                    <div class="chart-title">Confidence Level per Canonical Field</div>
                    <div class="chart-container" id="confidence-chart-container">
                        <!-- Rendered via JS -->
                    </div>
                </div>
                <div class="chart-card">
                    <div class="chart-title">Conflict Resolution and Merging Metrics</div>
                    <div class="chart-container" id="conflicts-chart-container">
                        <!-- Rendered via JS -->
                    </div>
                </div>
            </div>
        </div>

        <!-- EXPLORER TAB -->
        <div id="tab-explorer" class="tab-content">
            <div class="explorer-layout">
                <div class="candidate-list" id="explorer-cand-list">
                    <!-- Loaded dynamically -->
                </div>
                <div class="candidate-detail" id="explorer-cand-detail">
                    <div style="color: var(--text-muted); text-align: center; padding-top: 150px;">
                        Select a candidate from the sidebar to explore detailed resolution traces and explainability logs.
                    </div>
                </div>
            </div>
        </div>

        <!-- VALIDATION TAB -->
        <div id="tab-validation" class="tab-content">
            <div class="chart-card" style="margin-bottom: 2rem;">
                <div class="chart-title">System Execution Warnings and File Skips</div>
                <div id="validation-warnings-container">
                    <!-- Loaded dynamically -->
                </div>
            </div>
        </div>
    </div>

    <!-- Data Injection script -->
    <script>
        const projectedCandidates = __PROJECTED_JSON__;
        const decisionLog = __DECISION_JSON__;
        const qualityDashboard = __DASHBOARD_JSON__;
        const validationWarnings = __VAL_ERRORS_JSON__;
        const malformedSources = __MALFORMED_JSON__;

        // Switch Tabs logic
        function switchTab(tabId) {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            const targetBtn = Array.from(document.querySelectorAll('.tab-btn')).find(btn => btn.innerText.toLowerCase().includes(tabId));
            if (targetBtn) targetBtn.classList.add('active');
            
            const targetContent = document.getElementById('tab-' + tabId);
            if (targetContent) targetContent.classList.add('active');
        }

        // Download Files helper
        function downloadFile(type) {
            let data, filename;
            if (type === 'projected') {
                data = projectedCandidates;
                filename = 'projected_candidates.json';
            } else if (type === 'decision') {
                data = decisionLog;
                filename = 'decision_log.json';
            } else if (type === 'dashboard') {
                data = qualityDashboard;
                filename = 'quality_dashboard.json';
            }
            
            const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        }

        // Format float confidence
        function formatConf(val) {
            if (typeof val === 'number') return (val * 100).toFixed(0) + '%';
            return val;
        }

        // Render Summary widgets
        function renderSummary() {
            const summary = qualityDashboard.batch_summary || {};
            const resolution = qualityDashboard.resolution_metrics || {};
            
            document.getElementById('widget-total-inputs').innerText = summary.total_candidates_processed || 0;
            document.getElementById('widget-merged-profiles').innerText = summary.total_merged_candidates || 0;
            document.getElementById('widget-unresolved-ties').innerText = resolution.unresolved_conflicts || 0;
            document.getElementById('widget-conflicts').innerText = resolution.total_conflicts || 0;
            document.getElementById('widget-validation-warnings').innerText = validationWarnings.length + (summary.malformed_sources_skipped || 0);
            
            // Render Confidence Bar Chart
            const coverage = qualityDashboard.schema_coverage || {};
            const avgFieldConf = coverage.average_confidence_per_field || {};
            let confHtml = '<div class="bar-chart">';
            for (const [field, val] of Object.entries(avgFieldConf)) {
                const pct = (val * 100).toFixed(0);
                confHtml += `
                    <div class="bar-row">
                        <span class="bar-label">${field}</span>
                        <div class="bar-track">
                            <div class="bar-fill" style="width: ${pct}%"></div>
                        </div>
                        <span class="bar-val">${pct}%</span>
                    </div>
                `;
            }
            confHtml += '</div>';
            document.getElementById('confidence-chart-container').innerHTML = confHtml;

            // Render Conflict Metrics Bar Chart
            const extraFields = resolution.extra_fields_count || 0;
            const validationErrors = resolution.validation_errors_count || 0;
            const weakSignals = resolution.promoted_weak_signals_count || 0;
            const unresolvedTies = resolution.unresolved_conflicts || 0;
            const conflicts = resolution.total_conflicts || 0;
            
            const metrics = [
                {label: 'Resolved Conflicts', val: conflicts},
                {label: 'Unresolved Ties', val: unresolvedTies},
                {label: 'Weak Signal Promotions', val: weakSignals},
                {label: 'Validation Warnings', val: validationErrors},
                {label: 'Extra/Unmapped Fields', val: extraFields}
            ];
            
            const maxVal = Math.max(...metrics.map(m => m.val), 1);
            let metricsHtml = '<div class="bar-chart">';
            metrics.forEach(m => {
                const pct = (m.val / maxVal * 100).toFixed(0);
                metricsHtml += `
                    <div class="bar-row">
                        <span class="bar-label">${m.label}</span>
                        <div class="bar-track">
                            <div class="bar-fill" style="width: ${pct}%; background-color: var(--accent);"></div>
                        </div>
                        <span class="bar-val">${m.val}</span>
                    </div>
                `;
            });
            metricsHtml += '</div>';
            document.getElementById('conflicts-chart-container').innerHTML = metricsHtml;
        }

        // Render Explorer Sidebar List
        function renderExplorerList() {
            const listContainer = document.getElementById('explorer-cand-list');
            let listHtml = '';
            
            projectedCandidates.forEach((cand, idx) => {
                const nameObj = cand.name || cand.full_name || {};
                const name = nameObj.value || 'Unresolved/Tie Candidate';
                const candId = decisionLog[idx].candidate_id;
                
                listHtml += `
                    <div class="candidate-item" id="cand-item-${idx}" onclick="selectCandidate(${idx})">
                        <div class="cand-name-title">${name}</div>
                        <div class="cand-id-subtitle">ID: ${candId}</div>
                    </div>
                `;
            });
            
            listContainer.innerHTML = listHtml;
        }

        // Select Candidate explorer pane
        function selectCandidate(idx) {
            document.querySelectorAll('.candidate-item').forEach(item => item.classList.remove('active'));
            document.getElementById('cand-item-' + idx).classList.add('active');
            
            const cand = projectedCandidates[idx];
            const logEntry = decisionLog[idx];
            
            const nameObj = cand.name || cand.full_name || {};
            const name = nameObj.value || 'Unresolved/Tie Candidate';
            const candId = logEntry.candidate_id;
            
            // Header stats
            let badgeClass = 'conf-high';
            const avgConf = logEntry.fields && Object.keys(logEntry.fields).length > 0 
                ? (Object.values(logEntry.fields).reduce((acc, f) => acc + (f.final_confidence || 0), 0) / Object.keys(logEntry.fields).length) 
                : 1.0;
            
            if (avgConf < 0.5) badgeClass = 'conf-low';
            else if (avgConf < 0.8) badgeClass = 'conf-med';

            // 1. Calculate Source Contributions
            const contributions = {};
            for (const [field, fd] of Object.entries(logEntry.fields)) {
                fd.candidates_considered.forEach(c => {
                    contributions[c.source] = (contributions[c.source] || 0) + 1;
                });
            }
            let sourceHtml = '<table><thead><tr><th>Contributing Source File</th><th>Fields Contributed</th></tr></thead><tbody>';
            for (const [src, cnt] of Object.entries(contributions)) {
                sourceHtml += `<tr><td><strong>${src}</strong></td><td><span class="confidence-badge conf-high" style="font-weight:normal;">${cnt} Field(s)</span></td></tr>`;
            }
            sourceHtml += '</tbody></table>';

            // 2. Identity Resolution anchoring values
            const emailsList = logEntry.fields.emails && logEntry.fields.emails.winner_details 
                ? logEntry.fields.emails.winner_details.unioned_values : [];
            const phonesList = logEntry.fields.phones && logEntry.fields.phones.winner_details 
                ? logEntry.fields.phones.winner_details.unioned_values : [];
            
            let anchorHtml = '<ul style="margin-left: 1.5rem; font-size: 0.9rem; line-height: 1.7;">';
            if (emailsList.length > 0) anchorHtml += `<li><strong>Email Anchors:</strong> ${emailsList.join(', ')}</li>`;
            if (phonesList.length > 0) anchorHtml += `<li><strong>Phone Anchors:</strong> ${phonesList.join(', ')}</li>`;
            if (emailsList.length === 0 && phonesList.length === 0) anchorHtml += '<li>No explicit email or phone anchors found. Linked via default component IDs.</li>';
            anchorHtml += '</ul>';

            // 3. Compile Canonical Profile Grid
            let profileHtml = '<div class="profile-grid">';
            for (const [field, valObj] of Object.entries(cand)) {
                if (field === 'provenance' || field === 'extra_fields') continue;
                let displayVal = valObj && valObj.value !== undefined ? valObj.value : valObj;
                profileHtml += `
                    <div class="profile-field">
                        <div class="profile-field-label">${field}</div>
                        <div class="profile-field-val">${JSON.stringify(displayVal)}</div>
                    </div>
                `;
            }
            profileHtml += '</div>';

            // 4. Compile Decision Timeline Cards
            let stepsHtml = '<div class="field-steps-container">';
            for (const [field, fd] of Object.entries(logEntry.fields)) {
                const winner = fd.winner_details || {};
                const valStr = winner.value !== undefined ? winner.value : (winner.unioned_values ? winner.unioned_values : 'null');
                
                let winBadge = 'conf-high';
                if (fd.final_confidence < 0.5) winBadge = 'conf-low';
                else if (fd.final_confidence < 0.8) winBadge = 'conf-med';

                // Raw, normalized, evidence tier flow step list
                let contendersHtml = '';
                fd.candidates_considered.forEach((c, cIdx) => {
                    const statusStyle = c.action === 'merged' || c.action === 'normalized' 
                        ? 'color: var(--success); font-weight:700;' 
                        : (c.action === 'tied' ? 'color: var(--warning); font-weight:700;' : 'color: var(--error);');
                    contendersHtml += `
                        <div class="flow-step-item" style="border-left: 2px solid #cbd5e1; padding-left: 1rem; margin-left: 0.5rem;">
                            <div class="flow-label">Source ${cIdx+1}:</div>
                            <div class="flow-val">
                                <strong>${c.source}</strong><br>
                                Raw Key: <span class="contender-pill">${c.raw_key}</span> | Raw Value: <code>${JSON.stringify(c.raw_value)}</code><br>
                                Normalized: <code>${JSON.stringify(c.normalized_value)}</code> | Evidence Tier: <span class="confidence-badge conf-med" style="font-size:0.7rem; padding:0.1rem 0.4rem;">Tier ${c.evidence_tier}</span> | Confidence: ${formatConf(c.evidence_confidence)}<br>
                                Action: <span style="${statusStyle}">${c.action.toUpperCase()}</span>
                            </div>
                        </div>
                    `;
                });

                stepsHtml += `
                    <div class="field-step-card">
                        <div class="field-step-header">
                            <span>Field Decision: ${field.toUpperCase()}</span>
                            <span class="confidence-badge ${winBadge}">Merged Confidence: ${formatConf(fd.final_confidence)}</span>
                        </div>
                        <div class="field-step-flow">
                            <div class="flow-step-item" style="margin-bottom: 1.25rem;">
                                <div class="flow-label" style="color: var(--primary);">Canonical Value:</div>
                                <div class="flow-val" style="font-size: 1rem; font-weight: 700; color: var(--primary);">${JSON.stringify(valStr)}</div>
                            </div>
                            <div style="font-weight: 600; font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem;">Raw Contenders Compared:</div>
                            ${contendersHtml}
                        </div>
                        <div class="flow-explain-box">
                            <div class="explain-title">Resolution Rule & Reason:</div>
                            <div class="explain-text">${winner.reason || 'None (No winner resolved)'}</div>
                        </div>
                    </div>
                `;
            }
            stepsHtml += '</div>';

            // 5. Compile Conflict details
            let conflictHtml = '<ul style="margin-left: 1.5rem; font-size: 0.9rem; line-height: 1.7;">';
            let penaltyApplied = false;
            for (const [field, fd] of Object.entries(logEntry.fields)) {
                if (fd.conflict_penalty_applied) {
                    penaltyApplied = true;
                    conflictHtml += `<li><span style="color: var(--error); font-weight:600;">[Penalty Applied]</span> Field <strong>${field}</strong>: confidence reduced by 10% due to disagreeing source values.</li>`;
                }
            }
            if (!penaltyApplied) conflictHtml += '<li>No conflict penalties were applied. All sources were mutually corroborating or complemented without disagreement.</li>';
            conflictHtml += '</ul>';

            // 6. Compile Extra / Unmapped Fields details
            let extraHtml = '<p style="color: var(--text-muted); font-size:0.9rem;">No unmapped or invalid fields were ignored for this profile.</p>';
            if (logEntry.extra_fields && logEntry.extra_fields.length > 0) {
                extraHtml = '<table><thead><tr><th>Raw Key</th><th>Raw Value</th><th>Source File</th><th>Reason / Route Status</th></tr></thead><tbody>';
                logEntry.extra_fields.forEach(ef => {
                    extraHtml += `
                        <tr>
                            <td><strong>${ef.raw_key}</strong></td>
                            <td><code>${JSON.stringify(ef.value)}</code></td>
                            <td>${ef.source}</td>
                            <td><span class="confidence-badge conf-low" style="font-weight:normal;">${ef.reason}</span></td>
                        </tr>
                    `;
                });
                extraHtml += '</tbody></table>';
            }

            // 7. Validation errors list
            const candErrors = validationWarnings.filter(w => w.candidate_id === candId);
            let valHtml = '<div class="alert alert-info" style="margin-bottom:0;"><strong>[PASSED]</strong> Candidate structure successfully validated against projection rules.</div>';
            if (candErrors.length > 0) {
                valHtml = '';
                candErrors.forEach(err => {
                    valHtml += `<div class="alert alert-warning" style="margin-bottom:0.5rem;"><strong>[WARNING]</strong> ${err.error}</div>`;
                });
            }

            // Assemble details sections into collapsible cards
            document.getElementById('explorer-cand-detail').innerHTML = `
                <div style="background-color: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h2 style="font-size: 1.6rem; font-weight:700;">${name}</h2>
                            <div style="color: var(--text-muted); font-size:0.85rem; margin-top:0.25rem;">Candidate Identity ID: <strong>${candId}</strong></div>
                        </div>
                        <span class="confidence-badge ${badgeClass}" style="font-size: 0.95rem; padding: 0.4rem 1rem;">AVG CONFIDENCE: ${formatConf(avgConf)}</span>
                    </div>
                </div>

                <details class="collapsible-card" open>
                    <summary>1. Canonical Profile Summary <span>&#9662;</span></summary>
                    <div class="card-content">${profileHtml}</div>
                </details>

                <details class="collapsible-card" open>
                    <summary>2. Source File Contributions <span>&#9662;</span></summary>
                    <div class="card-content">${sourceHtml}</div>
                </details>

                <details class="collapsible-card">
                    <summary>3. Identity Resolution Linkages <span>&#9662;</span></summary>
                    <div class="card-content">${anchorHtml}</div>
                </details>

                <details class="collapsible-card" open>
                    <summary>4. Field Decision Timeline & Explainability Traces <span>&#9662;</span></summary>
                    <div class="card-content">${stepsHtml}</div>
                </details>

                <details class="collapsible-card">
                    <summary>5. Conflict Penalty & Weak Signal Promotions <span>&#9662;</span></summary>
                    <div class="card-content">${conflictHtml}</div>
                </details>

                <details class="collapsible-card">
                    <summary>6. Validation Status Alerts <span>&#9662;</span></summary>
                    <div class="card-content">${valHtml}</div>
                </details>

                <details class="collapsible-card">
                    <summary>7. Extra / Unmapped & Ignored Fields <span>&#9662;</span></summary>
                    <div class="card-content">${extraHtml}</div>
                </details>

                <details class="collapsible-card">
                    <summary>8. Raw JSON Output Projection <span>&#9662;</span></summary>
                    <div class="card-content">
                        <pre><code>${JSON.stringify(cand, null, 2)}</code></pre>
                    </div>
                </details>
            `;
        }

        // Render Validation page warnings
        function renderValidation() {
            const container = document.getElementById('validation-warnings-container');
            let alertsHtml = '';
            
            if (malformedSources.length === 0 && validationWarnings.length === 0) {
                alertsHtml = `
                    <div class="alert alert-info">
                        <strong>All files processed successfully!</strong> No malformed inputs or validation errors were recorded for this batch.
                    </div>
                `;
            } else {
                malformedSources.forEach(src => {
                    alertsHtml += `
                        <div class="alert alert-error">
                            <strong>[Malformed File Skip]</strong> Skipped source <strong>${src}</strong>. No plugin could parse it or the file content was completely corrupted.
                        </div>
                    `;
                });
                
                validationWarnings.forEach(warn => {
                    alertsHtml += `
                        <div class="alert alert-warning">
                            <strong>[Validation Warning]</strong> Candidate <strong>${warn.candidate_id}</strong>: ${warn.error}
                        </div>
                    `;
                });
            }
            
            container.innerHTML = alertsHtml;
        }

        // Init page
        renderSummary();
        renderExplorerList();
        renderValidation();
    </script>
</body>
</html>
"""
        
        # Replace template placeholders
        rendered_html = html_template.replace("__PROJECTED_JSON__", projected_json)
        rendered_html = rendered_html.replace("__DECISION_JSON__", decision_json)
        rendered_html = rendered_html.replace("__DASHBOARD_JSON__", dashboard_json)
        rendered_html = rendered_html.replace("__VAL_ERRORS_JSON__", val_errors_json)
        rendered_html = rendered_html.replace("__MALFORMED_JSON__", malformed_json)
        
        try:
            with open(output_path, mode='w', encoding='utf-8') as f:
                f.write(rendered_html)
            print(f"   Generated static HTML report at: {output_path}")
        except Exception as e:
            print(f"Error generating static HTML report: {e}")
