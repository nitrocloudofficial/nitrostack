import { describe, it, expect, afterAll } from 'vitest';
import { inflateSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderPdf } from '../../src/modules/report/pdf.js';
import { FIXTURES, dataOf, manyFindings, phpShopReportData } from '../helpers/report-fixtures.js';

// PDF/UA-1 check with veraPDF (https://verapdf.org). Needs docker and the image `verapdf/cli`:
//   docker pull verapdf/cli
// Without them the suite is skipped (and says why) so the normal test run stays offline and fast.
const IMAGE = 'verapdf/cli';
const have = spawnSync('docker', ['image', 'inspect', IMAGE], { encoding: 'utf8' });
const OPTED_OUT = process.env.METAMORPH_SKIP_DOCKER === '1'; // for a fast local run: METAMORPH_SKIP_DOCKER=1 npm test
const AVAILABLE = !OPTED_OUT && have.error === undefined && have.status === 0;
const REASON = OPTED_OUT ? 'METAMORPH_SKIP_DOCKER=1' : have.error !== undefined ? 'docker is not installed' : `docker image ${IMAGE} is not available (run: docker pull ${IMAGE}) or the docker daemon is not running`;
if (!AVAILABLE) console.warn(`[report-pdfua] SKIPPED: ${REASON}`);

const dirs: string[] = [];
afterAll(async () => {
  await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

interface Verdict {
  compliant: boolean;
  failedRules: number;
  failedChecks: number;
  failures: string[];
}

function veraPdf(dir: string, file: string): Verdict {
  const r = spawnSync('docker', ['run', '--rm', '-v', `${dir}:/data:ro`, IMAGE, '-f', 'ua1', '--format', 'xml', `/data/${file}`], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  expect(r.error).toBeUndefined();
  const xml = r.stdout;
  const details = xml.match(/<details passedRules="(\d+)" failedRules="(\d+)" passedChecks="(\d+)" failedChecks="(\d+)"/);
  expect(details, `no veraPDF report in output: ${r.stdout.slice(0, 300)} ${r.stderr.slice(0, 300)}`).not.toBeNull();
  const failures = [...xml.matchAll(/<rule specification="([^"]+)" clause="([^"]+)" testNumber="(\d+)" status="failed"[^>]*>\s*<description>([^<]*)/g)].map((m) => `${m[2]} test ${m[3]}: ${m[4]}`);
  return { compliant: /isCompliant="true"/.test(xml), failedRules: Number(details?.[2]), failedChecks: Number(details?.[4]), failures };
}

describe.skipIf(!AVAILABLE)('PDF/UA-1 validation with veraPDF (needs docker + verapdf/cli)', () => {
  const cases: Array<[string, () => Promise<Parameters<typeof renderPdf>[0]>]> = [
    ['php-shop sample', async () => {
      const dir = await mkdtemp(join(tmpdir(), 'metamorph-phpshop-'));
      dirs.push(dir);
      return phpShopReportData(dir);
    }],
    ...Object.entries(FIXTURES).map(([name, make]): [string, () => Promise<Parameters<typeof renderPdf>[0]>] => [name, async () => make()])
  ];

  for (const [name, make] of cases) {
    it(`${name}: zero failed rules`, async () => {
      const { buffer } = await renderPdf(await make());
      const dir = await mkdtemp(join(tmpdir(), 'metamorph-pdfua-'));
      dirs.push(dir);
      await chmod(dir, 0o755); // mkdtemp is 0700; the container user must be able to read it
      await writeFile(join(dir, 'report.pdf'), buffer);
      const v = veraPdf(dir, 'report.pdf');
      expect(v.failures).toEqual([]);
      expect(v.failedRules).toBe(0);
      expect(v.failedChecks).toBe(0);
      expect(v.compliant).toBe(true);
    }, 180_000);
  }
});

// ---- structure checks that need no docker: the tags must describe the real content ----

// Content streams of a pdfkit file (Flate, one stream per page), decoded.
function contentStreams(pdf: Buffer): string[] {
  const text = pdf.toString('latin1');
  const out: string[] = [];
  for (const m of text.matchAll(/stream\r?\n/g)) {
    const start = (m.index ?? 0) + m[0].length;
    const end = text.indexOf('endstream', start);
    try {
      const body = inflateSync(pdf.subarray(start, end)).toString('latin1');
      if (/\bBT\b|\bBDC\b/.test(body) && /\bBDC\b/.test(body)) out.push(body);
    } catch {
      // not a Flate stream (font program, metadata): skip
    }
  }
  return out;
}

describe('PDF/UA structure (no docker needed)', () => {
  it('tags headings, paragraphs and table cells as real content; only borders and the running header/footer are artifacts', async () => {
    const { buffer, pages } = await renderPdf(dataOf(manyFindings(200)));
    const text = buffer.toString('latin1');
    expect(text).toContain('/Marked true');
    expect(text).toMatch(/\/Lang \(\\?[^)]*en-US\)|\/Lang <[0-9a-fA-F]+>/);
    for (const t of ['Document', 'H1', 'H2', 'P', 'Table', 'TR', 'TH', 'TD']) expect(text, `struct type ${t}`).toMatch(new RegExp(`/S /${t}\\b`));
    expect(text).toContain('/Scope /Column');
    expect(text).toContain('<pdfuaid:part>1</pdfuaid:part>');

    const streams = contentStreams(buffer);
    expect(streams.length).toBe(pages);
    let tagged = 0;
    let paginationBlocks = 0;
    for (const s of streams) {
      // pdfkit never nests marked content, so a flat scan is exact
      let open: 'mcid' | 'pagination' | 'layout' | undefined;
      for (const m of s.matchAll(/\/(\w+)\s*<<([^>]*)>>\s*BDC|\bEMC\b|\)?\]?\s*TJ\b|\bTj\b/g)) {
        if (m[1]) {
          if (m[1] === 'Artifact') {
            open = /Layout/.test(m[2]) ? 'layout' : 'pagination';
            if (open === 'pagination') paginationBlocks++;
          } else {
            expect(m[2]).toMatch(/\/MCID \d+/);
            open = 'mcid';
            tagged++;
          }
        } else if (m[0] === 'EMC') open = undefined;
        else expect(open === 'mcid' || open === 'pagination', 'text drawn outside tagged content or a pagination artifact').toBe(true);
      }
    }
    expect(tagged).toBeGreaterThan(500);
    // Pagination artifacts: header (2 columns) and footer (2 columns) on every page, plus repeated table header cells
    expect(paginationBlocks).toBeGreaterThanOrEqual(pages * 4);
  }, 60_000);
});
