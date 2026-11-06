// PDF report builder following docs/PLAN_V2.md section 8. pdfmake does the layout; this file only declares content.
// Rules enforced here: A4 with 40pt margins, one base size (10pt body, 8pt tables), bundled Roboto only (no network,
// no local file access beyond the font folder), repeating table headers, rows that never split, fixed or star column
// widths, headings kept with the next block, soft break points + 200 char cap on long strings, top-N findings in the
// body and the rest in an appendix, hard caps on pages and bytes, untrusted text rendered as plain text, and a fixed
// creation date so identical input gives identical bytes.
import { createRequire } from 'node:module';
import * as path from 'node:path';
import type { Origin, ReportData, ReportFinding, ReportMeasuredFinding } from './report-data.js';
import { NOT_RECORDED, cleanText } from './report-data.js';
import { TagNode, TagTree, installPdfTagging } from './pdf-tags.js';

export const MAX_PAGES = 30;
export const MAX_PDF_BYTES = 3 * 1024 * 1024;
export const MAX_FIELD_CHARS = 200;
export const TOP_FINDINGS = 25;
export const PAGE_MARGIN = 40;
export const NO_RUNNER_SENTENCE = 'Not verified: no runner result attached';

// ---- minimal pdfmake surface (the package ships no type definitions) ----
type Node = Record<string, unknown>;
type DocDefinition = Record<string, unknown>;
interface PdfOutput {
  getBuffer(): Promise<Buffer>;
}
interface PdfMake {
  setFonts(f: Record<string, Record<string, string>>): void;
  setTableLayouts(l: Record<string, unknown>): void;
  setUrlAccessPolicy(cb: (url: string) => boolean): void;
  setLocalAccessPolicy(cb: (p: string) => boolean): void;
  createPdf(doc: DocDefinition, options?: Record<string, unknown>): PdfOutput;
}

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'];

const TABLE_LAYOUT = {
  metamorph: {
    hLineWidth: (i: number, node: { table: { body: unknown[] } }) => (i === 0 || i === 1 || i === node.table.body.length ? 0.8 : 0.4),
    vLineWidth: () => 0,
    hLineColor: () => COLORS.rule,
    fillColor: (row: number) => (row === 0 ? COLORS.head : null),
    paddingLeft: () => 3,
    paddingRight: () => 3,
    paddingTop: () => 2,
    paddingBottom: () => 2
  },
  // severity strip on the cover: one tinted column per severity (the words and numbers carry the meaning)
  strip: {
    hLineWidth: () => 0.6,
    vLineWidth: () => 0.6,
    hLineColor: () => COLORS.muted,
    vLineColor: () => COLORS.muted,
    fillColor: (_row: number, node: { table: { body: Array<unknown[]> } }, col: number) => SEVERITY_TINT[SEVERITY_ORDER[col]] ?? null,
    paddingLeft: () => 6,
    paddingRight: () => 6,
    paddingTop: () => 3,
    paddingBottom: () => 3
  }
};

const require_ = createRequire(import.meta.url);
let engine: PdfMake | undefined;

function getEngine(): PdfMake {
  if (engine) return engine;
  const pm = require_('pdfmake') as PdfMake;
  // Bundled fonts: Roboto ships inside the pdfmake package. Nothing is fetched at render time.
  const dir = path.join(path.dirname(require_.resolve('pdfmake/package.json')), 'build', 'fonts', 'Roboto');
  pm.setFonts({
    Roboto: {
      normal: path.join(dir, 'Roboto-Regular.ttf'),
      bold: path.join(dir, 'Roboto-Medium.ttf'),
      italics: path.join(dir, 'Roboto-Italic.ttf'),
      bolditalics: path.join(dir, 'Roboto-MediumItalic.ttf')
    }
  });
  pm.setTableLayouts(TABLE_LAYOUT);
  installPdfTagging();
  pm.setUrlAccessPolicy(() => false); // no network, ever
  pm.setLocalAccessPolicy((p) => path.resolve(p).startsWith(dir + path.sep)); // only the bundled font folder
  engine = pm;
  return pm;
}

// ---- text safety ----

const ZWSP = '\u200B';

// Roboto covers Latin, Greek and Cyrillic plus common punctuation. Anything else (CJK, Arabic, emoji) has no glyph in
// the bundled font, so it is shown as "?" instead of an empty box. The SARIF and SBOM exports keep the original text.
function renderable(cp: number): boolean {
  return (
    (cp >= 0x20 && cp <= 0x7e) ||
    (cp >= 0xa0 && cp <= 0x24f) ||
    (cp >= 0x370 && cp <= 0x52f) ||
    (cp >= 0x1e00 && cp <= 0x1eff) ||
    (cp >= 0x2010 && cp <= 0x2027) ||
    (cp >= 0x2030 && cp <= 0x205e) ||
    cp === 0x20ac ||
    cp === 0x2122 ||
    cp === 0x2212
  );
}

const BREAK_AFTER = new Set(['/', '-', '_', '.', ':', '@', '=', ',', ';', '+', '&', '?', '#', '\\']);

// Plain text only: strips control chars, caps at `max` code points (with an ellipsis), maps glyphs the font lacks to
// "?", and inserts zero-width break points after / - _ . and (for runs with none) every `chunk` characters.
export function safeText(input: unknown, max = MAX_FIELD_CHARS, chunk = 14): string {
  // eslint-disable-next-line no-control-regex
  const stripped = String(input ?? '').replace(/[\u0000-\u001F\u007F-\u009F\u2028\u2029\u202A-\u202E\u2066-\u2069\u200B-\u200F\uFEFF]/g, ' ');
  let cps = Array.from(stripped.replace(/ {2,}/g, ' ').trim());
  if (cps.length > max) cps = [...cps.slice(0, max - 1), '…'];
  let out = '';
  let run = 0;
  for (let i = 0; i < cps.length; i++) {
    const ch = cps[i];
    const safe = renderable(ch.codePointAt(0) ?? 0) ? ch : '?';
    if (safe === ' ') {
      out += safe;
      run = 0;
      continue;
    }
    if (run >= chunk) {
      out += ZWSP;
      run = 0;
    }
    out += safe;
    run++;
    const next = cps[i + 1];
    if (BREAK_AFTER.has(safe) && next !== undefined && next !== ' ') {
      out += ZWSP;
      run = 0;
    }
  }
  return out;
}

// ---- small builders ----

const COLORS = { text: '#1a1a1a', muted: '#555555', rule: '#b8b8b8', head: '#e8ecf1', accent: '#0b3d91' };

const ORIGIN_NOTE: Record<Origin, string> = {
  measured: 'measured by a tool run',
  projected: 'projected from a preview, not run',
  reported: 'reported by an outside feed'
};

function label(v: { value: number; origin: Origin }, suffix = ''): string {
  return `${v.value}${suffix} (${v.origin})`;
}

// Structure (PDF/UA): the builders below run synchronously inside buildDocDefinition, which owns `tags`. The text of
// every node is wrapped as [{ text, _tag }] where _tag is the structure element it belongs to: pdfmake copies the
// properties of a text run (not of a bare string) onto the lines it lays out. table() and tagTable() tag the cells.
let tags = new TagTree();
const run = (text: string, tag: TagNode): Node[] => [{ text, _tag: tag }];
const h1 = (text: string, pageBreak = false): Node => ({ text: run(text, tags.document.child('H1')), style: 'h1', headlineLevel: 1, ...(pageBreak ? { pageBreak: 'before' } : {}) });
const h2 = (text: string): Node => ({ text: run(text, tags.document.child('H2')), style: 'h2', headlineLevel: 2 });
const para = (text: string, extra: Node = {}): Node => ({ text: run(safeText(text, 600, 40), tags.document.child('P')), style: 'body', ...extra });
const th = (text: string): Node => ({ text, style: 'th' });
const td = (text: unknown, extra: Node = {}, chunk = 14): Node => ({ text: safeText(text, MAX_FIELD_CHARS, chunk), style: 'td', ...extra });

interface TableOpts {
  widths: Array<number | string>;
  header: string[];
  rows: Node[][];
}

// Adds Table > TR > TH/TD > P to the structure tree for a pdfmake table node. A cell built with th() is a header cell
// (scope Column in a repeated header row, Row anywhere else); every text node inside a cell becomes a P.
function tagTable(node: Node): Node {
  const t = node.table as { headerRows?: number; body: Node[][] };
  const tableTag = tags.document.child('Table');
  t.body.forEach((row, r) => {
    const rowTag = tableTag.child('TR');
    for (const cell of row) {
      const header = cell.style === 'th';
      const cellTag = rowTag.child(header ? 'TH' : 'TD', header ? (r < (t.headerRows ?? 0) ? 'Column' : 'Row') : undefined);
      tagCell(cell, cellTag);
    }
  });
  return node;
}

function tagCell(n: Node, cell: TagNode): void {
  if (Array.isArray(n.stack)) for (const s of n.stack as Node[]) tagCell(s, cell);
  else if (typeof n.text === 'string') n.text = run(n.text, cell.child('P'));
}

function table(o: TableOpts): Node {
  return tagTable({
    style: 'tableBlock',
    table: {
      headerRows: 1,
      dontBreakRows: true,
      keepWithHeaderRows: 1,
      widths: o.widths,
      body: [o.header.map(th), ...o.rows]
    },
    layout: 'metamorph'
  });
}

function note(text: string): Node {
  return { text: run(safeText(text, 600, 40), tags.document.child('P')), style: 'note' };
}

// ---- sections ----

export interface Caps {
  topN: number;
  appendixRows: number;
  dependencyRows: number;
  patchFileRows: number;
  measuredTop?: number; // runner findings shown in the body (default MEASURED_TOP); the rest go to Appendix E
}

export const MEASURED_TOP = 15;

export const DEFAULT_CAPS: Caps = { topN: TOP_FINDINGS, appendixRows: 300, dependencyRows: 250, patchFileRows: 40 };

function findingRow(f: ReportFinding): Node[] {
  return [
    td(f.severity, { bold: true }),
    td(f.id),
    {
      stack: [
        { text: safeText(f.title), style: 'td' },
        { text: safeText(`Fix: ${f.recommendation}`), style: 'tdMuted' },
        { text: safeText(`Ranked: ${f.rankReason}`), style: 'tdMuted' }
      ]
    },
    td(f.cwe.join(', ') || '-'),
    td(f.owasp.join(', ') || '-'),
    td(f.cvss ? String(f.cvss.value) : '-'),
    td(f.epss ? f.epss.value.toFixed(3) : '-'),
    td(f.kev ? 'YES' : '-', f.kev ? { bold: true } : {})
  ];
}

const SEVERITY_TINT: Record<string, string> = { critical: '#f6d5d8', high: '#fbe0c9', medium: '#fff1bf', low: '#dcecd6', info: '#e1e6ec' };
const SEVERITY_LABEL: Record<string, string> = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low', info: 'Info' };
const CONTENT_WIDTH = 595.28 - 2 * PAGE_MARGIN;
export const COVER_NOTE = 'A score of 100 means nothing our checks detect; projected numbers are estimates; only runner results are measured.';

// One line stating the verification status. "Verified" appears only when the runner-evaluated verdict is true; otherwise
// the reasons are listed. Used on the cover and in the executive summary.
export function verificationLine(d: ReportData): { verified: boolean; text: string } {
  const v = d.verification;
  if (!v) return { verified: false, text: NO_RUNNER_SENTENCE };
  if (v.verified) {
    const t = v.tests;
    return { verified: true, text: `Verified by the runner (measured): the build succeeded${t ? ` and ${t.passed} of ${t.ran} tests passed` : ''}.` };
  }
  return { verified: false, text: `Not verified: ${v.unverifiedReasons.join('; ')}.` };
}

// A text paragraph with its own style, tagged as P.
const styled = (text: string, style: string, extra: Node = {}): Node => ({ text: run(text, tags.document.child('P')), style, ...extra });

// Cover page: everything a reader needs first. Text is real content (H1/H2/P/Table); the score bar and rules are
// decorative shapes (artifacts) and every colour is backed by a word or a number.
function cover(d: ReportData): Node[] {
  const top = d.findings.slice(0, 3);
  const pct = Math.max(0, Math.min(100, d.score.value));
  const out: Node[] = [
    { text: run('Modernization assessment report', tags.document.child('H1')), style: 'title', margin: [0, 28, 0, 6] },
    styled(safeText(d.meta.repoUrl, MAX_FIELD_CHARS, 40), 'subtitle'),
    { canvas: [{ type: 'rect', x: 0, y: 0, w: CONTENT_WIDTH, h: 3, color: COLORS.accent }], margin: [0, 10, 0, 22] },

    tagTable({
      style: 'tableBlock',
      margin: [0, 0, 0, 10],
      table: {
        widths: [100, '*'],
        body: [
          [th('Repository'), td(d.meta.repoUrl, {}, 40)],
          [th('Folder'), td(d.meta.subfolder ?? '(repository root)', {}, 40)],
          [th('Commit / ref'), td(d.meta.commit ?? 'not recorded (default branch at scan time)', {}, 48)],
          [th('Generated'), td(d.meta.generatedAt)],
          [th('Detected stack'), td(d.stack)],
          [th('Declared runtime'), td(d.runtime)],
          [th('Verification'), td(verificationLine(d).text, { bold: true }, 48)]
        ]
      },
      layout: 'metamorph'
    }),

    styled('Overall score', 'coverLabel', { margin: [0, 26, 0, 0] }),
    { text: run(`${d.score.value} / 100`, tags.document.child('P')), style: 'score', margin: [0, 0, 0, 4] },
    // bar: decorative track and fill; the number above carries the meaning
    {
      canvas: [
        { type: 'rect', x: 0, y: 0, w: CONTENT_WIDTH, h: 12, color: '#dde2e8' },
        { type: 'rect', x: 0, y: 0, w: (CONTENT_WIDTH * pct) / 100, h: 12, color: COLORS.accent },
        { type: 'rect', x: 0, y: 0, w: CONTENT_WIDTH, h: 12, lineWidth: 0.8, lineColor: COLORS.muted }
      ],
      margin: [0, 0, 0, 4]
    },
    styled(`Origin: ${d.score.origin} (${ORIGIN_NOTE[d.score.origin]}). Higher is healthier.`, 'body', { margin: [0, 0, 0, 22] }),

    styled('Findings by severity', 'coverLabel', { margin: [0, 0, 0, 4] }),
    tagTable({
      style: 'tableBlock',
      margin: [0, 0, 0, 22],
      table: {
        headerRows: 1,
        widths: d.counts.map(() => '*'),
        body: [d.counts.map((c) => th(SEVERITY_LABEL[c.severity])), d.counts.map((c) => td(c.count.value, { bold: true, fontSize: 18 }))]
      },
      layout: 'strip'
    }),

    h2('Top findings'),
    ...(top.length === 0
      ? [para('No findings.')]
      : [
          table({
            widths: [16, 46, '*'],
            header: ['#', 'Severity', 'Finding and why it ranks here'],
            rows: top.map((f, i) => [
              td(i + 1),
              td(f.severity, { bold: true }),
              { stack: [{ text: safeText(f.title, 110, 40), style: 'td' }, { text: safeText(f.rankReason, 80, 40), style: 'tdMuted' }] }
            ])
          })
        ]),

    { ...h2('What this report is, and is not'), margin: [0, 22, 0, 4] },
    para(COVER_NOTE, { bold: true, fontSize: 11 }),
    para('It is a static assessment of the repository files plus public advisory feeds. It does not run your code, and a patch is only a preview until your own tests pass.', { fontSize: 11, margin: [0, 0, 0, 0] })
  ];
  return out;
}

function executiveSummary(d: ReportData): Node[] {
  const total = d.counts.reduce((n, c) => n + c.count.value, 0);
  const kev = d.findings.filter((f) => f.kev).length;
  const sev = (s: string) => d.counts.find((c) => c.severity === s)?.count.value ?? 0;
  const out: Node[] = [h1('Executive summary', true)];
  out.push(
    para(
      total === 0
        ? `No findings were produced for this repository. The overall score is ${label(d.score)}. A clean result only covers the checks Metamorph runs; it is not a guarantee.`
        : `Metamorph found ${total} distinct findings (${sev('critical')} critical, ${sev('high')} high, ${sev('medium')} medium, ${sev('low')} low, ${sev('info')} informational). The overall score is ${label(d.score)} out of 100.`
    )
  );
  const vl = verificationLine(d);
  out.push(para(vl.text, { bold: true }));
  if (kev > 0) out.push(para(`${kev} finding(s) concern vulnerabilities listed in the CISA Known Exploited Vulnerabilities catalog (reported by the CISA feed). Treat these first.`, { bold: true }));
  if (d.truncatedScan) out.push(para('The repository was larger than the scan limit, so some files were not inspected. Counts may be lower than reality.'));
  if (d.dependencyStats.approximate) out.push(para('Some dependency versions were derived from ranges because no lockfile was present, so vulnerability results are indicative.'));
  out.push(h2('Findings by severity'));
  out.push(
    table({
      widths: [90, 60, '*'],
      header: ['Severity', 'Count', 'Origin'],
      rows: d.counts.map((c) => [td(c.severity), td(c.count.value), td(`${c.count.origin}: ${ORIGIN_NOTE[c.count.origin]}`)])
    })
  );
  out.push(h2('Score by category'));
  out.push(
    table({
      widths: [120, 60, '*'],
      header: ['Category', 'Score', 'Origin'],
      rows: d.scoreByCategory.map((c) => [td(c.category), td(c.score.value), td(c.score.origin)])
    })
  );
  return out;
}

function findingsSection(d: ReportData, caps: Caps): Node[] {
  const out: Node[] = [h1('Findings by CWE and OWASP', true)];
  const top = d.findings.slice(0, caps.topN);
  if (d.findings.length === 0) {
    out.push(para('No findings.'));
    return out;
  }
  // Group counts per OWASP category (measured counts of findings that carry a mapping).
  const byOwasp = new Map<string, number>();
  for (const f of d.findings) for (const o of f.owasp) byOwasp.set(o, (byOwasp.get(o) ?? 0) + 1);
  if (byOwasp.size > 0) {
    out.push(h2('Findings per OWASP Top 10 (2021) category'));
    out.push(
      table({
        widths: [100, 60, '*'],
        header: ['OWASP', 'Findings', 'Origin'],
        rows: [...byOwasp.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([k, n]) => [td(k), td(n), td('measured (count); mapping reported by CWE tables')])
      })
    );
  }
  out.push(h2(`Top ${top.length} findings, KEV first, then severity and EPSS`));
  out.push(
    table({
      widths: [44, 80, '*', 50, 46, 40, 40, 40],
      header: ['Severity', 'Rule id', 'Finding and fix', 'CWE', 'OWASP', 'CVSS\nreported', 'EPSS\nreported', 'KEV\nreported'],
      rows: top.map(findingRow)
    })
  );
  if (d.findings.length > top.length) out.push(note(`${d.findings.length - top.length} more findings are listed in Appendix A.`));
  return out;
}

function planSection(d: ReportData): Node[] {
  const out: Node[] = [h1('Modernization plan', true)];
  if (!d.plan) {
    out.push(para('No plan was attached to this report.'));
    return out;
  }
  const pl = d.plan;
  out.push(para(`Goal: ${pl.goal}. Score before: ${label(pl.scoreBefore)}. Score after all stages: ${label(pl.scoreAfter)}. Projected scores are estimates from the plan, not results of running the changes.`));
  out.push(
    table({
      widths: [20, 100, '*', 56, 40, 38, 70],
      header: ['#', 'Stage', 'Title', 'Kind', 'Mode', 'Risk', 'Score after (projected)'],
      rows: pl.stages.map((s) => [td(s.index), td(s.id), td(s.title), td(s.kind), td(s.automated ? 'automated' : 'guided'), td(s.risk), td(`${s.scoreAfter.value} (projected)`)])
    })
  );
  if (pl.stages.length === 0) out.push(para('The plan has no stages: nothing to modernize automatically.'));
  return out;
}

function patchSection(d: ReportData, caps: Caps): Node[] {
  const out: Node[] = [h1('Patch summary')];
  if (d.patches.length === 0) {
    out.push(para('No patch was generated for this report. Use apply_stage to produce one.'));
    return out;
  }
  out.push(para('Every figure below is projected: the patch was applied to a throwaway copy and re-assessed, and the project itself was not modified or executed.'));
  out.push(
    table({
      widths: [110, '*', 40, 60, 60, 50],
      header: ['Stage', 'Title', 'Risk', 'Score before (projected)', 'Score after (projected)', 'Findings fixed (projected)'],
      rows: d.patches.map((r) => [td(r.stageId), td(r.title), td(r.risk), td(label(r.scoreBefore)), td(`${label(r.scoreAfter)}, delta ${r.scoreDelta.value}`), td(`${r.findingsFixed} fixed, ${r.remaining} remaining`)])
    })
  );
  const files = d.patches.flatMap((r) => r.files.map((f) => ({ stage: r.stageId, ...f })));
  if (files.length > 0) {
    out.push(h2('Files changed'));
    out.push(
      table({
        widths: [110, 50, '*'],
        header: ['Stage', 'Action', 'Path'],
        rows: files.slice(0, caps.patchFileRows).map((f) => [td(f.stage), td(f.action), td(f.path)])
      })
    );
    if (files.length > caps.patchFileRows) out.push(note(`${files.length - caps.patchFileRows} more changed files are omitted from this table.`));
  }
  return out;
}

function verificationSection(d: ReportData): Node[] {
  const out: Node[] = [h1('Verification results')];
  const v = d.verification;
  if (!v) {
    out.push(para(NO_RUNNER_SENTENCE + '.', { bold: true }));
    out.push(para('Scores in this report come from static analysis of the repository, or are projected. Nothing was built, installed or tested.'));
    return out;
  }
  const vl = verificationLine(d);
  out.push(para(vl.text, { bold: true }));
  if (!v.verified) {
    out.push(h2('Why it is not verified'));
    for (const r of v.unverifiedReasons) out.push(para(`- ${r}`));
  }
  out.push(para(`Runner: ${v.runner}. Started: ${v.startedAt ?? NOT_RECORDED}. Finished: ${v.finishedAt ?? NOT_RECORDED}. All values below were measured by the runner.`));
  const yn = (b: boolean | undefined): string => (b === undefined ? 'not reported' : b ? 'yes' : 'no');
  const rows: Node[][] = [[td('Patch applied'), td(yn(v.patchApplied))], [td('Build succeeded'), td(yn(v.buildOk))]];
  if (v.tests) rows.push([td('Tests'), td(`${v.tests.ran} ran, ${v.tests.passed} passed, ${v.tests.failed} failed${v.tests.ran === 0 ? ' (no tests found)' : ''}`)]);
  if (v.php) {
    const x = v.php;
    rows.push([td('PHP version selected'), td(`${x.version ?? x.selected ?? 'none'}${x.supported ? '' : ' (not supported by the runner image)'}`)]);
    rows.push([td('PHP constraint'), td(`${x.constraint ?? 'none declared'} (from ${x.constraintSource})`)]);
    rows.push([td('PHP selection reason'), td(x.reason)]);
    if (x.lockRegenerated !== undefined) rows.push([td('composer.lock regenerated'), td(x.lockRegenerated ? 'yes: dependencies were resolved afresh in a scratch copy, the committed lockfile was not tested' : 'no')]);
  }
  out.push(h2('Result'));
  out.push(table({ widths: [130, '*'], header: ['Item', 'Value'], rows }));
  if (v.scoreBefore && v.scoreAfter) out.push(para(`Score before: ${label(v.scoreBefore)}. Score after: ${label(v.scoreAfter)}. Both measured by the runner.`));
  const mm = d.measured;
  if (mm?.baseline && mm.patched) {
    out.push(h2('Measured score before and after (runner tools)'));
    const tools = [...new Set([...mm.baseline.perTool, ...mm.patched.perTool].map((t) => t.tool))].sort();
    const n = (r: typeof mm.baseline, tool: string): number => r.perTool.find((t) => t.tool === tool)?.reported ?? 0;
    out.push(
      table({
        widths: [150, 90, 90, '*'],
        header: ['Item', 'Baseline (before)', 'Patched (after)', 'Origin'],
        rows: [
          [td('Measured score'), td(String(mm.baseline.score.value)), td(String(mm.patched.score.value)), td(mm.origin)],
          [td('Distinct findings'), td(String(mm.baseline.distinct)), td(String(mm.patched.distinct)), td(mm.origin)],
          ...tools.map((t) => [td(`Findings reported by ${t}`), td(String(n(mm.baseline!, t))), td(String(n(mm.patched!, t))), td(mm.origin)])
        ]
      })
    );
    out.push(para(`Static assessment score of this report: ${mm.staticScore.value} out of 100. ${mm.note}`));
    if (!v.verified) out.push(para('A measured score does not mean the patch is verified: the reasons above still apply.'));
  }
  out.push(h2('Checks'));
  out.push(
    table({
      widths: [150, 50, '*', 60],
      header: ['Check', 'Status', 'Detail', 'Duration (measured)'],
      rows: v.checks.map((c) => [td(c.name), td(c.status, { bold: c.status === 'failed' }), td(c.detail ?? '-'), td(typeof c.durationMs === 'number' ? `${c.durationMs} ms` : '-')])
    })
  );
  return out;
}

function measuredRow(f: ReportMeasuredFinding): Node[] {
  return [
    td(f.severity, { bold: true }),
    {
      stack: [
        { text: safeText(f.title), style: 'td' },
        { text: safeText(`Fix: ${f.recommendation}`), style: 'tdMuted' },
        { text: safeText(`Ranked: ${f.rankReason}`), style: 'tdMuted' },
        ...(f.severityNote ? [{ text: safeText(`Severity: ${f.severityNote}`), style: 'tdMuted' }] : [])
      ]
    },
    td(f.sources.join(', ') || '-'),
    td(f.cwe.join(', ') || '-'),
    td(f.owasp.join(', ') || '-'),
    td(f.epss ? f.epss.value.toFixed(3) : '-'),
    td(f.kev ? 'YES' : '-', f.kev ? { bold: true } : {})
  ];
}

// WS8: findings from the runner tools, deduplicated across tools, with their own measured score. Absent when no runner result is attached.
function measuredSection(d: ReportData, caps: Caps): Node[] {
  const m = d.measured;
  if (!m) return [];
  const out: Node[] = [h1('Findings measured by the runner', true)];
  const dd = m.dedupe;
  out.push(
    para(
      `Measured score (${m.origin}): ${m.score.value} out of 100 on the ${m.basis} run. Static assessment score of this report: ${m.staticScore.value} out of 100. ${m.note}`,
      { bold: true }
    )
  );
  out.push(
    para(
      `${dd.before} findings were reported by the tools; ${dd.after} are distinct after removing findings several tools reported about the same advisory or code location (${dd.collapsed} merged, none dropped). ${m.notListed > 0 ? `${m.notListed} more findings were counted by the runner but not listed, and are not in this score.` : 'Every finding the runner counted is listed.'}`
    )
  );
  out.push(h2('Findings per tool'));
  out.push(
    table({
      widths: [100, 60, 50, 60, '*'],
      header: ['Tool', 'Version', 'Status', 'Reported', 'Reported only by this tool'],
      rows: m.perTool.map((t) => [td(t.tool), td(t.version ?? '-'), td(t.status ?? '-'), td(t.reported), td(t.uniqueOnly)])
    })
  );
  const top = m.findings.slice(0, caps.measuredTop ?? MEASURED_TOP);
  if (top.length === 0) {
    out.push(para('No findings were reported by the runner tools.'));
    return out;
  }
  out.push(h2(`Top ${top.length} distinct findings, KEV first, then severity and EPSS`));
  out.push(
    table({
      widths: [40, '*', 70, 38, 38, 32, 32],
      header: ['Severity', 'Finding and fix', 'Reported by', 'CWE', 'OWASP', 'EPSS\nreported', 'KEV\nreported'],
      rows: top.map(measuredRow)
    })
  );
  const en = m.enrichment;
  if (en && en.cves > 0) {
    out.push(note(en.unavailable.length > 0 ? `KEV and EPSS were looked up for ${en.cves} CVE ids. ${en.unavailable.join(' and ')} could not be reached, so the order below uses the data that was available (severity first when KEV or EPSS is missing). Fetch times are in Appendix C.` : `KEV and EPSS were looked up for ${en.cves} CVE ids; fetch times are in Appendix C. Findings without a CVE id carry neither.`));
  } else if (!en) {
    out.push(note('KEV and EPSS were not looked up for these findings, so the order below is by severity.'));
  }
  out.push(note('CWE and OWASP appear only where the tool listed a CWE or OWASP category, or where a listed CWE is in the OWASP Top 10 (2021) table. Nothing is guessed.'));
  if (m.findings.length > top.length) out.push(note(`${m.findings.length - top.length} more distinct findings are listed in Appendix E.`));
  return out;
}

// Optional AWS section (include_cloud). Separate from the repository findings and score; nothing here is added to either.
function cloudSection(d: ReportData): Node[] {
  const c = d.cloud;
  if (!c) return [];
  const out: Node[] = [h1('Cloud inventory (AWS, read-only)', true)];
  out.push(para(c.summary));
  if (c.status !== 'scanned') return out;
  out.push(para(c.note));
  out.push(note('This section is kept apart from the repository: its findings are not in the repository score, the findings list or the runner results. Counts are measured through the read-only role; end-of-life dates are reported by the source named in each finding.'));
  if (c.counts.length > 0) {
    out.push(h2('Resources per service'));
    out.push(table({ widths: ['*', 120], header: ['Service', 'Resources (measured)'], rows: c.counts.map((x) => [td(x.service), td(label(x.count))]) }));
  }
  if (c.findings.length === 0) {
    out.push(para('No end-of-life findings in the services that could be read.'));
  } else {
    out.push(h2(`Findings (${c.findings.length}${c.moreFindings > 0 ? ` of ${c.findingsTotal}` : ''}), ranked by severity`));
    out.push(
      table({
        widths: [44, '*', 96, 62],
        header: ['Severity', 'Finding and fix', 'Resource', 'Region'],
        rows: c.findings.map((f) => [
          td(f.severity, { bold: true }),
          {
            stack: [
              { text: safeText(f.title), style: 'td' },
              { text: safeText(`Fix: ${f.recommendation}`), style: 'tdMuted' },
              { text: safeText(`Ranked: ${f.rankReason}`), style: 'tdMuted' },
              ...(f.evidence ? [{ text: safeText(`Evidence: ${f.evidence}`), style: 'tdMuted' }] : []),
              { text: safeText(`Source: ${f.source ?? 'aws-readonly'}`), style: 'tdMuted' }
            ]
          },
          td(`${f.service} ${f.resource}`),
          td(f.region)
        ])
      })
    );
    if (c.moreFindings > 0) out.push(note(`${c.moreFindings} more findings were found and are not listed (the scan lists at most ${c.findings.length}).`));
  }
  if (c.limits.length > 0) {
    out.push(h2('Limits of this scan'));
    out.push(table({ widths: ['*'], header: ['Limit'], rows: c.limits.map((l) => [td(l)]) }));
  }
  if (c.notChecked.length > 0) {
    out.push(h2('Not checked'));
    out.push(
      table({
        widths: [60, 70, 100, '*'],
        header: ['Service', 'Region', 'AWS error code', 'Note'],
        rows: c.notChecked.map((n) => [td(n.service), td(n.region ?? '-'), td(n.code), td(n.note ?? '-')])
      })
    );
  }
  return out;
}

function measuredAppendix(d: ReportData, caps: Caps): Node[] {
  const m = d.measured;
  if (!m) return [];
  const rest = m.findings.slice(caps.measuredTop ?? MEASURED_TOP);
  const out: Node[] = [h1('Appendix E: runner findings', true)];
  if (rest.length === 0) {
    out.push(para('All runner findings are already listed in the body.'));
    return out;
  }
  out.push(
    table({
      widths: [44, 120, '*', 90],
      header: ['Severity', 'Rule id', 'Title', 'Reported by'],
      rows: rest.slice(0, caps.appendixRows).map((f) => [td(f.severity), td(f.id), td(f.title), td(f.sources.join(', ') || '-')])
    })
  );
  if (rest.length > caps.appendixRows) out.push(note(`${rest.length - caps.appendixRows} further runner findings are omitted to respect the page cap; the SARIF export lists every one.`));
  if (m.omitted > 0) out.push(note(`${m.omitted} distinct runner findings beyond the ${m.findings.length} kept in the report data are not listed anywhere in this report.`));
  return out;
}

function dependencySection(d: ReportData, caps: Caps): Node[] {
  const s = d.dependencyStats;
  const out: Node[] = [h1('Dependencies and SBOM summary', true)];
  out.push(
    para(
      `${label(s.total)} direct dependencies, ${label(s.checked)} checked against OSV, ${label(s.vulnerable)} with known advisories, ${label(s.urgent)} urgent. The full machine-readable list is the CycloneDX SBOM export.`
    )
  );
  if (d.fixes.length > 0) {
    out.push(h2('Available fixes (reported by OSV)'));
    out.push(
      table({
        widths: ['*', 60, 70, 70, 36],
        header: ['Package', 'Ecosystem', 'From', 'To', 'Urgent'],
        rows: d.fixes.slice(0, 60).map((f) => [td(f.name), td(f.ecosystem), td(f.from), td(f.to), td(f.urgent ? 'YES' : '-', f.urgent ? { bold: true } : {})])
      })
    );
  }
  out.push(h2('Direct dependencies (measured from manifests and lockfiles)'));
  if (d.dependencies.length === 0) out.push(para('No dependencies were found.'));
  else {
    out.push(
      table({
        widths: ['*', 60, 100, 40, 54],
        header: ['Package', 'Ecosystem', 'Version', 'Dev', 'Version source'],
        rows: d.dependencies.slice(0, caps.dependencyRows).map((x) => [td(x.name), td(x.ecosystem), td(x.version), td(x.dev ? 'dev' : 'prod'), td(x.approximate ? 'range' : 'exact')])
      })
    );
    if (d.dependencies.length > caps.dependencyRows) out.push(note(`${d.dependencies.length - caps.dependencyRows} more dependencies are in the SBOM export.`));
  }
  return out;
}

function appendix(d: ReportData, caps: Caps): Node[] {
  const out: Node[] = [h1('Appendix A: all findings', true)];
  const rest = d.findings.slice(caps.topN);
  if (rest.length === 0) out.push(para(d.findings.length === 0 ? 'No findings.' : 'All findings are already listed in the body.'));
  else {
    out.push(
      table({
        widths: [44, 100, '*', 150],
        header: ['Severity', 'Rule id', 'Title', 'Evidence'],
        rows: rest.slice(0, caps.appendixRows).map((f) => [td(f.severity), td(f.id), td(f.title), td(f.evidence ?? '-')])
      })
    );
    if (rest.length > caps.appendixRows) out.push(note(`${rest.length - caps.appendixRows} further findings are omitted to respect the page cap; the SARIF export lists every finding.`));
  }
  out.push(note(`Strings longer than ${MAX_FIELD_CHARS} characters are cut with an ellipsis in this PDF. The SARIF export holds the full text. Characters outside Latin, Greek and Cyrillic appear as "?" because the bundled font has no glyphs for them.`));
  out.push(h1('Appendix B: tool versions'));
  out.push(
    table({
      widths: ['*', 150],
      header: ['Tool', 'Version'],
      rows: d.tools.map((t) => [td(t.name), td(t.version)])
    })
  );
  out.push(h1('Appendix C: sources and fetch times'));
  if (d.sources.length === 0) out.push(para('No outside sources were consulted for this report.'));
  else {
    out.push(
      table({
        widths: [140, '*', 110],
        header: ['Source', 'URL', 'Fetched at'],
        rows: d.sources.map((s) => [td(s.name), td(s.url ?? '-'), td(s.fetchedAt)])
      })
    );
  }
  out.push(...knownLimits(d));
  return out;
}

// Appendix D: what this report cannot tell you. Short and specific; every line is checkable against the code.
function knownLimits(d: ReportData): Node[] {
  const out: Node[] = [h1('Appendix D: known limits')];
  const items = [
    'Text outside Latin, Greek and Cyrillic (CJK, Arabic, Hebrew, emoji) is shown as "?" in this PDF because the bundled font has no glyphs for it. The SARIF and CycloneDX files keep the original text.',
    'Download links are valid for 10 minutes and the files live in the memory of the one server instance that made them. After that, or after a restart or on another instance, run generate_report again. A link works for anyone who holds it until it expires; it is tied to the API key that requested the report, but it does not identify the person who clicks it.',
    '"Measured" means a tool run by Metamorph produced the number: the static assessment of the repository files, or a runner result. "Projected" means a preview of what the score would be after a plan stage or patch; nothing was built or tested for it. "Reported" means taken from an outside feed (OSV, CISA KEV, EPSS, endoflife.date) as it was at the fetch time in Appendix C.',
    'The score runs from 0 to 100, higher is healthier. It counts only what Metamorph checks, with weights by severity. A score of 100 means nothing the checks detect, not that the code is secure. It is not a risk rating and cannot be compared between tools.',
    'Findings that rest on a version guessed from a range (no lockfile) count at half weight in the score and are marked as approximate.'
  ];
  for (const t of items) out.push(para(`- ${t}`));
  const assessedNote = d.truncatedScan
    ? 'The repository exceeded the scan limit, so part of it was not read.'
    : 'No part of the repository was skipped by the scan limit.';
  const unchecked = d.dependencyStats.total.value - d.dependencyStats.checked.value;
  out.push(
    para(
      `This report covers ${d.meta.subfolder ? `the folder ${d.meta.subfolder}` : 'the repository root project'} only (a report describes one project; other projects in the repository are not assessed here). ${assessedNote} ${unchecked > 0 ? `${unchecked} of ${d.dependencyStats.total.value} direct dependencies were not checked against OSV (time or size budget).` : 'All direct dependencies were checked against OSV.'} Only direct dependencies are listed in the SBOM and checked against OSV; transitive dependencies are not.`
    )
  );
  return out;
}

// ---- document ----

export function buildDocDefinition(d: ReportData, caps: Caps = DEFAULT_CAPS, maxPages: number = MAX_PAGES): DocDefinition {
  tags = new TagTree();
  const repoShort = safeText(d.meta.repoUrl, 60, 30);
  return {
    pageSize: 'A4',
    pageMargins: [PAGE_MARGIN, PAGE_MARGIN, PAGE_MARGIN, PAGE_MARGIN],
    language: 'en-US',
    version: '1.7', // pdfkit writes the XMP metadata stream (required by PDF/UA) only above PDF 1.3
    subset: 'PDF/UA',
    tagged: true,
    displayTitle: true,
    compress: true,
    maxPagesNumber: maxPages,
    info: {
      title: `Metamorph assessment report: ${cleanText(d.meta.repoUrl, 150)}`,
      author: 'Metamorph',
      subject: 'Legacy project modernization assessment',
      keywords: 'assessment, modernization, security, SBOM',
      creator: 'Metamorph',
      creationDate: new Date(d.meta.generatedAt)
    },
    defaultStyle: { font: 'Roboto', fontSize: 10, color: COLORS.text, lineHeight: 1.15 },
    styles: {
      title: { fontSize: 26, bold: true, color: COLORS.accent },
      subtitle: { fontSize: 12, color: COLORS.muted },
      score: { fontSize: 34, bold: true, color: COLORS.accent },
      coverLabel: { fontSize: 9, bold: true, color: COLORS.muted },
      h1: { fontSize: 16, bold: true, color: COLORS.accent, margin: [0, 0, 0, 8] },
      h2: { fontSize: 12, bold: true, margin: [0, 10, 0, 4] },
      body: { fontSize: 10, margin: [0, 0, 0, 6] },
      note: { fontSize: 8, italics: true, color: COLORS.muted, margin: [0, 4, 0, 6] },
      th: { fontSize: 8, bold: true },
      td: { fontSize: 8 },
      tdMuted: { fontSize: 8, color: COLORS.muted },
      tableBlock: { margin: [0, 2, 0, 8] }
    },
    header: () => ({
      margin: [PAGE_MARGIN, 18, PAGE_MARGIN, 0],
      columns: [
        { text: 'Metamorph assessment report', fontSize: 8, bold: true, color: COLORS.muted, width: 170 },
        { text: repoShort, fontSize: 8, color: COLORS.muted, alignment: 'right', width: '*' }
      ]
    }),
    footer: (currentPage: number, pageCount: number) => ({
      margin: [PAGE_MARGIN, 8, PAGE_MARGIN, 0],
      columns: [
        { text: `Generated ${d.meta.generatedAt.slice(0, 10)}`, fontSize: 8, color: COLORS.muted, width: '*' },
        { text: `Page ${currentPage} of ${pageCount}`, fontSize: 8, color: COLORS.muted, alignment: 'right', width: 100 }
      ]
    }),
    pageBreakBefore: (current: { headlineLevel?: number }, following: unknown[]) => current.headlineLevel !== undefined && following.length === 0,
    content: [
      ...cover(d),
      ...executiveSummary(d),
      ...findingsSection(d, caps),
      ...planSection(d),
      ...patchSection(d, caps),
      ...verificationSection(d),
      ...measuredSection(d, caps),
      ...cloudSection(d),
      ...dependencySection(d, caps),
      ...appendix(d, caps),
      ...measuredAppendix(d, caps)
    ]
  };
}

// ---- render ----

export interface RenderedPdf {
  buffer: Buffer;
  pages: number;
  bytes: number;
  caps: Caps;
  reducedCaps: boolean;
}

export class ReportTooLargeError extends Error {}

export function countPages(buf: Buffer): number {
  const text = buf.toString('latin1');
  return (text.match(/\/Type \/Page(?![s\w])/g) ?? []).length;
}

function shrink(c: Caps): Caps {
  return { topN: c.topN, ...(c.measuredTop !== undefined ? { measuredTop: c.measuredTop } : {}), appendixRows: Math.floor(c.appendixRows / 2), dependencyRows: Math.floor(c.dependencyRows / 2), patchFileRows: Math.floor(c.patchFileRows / 2) };
}

// Renders the report. If the layout would run past MAX_PAGES the long tables are halved and it tries again, so the
// result never silently loses its last pages. Throws ReportTooLargeError if even the smallest layout is too big.
export async function renderPdf(d: ReportData, opts: { caps?: Caps; maxPages?: number; maxBytes?: number } = {}): Promise<RenderedPdf> {
  const maxPages = opts.maxPages ?? MAX_PAGES;
  const maxBytes = opts.maxBytes ?? MAX_PDF_BYTES;
  let caps = opts.caps ?? DEFAULT_CAPS;
  const initial = caps;
  const pm = getEngine();
  for (let attempt = 0; attempt < 6; attempt++) {
    // maxPages + 1 so an overflow is visible instead of being cut off by pdfmake.
    const buffer = await pm.createPdf(buildDocDefinition(d, caps, maxPages + 1)).getBuffer();
    const pages = countPages(buffer);
    if (pages <= maxPages) {
      if (buffer.length > maxBytes) throw new ReportTooLargeError(`The PDF is ${buffer.length} bytes, above the ${maxBytes} byte cap.`);
      return { buffer, pages, bytes: buffer.length, caps, reducedCaps: caps !== initial };
    }
    caps = shrink(caps);
  }
  throw new ReportTooLargeError(`The report does not fit in ${maxPages} pages even with the smallest tables.`);
}
