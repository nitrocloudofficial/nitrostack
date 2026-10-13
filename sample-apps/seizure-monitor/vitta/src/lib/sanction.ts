/**
 * sanction.ts — build a signed sanction letter (HTML) + SHA256 integrity hash.
 * HTML→PDF is a Phase-7/stretch upgrade; the HTML letter + hash satisfies the
 * demo's "downloadable letter with hash footer" without a heavy PDF dependency
 * (keeps THIRD_PARTY.md minimal — CLAUDE.md rule 7).
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CaseRecord, Offer, SanctionResult } from './types.js';

const NBFC = {
  name: 'Vitta Financial Services Pvt. Ltd. (NBFC)',
  rbi_reg: 'N-14.99999 (mock)',
  cin: 'U65999KL2026PTC000000 (mock)',
};

export function createSanction(caseRec: CaseRecord, offer: Offer): SanctionResult {
  const firstEmi = new Date(Date.now() + 30 * 86400_000);
  const first_emi_date = firstEmi.toISOString().slice(0, 10);
  const amort = amortization(offer.amount, offer.roi_annual_pct, offer.emi, 3);

  const letter_fields: Record<string, unknown> = {
    nbfc: NBFC,
    lead_id: caseRec.lead_id,
    borrower_name: caseRec.name ?? 'Applicant',
    sanction_amount: offer.amount,
    roi_annual_pct: offer.roi_annual_pct,
    apr_pct: offer.apr_pct,
    emi: offer.emi,
    tenure_months: offer.tenure_months,
    processing_fee_pct: offer.processing_fee_pct,
    total_cost: offer.total_cost,
    first_emi_date,
    valid_till: offer.valid_till,
    cooling_off_days: 3,
    amortization_preview: amort,
  };

  const html = renderHtml(letter_fields, amort);
  const hash = createHash('sha256').update(canonical(letter_fields)).digest('hex');
  const htmlWithFooter = html.replace('{{HASH}}', hash);

  // The server mounts GET /letters/:leadId (src/index.ts), served from the
  // in-memory store (letter_fields.html), so the URL is a real clickable link
  // even on read-only cloud filesystems. Disk write is a best-effort bonus.
  const base =
    process.env.PUBLIC_BASE_URL ??
    (process.env.NODE_ENV === 'production'
      ? 'https://vitta-6a5a5835-the-beetles-amrita-university-amritapuri-campus.app.nitrocloud.ai'
      : `http://localhost:${process.env.PORT ?? 3000}`);
  const url = `${base}/letters/${caseRec.lead_id}`;
  try {
    const dir = join(process.cwd(), 'data', 'letters');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${caseRec.lead_id}.html`), htmlWithFooter, 'utf8');
  } catch {
    /* read-only FS on cloud — the route serves from the store instead */
  }

  return { url, hash, valid_till: offer.valid_till, letter_fields: { ...letter_fields, html: htmlWithFooter } };
}

function amortization(principal: number, annualRatePct: number, emi: number, rows: number) {
  const r = annualRatePct / 12 / 100;
  let bal = principal;
  const out: { month: number; opening: number; interest: number; principal: number; closing: number }[] = [];
  for (let m = 1; m <= rows; m++) {
    const interest = Math.round(bal * r);
    const princ = Math.round(emi - interest);
    const closing = Math.max(0, Math.round(bal - princ));
    out.push({ month: m, opening: Math.round(bal), interest, principal: princ, closing });
    bal = closing;
  }
  return out;
}

function canonical(fields: Record<string, unknown>): string {
  // stable string over the load-bearing money fields (excludes volatile html)
  const f = fields as any;
  return [
    f.lead_id,
    f.sanction_amount,
    f.roi_annual_pct,
    f.apr_pct,
    f.emi,
    f.tenure_months,
    f.total_cost,
    f.first_emi_date,
    f.valid_till,
  ].join('|');
}

function renderHtml(f: Record<string, unknown>, amort: ReturnType<typeof amortization>): string {
  const inr = (n: unknown) => `₹${Number(n).toLocaleString('en-IN')}`;
  const rows = amort
    .map(
      (a) =>
        `<tr><td>${a.month}</td><td>${inr(a.opening)}</td><td>${inr(a.interest)}</td><td>${inr(a.principal)}</td><td>${inr(a.closing)}</td></tr>`,
    )
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Sanction Letter — ${f.lead_id}</title>
<style>body{font-family:Georgia,serif;max-width:720px;margin:32px auto;color:#1a1a1a}
h1{font-size:20px}.big{font-size:28px;font-weight:700}.muted{color:#666;font-size:12px}
table{border-collapse:collapse;width:100%;margin:12px 0}td,th{border:1px solid #ddd;padding:6px 8px;font-size:13px;text-align:right}
th{background:#f6f6f6}.hash{word-break:break-all;font-family:monospace;font-size:11px;color:#888}</style></head>
<body>
<h1>${(NBFC.name)}</h1>
<p class="muted">RBI Reg: ${NBFC.rbi_reg} · CIN: ${NBFC.cin}</p>
<hr/>
<p>Dear <b>${f.borrower_name}</b>, we are pleased to sanction your personal loan.</p>
<p class="big">${inr(f.sanction_amount)}</p>
<p>ROI ${f.roi_annual_pct}% p.a. · APR ${f.apr_pct}% · EMI <b>${inr(f.emi)}</b> × ${f.tenure_months} months ·
Processing fee ${f.processing_fee_pct}% · Total cost ${inr(f.total_cost)}</p>
<p>First EMI date: <b>${f.first_emi_date}</b> · Offer valid till: ${String(f.valid_till).slice(0, 10)}</p>
<h3>Amortization (first 3 months)</h3>
<table><tr><th>Month</th><th>Opening</th><th>Interest</th><th>Principal</th><th>Closing</th></tr>${rows}</table>
<p class="muted">Cooling-off: you may cancel within <b>${f.cooling_off_days} days</b> of disbursal without penalty (interest for the used period applies).</p>
<p class="muted">Digitally signed by ${NBFC.name} via mock e-sign (eMudhra placeholder). This is a hackathon demo document; not a real financial instrument.</p>
<p class="hash">SHA256: {{HASH}}</p>
</body></html>`;
}
