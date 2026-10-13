import express, { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { db } from '../database/connection.js';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.js';
import { generatePdfReport } from '../../src/modules/verichain/services/pdf-generator.js';
import { runRiskAnalysis } from '../../src/modules/verichain/agents/risk.js';

const router = express.Router();

// Helper to run TS PDF generation on the fly
async function regeneratePdfReport(decisionId: number): Promise<string> {
    try {
        const dec = await db.get<any>('SELECT * FROM decisions WHERE id = ?', [decisionId]);
        if (!dec) {
            throw new Error(`Decision ID ${decisionId} not found.`);
        }
        
        const evidence = await db.all<any>('SELECT * FROM evidence');
        const conflicts = await db.all<any>('SELECT * FROM conflicts WHERE decision_id = ?', [decisionId]);
        
        // Gather evidence format for risk
        const evidencePayload = evidence.map(x => ({
            doc_id: x.doc_id,
            doc_name: `Doc ${x.doc_id}`,
            entity: x.entity,
            claim: x.claim,
            category: x.category,
            value: x.value,
            credibility_score: x.credibility_score,
            source_location: x.source_location,
            status: x.status
        }));
        
        const conflictsPayload = conflicts.map(x => ({
            doc_id_1: x.doc_id_1 || null,
            doc_id_2: x.doc_id_2 || null,
            description: x.description,
            severity: x.severity,
            conflict_type: x.conflict_type,
            status: x.status
        }));
        
        const risks = await runRiskAnalysis(evidencePayload, conflictsPayload);
        const pdfPath = await generatePdfReport(dec, evidence, conflicts, risks);
        
        // Register report in db if needed
        const reports = await db.all<any>('SELECT * FROM reports WHERE decision_id = ?', [decisionId]);
        const pdfRep = reports.find(r => r.format.toUpperCase() === 'PDF');
        if (!pdfRep) {
            await db.run(
                'INSERT INTO reports (decision_id, file_path, format, created_at) VALUES (?, ?, ?, ?)',
                [decisionId, pdfPath, 'PDF', new Date().toISOString()]
            );
        }
        
        return pdfPath;
    } catch (err: any) {
        console.error('TS PDF regeneration failed:', err.message);
        throw err;
    }
}

// GET /reports/:decision_id/pdf
router.get('/:decision_id/pdf', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    const decisionId = Number(req.params.decision_id);

    try {
        const reports = await db.all<any>('SELECT * FROM reports WHERE decision_id = ?', [decisionId]);
        const pdfReport = reports.find(r => r.format.toUpperCase() === 'PDF');

        let pdfPath = '';
        if (pdfReport && fs.existsSync(pdfReport.file_path)) {
            pdfPath = pdfReport.file_path;
        } else {
            console.log(`PDF report not found for decision ${decisionId}. Generating...`);
            pdfPath = await regeneratePdfReport(decisionId);
        }

        const filename = `verichain_report_${decisionId}.pdf`;
        return res.download(pdfPath, filename, (err) => {
            if (err) {
                console.error('Failed to send file:', err.message);
            }
        });
    } catch (err: any) {
        console.error('Error generating PDF:', err.message);
        return res.status(500).json({ detail: 'Failed to download or generate PDF report' });
    }
});

// GET /reports/:decision_id/json
router.get('/:decision_id/json', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    const decisionId = Number(req.params.decision_id);

    try {
        const decision = await db.get<any>('SELECT * FROM decisions WHERE id = ?', [decisionId]);
        if (!decision) {
            return res.status(404).json({ detail: 'Decision not found' });
        }

        const conflicts = await db.all<any>('SELECT * FROM conflicts WHERE decision_id = ?', [decisionId]);
        const logs = await db.all<any>('SELECT * FROM agent_logs WHERE decision_id = ? ORDER BY created_at ASC', [decisionId]);
        const evidence = await db.all<any>('SELECT * FROM evidence');

        // Risk calculations via TS
        const evidencePayload = evidence.map(x => ({
            doc_id: x.doc_id,
            doc_name: `Doc ${x.doc_id}`,
            entity: x.entity,
            claim: x.claim,
            category: x.category,
            value: x.value,
            credibility_score: x.credibility_score,
            source_location: x.source_location,
            status: x.status
        }));
        
        const conflictsPayload = conflicts.map(x => ({
            doc_id_1: x.doc_id_1 || null,
            doc_id_2: x.doc_id_2 || null,
            description: x.description,
            severity: x.severity,
            conflict_type: x.conflict_type,
            status: x.status
        }));
        
        const risks = await runRiskAnalysis(evidencePayload, conflictsPayload);

        const reportData = {
            decision_id: decision.id,
            query: decision.query,
            recommendation: decision.decision_status,
            confidence_score: decision.confidence_score,
            explanation: decision.explanation,
            risks: risks,
            evidence: evidence.map(ev => ({
                entity: ev.entity,
                claim: ev.claim,
                category: ev.category,
                value: ev.value,
                credibility_score: ev.credibility_score,
                source_location: ev.source_location,
                status: ev.status
            })),
            conflicts: conflicts.map(c => ({
                description: c.description,
                severity: c.severity,
                conflict_type: c.conflict_type,
                status: c.status
            })),
            agent_logs: logs.map(log => ({
                agent: log.agent_name,
                message: log.log_message,
                status: log.status,
                timestamp: log.created_at
            }))
        };

        const filename = `verichain_report_${decisionId}.json`;
        res.setHeader('Content-disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-type', 'application/json');
        return res.send(JSON.stringify(reportData, null, 2));
    } catch (err: any) {
        console.error('Error exporting JSON report:', err.message);
        return res.status(500).json({ detail: 'Failed to export JSON report' });
    }
});

// GET /reports/:decision_id/html
router.get('/:decision_id/html', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    const decisionId = Number(req.params.decision_id);

    try {
        const decision = await db.get<any>('SELECT * FROM decisions WHERE id = ?', [decisionId]);
        if (!decision) {
            return res.status(404).json({ detail: 'Decision not found' });
        }

        const conflicts = await db.all<any>('SELECT * FROM conflicts WHERE decision_id = ?', [decisionId]);
        const evidence = await db.all<any>('SELECT * FROM evidence');

        // Calculate risks
        const evidencePayload = evidence.map(x => ({
            doc_id: x.doc_id,
            doc_name: `Doc ${x.doc_id}`,
            entity: x.entity,
            claim: x.claim,
            category: x.category,
            value: x.value,
            credibility_score: x.credibility_score,
            source_location: x.source_location,
            status: x.status
        }));
        
        const conflictsPayload = conflicts.map(x => ({
            doc_id_1: x.doc_id_1 || null,
            doc_id_2: x.doc_id_2 || null,
            description: x.description,
            severity: x.severity,
            conflict_type: x.conflict_type,
            status: x.status
        }));
        
        const risks = await runRiskAnalysis(evidencePayload, conflictsPayload);

        // HTML Layout compilation
        const evidenceRows = evidence.map(ev => 
            `<tr><td>${ev.entity}</td><td>${ev.category}</td><td>${ev.claim}</td><td>${Math.round(ev.credibility_score * 100)}%</td></tr>`
        ).join('');

        const conflictRows = conflicts.length > 0 ? conflicts.map(c => 
            `<tr style='color:#721c24; background-color:#f8d7da;'><td>${c.conflict_type.toUpperCase()}</td><td>${c.severity.toUpperCase()}</td><td>${c.description}</td></tr>`
        ).join('') : "<tr><td colspan='3' style='color:#155724; background-color:#d4edda;'>No conflicts detected.</td></tr>";

        const badgeColors: Record<string, string> = {
            "APPROVE": "background-color: #28a745; color: white;",
            "REJECT": "background-color: #dc3545; color: white;",
            "REVIEW": "background-color: #ffc107; color: black;"
        };
        const badgeStyle = badgeColors[decision.decision_status] || "background-color: #6c757d; color: white;";

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>VeriChain AI Report - ${decisionId}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
                h1 { color: #0d1b2a; border-bottom: 2px solid #e63946; padding-bottom: 10px; }
                .badge { display: inline-block; padding: 10px 20px; font-weight: bold; border-radius: 5px; font-size: 18px; margin: 15px 0; ${badgeStyle} }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                th { background-color: #1b263b; color: white; }
                .card { border: 1px solid #ddd; border-radius: 5px; padding: 15px; background: #f8f9fa; margin: 20px 0; }
            </style>
        </head>
        <body>
            <h1>VeriChain AI - Document Verification Report</h1>
            <div><strong>Decision ID:</strong> ${decision.id} | <strong>Date:</strong> ${new Date(decision.created_at).toLocaleString()}</div>
            <div class="card">
                <h3>Query</h3>
                <p>${decision.query}</p>
            </div>
            
            <div class="badge">RECOMMENDED STATUS: ${decision.decision_status}</div>
            <div>Verification Confidence: ${Math.round(decision.confidence_score * 100)}% | Overall Risk: ${risks.overall_risk_score || 0}%</div>
            
            <h2>Risk Assessment</h2>
            <ul>
                <li>Financial Risk: ${risks.financial_risk || 0}%</li>
                <li>Compliance Risk: ${risks.compliance_risk || 0}%</li>
                <li>Operational Risk: ${risks.operational_risk || 0}%</li>
                <li>Business Risk: ${risks.business_risk || 0}%</li>
            </ul>
            
            <h2>Verified Evidence</h2>
            <table>
                <tr><th>Entity</th><th>Category</th><th>Extracted Claim</th><th>Credibility</th></tr>
                ${evidenceRows}
            </table>
            
            <h2>Detected Conflicts</h2>
            <table>
                <tr><th>Type</th><th>Severity</th><th>Description</th></tr>
                ${conflictRows}
            </table>
        </body>
        </html>
        `;

        const filename = `verichain_report_${decisionId}.html`;
        res.setHeader('Content-disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-type', 'text/html');
        return res.send(htmlContent);
    } catch (err: any) {
        console.error('Error generating HTML report:', err.message);
        return res.status(500).json({ detail: 'Failed to export HTML report' });
    }
});

export default router;
