import { jsPDF } from 'jspdf';

export interface InvestigationData {
  id: string;
  caseTitle: string;
  targetAccount: string;
  customerName: string;
  amount: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  threatScore: number;
  status: 'AWAITING_HITL' | 'UNDER_REVIEW' | 'FROZEN' | 'PROCESSED' | 'CLEARED' | 'MONITORING';
  timestamp: string;
  telecom: {
    callerId: string;
    origin: string;
    duration: string;
    stirShaken: string;
    anomalies: string[];
  };
  voice: {
    aiConfidence: string;
    model: string;
    microTremor: string;
    formantStatus: string;
    verdict: string;
  };
  bank: {
    destinationAccount: string;
    accountAge: string;
    velocity24h: string;
    kycStatus: string;
    verdict: string;
  };
  timeline: Array<{ step: number; title: string; desc: string; time: string }>;
  decision: {
    recommendation: string;
    officerName: string;
    clearance: string;
    dispatchStatus: string;
  };
}

export function generatePDFReport(data: InvestigationData): boolean {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const primaryColor = [212, 175, 55]; // Gold #D4AF37
    const darkBg = [15, 15, 15];
    const redAccent = [220, 38, 38];

    // Header Background
    doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
    doc.rect(0, 0, 210, 38, 'F');

    // Title
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('AEGIS PROTOCOL', 14, 16);

    doc.setFontSize(10);
    doc.setTextColor(200, 200, 200);
    doc.text('FRAUD INTELLIGENCE & THREAT FUSION DOSSIER', 14, 23);

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`CONFIDENTIAL · MHA I4C CYBER CRIME CLEARANCE · GENERATED: ${new Date().toLocaleString()}`, 14, 30);

    // Threat Score Badge
    doc.setFillColor(redAccent[0], redAccent[1], redAccent[2]);
    doc.roundedRect(155, 8, 41, 22, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('Helvetica', 'bold');
    doc.text(`${data.threatScore} / 100`, 175, 17, { align: 'center' });
    doc.setFontSize(7);
    doc.text(data.severity, 175, 23, { align: 'center' });

    let y = 46;

    // Executive Summary Box
    doc.setFillColor(245, 245, 245);
    doc.rect(14, y, 182, 28, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(14, y, 182, 28, 'S');

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'bold');
    doc.text('INCIDENT OVERVIEW', 18, y + 7);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Case ID: ${data.id}`, 18, y + 13);
    doc.text(`Victim Account: ${data.targetAccount} (${data.customerName})`, 18, y + 19);
    doc.text(`Attempted Transfer: ${data.amount}`, 18, y + 24);

    doc.text(`Status: ${data.status}`, 120, y + 13);
    doc.text(`Timestamp: ${data.timestamp}`, 120, y + 19);
    doc.text(`Officer: ${data.decision.officerName} (${data.decision.clearance})`, 120, y + 24);

    y += 36;

    // Helper for Section Titles
    const addSectionHeader = (title: string) => {
      doc.setFillColor(30, 30, 30);
      doc.rect(14, y, 182, 7, 'F');
      doc.setTextColor(212, 175, 55);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(title.toUpperCase(), 18, y + 5);
      y += 10;
    };

    // Telecom Analysis
    addSectionHeader('1. Telecom Metadata & Origin Analysis');
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(40, 40, 40);
    doc.text(`• Incoming Caller ID: ${data.telecom.callerId}`, 18, y); y += 5;
    doc.text(`• True Origin Node: ${data.telecom.origin}`, 18, y); y += 5;
    doc.text(`• STIR/SHAKEN Verification: ${data.telecom.stirShaken}`, 18, y); y += 5;
    doc.text(`• Call Duration: ${data.telecom.duration}`, 18, y); y += 5;
    doc.text(`• Anomalies Detected: ${data.telecom.anomalies.join(', ')}`, 18, y); y += 9;

    // Voice Biometrics
    addSectionHeader('2. Voice Biometrics & Deepfake Detection');
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(40, 40, 40);
    doc.text(`• AI Synthesis Probability: ${data.voice.aiConfidence}`, 18, y); y += 5;
    doc.text(`• Neural Acoustic Model: ${data.voice.model}`, 18, y); y += 5;
    doc.text(`• Micro-Tremor Check: ${data.voice.microTremor}`, 18, y); y += 5;
    doc.text(`• Formant Spectral Analysis: ${data.voice.formantStatus}`, 18, y); y += 5;
    doc.text(`• Biometric Verdict: ${data.voice.verdict}`, 18, y); y += 9;

    // Bank Mule Analysis
    addSectionHeader('3. Financial Graph & Bank Mule Velocity');
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(40, 40, 40);
    doc.text(`• Destination Account: ${data.bank.destinationAccount}`, 18, y); y += 5;
    doc.text(`• Account Age: ${data.bank.accountAge}`, 18, y); y += 5;
    doc.text(`• 24-Hour Velocity: ${data.bank.velocity24h}`, 18, y); y += 5;
    doc.text(`• KYC Verification Tier: ${data.bank.kycStatus}`, 18, y); y += 5;
    doc.text(`• Financial Verdict: ${data.bank.verdict}`, 18, y); y += 9;

    // Execution Timeline
    addSectionHeader('4. Threat Fusion Pipeline Execution Timeline');
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    data.timeline.forEach((item) => {
      doc.text(`Step ${item.step}: [${item.time}] ${item.title} — ${item.desc}`, 18, y);
      y += 4.5;
    });

    y += 5;

    // Final Decision & Attestation
    doc.setLineWidth(0.5);
    doc.setDrawColor(212, 175, 55);
    doc.line(14, y, 196, y);
    y += 6;

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(180, 40, 40);
    doc.text(`FINAL DECISION: ${data.decision.recommendation}`, 18, y); y += 5;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Dispatch Status: ${data.decision.dispatchStatus}`, 18, y); y += 5;
    doc.text(`Officer Attestation: ${data.decision.officerName} | Clearance: ${data.decision.clearance}`, 18, y);

    // Save PDF
    doc.save(`AEGIS_Dossier_${data.id}.pdf`);
    return true;
  } catch (err) {
    console.error('Failed to generate PDF:', err);
    return false;
  }
}

export function exportJSON(data: any, filename: string): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.json') ? filename : `${filename}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportCSV(rows: Record<string, any>[], filename: string): void {
  if (!rows || !rows.length) return;

  const headers = Object.keys(rows[0]);
  const csvLines: string[] = [];

  // Header line
  csvLines.push(headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','));

  // Data lines
  rows.forEach((row) => {
    const line = headers
      .map((header) => {
        const val = row[header] ?? '';
        const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
        return `"${valStr.replace(/"/g, '""')}"`;
      })
      .join(',');
    csvLines.push(line);
  });

  const csvContent = csvLines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
