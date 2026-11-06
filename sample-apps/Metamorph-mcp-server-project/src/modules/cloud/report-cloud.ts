// generate_report include_cloud: runs the SAME read-only inventory cloud_inventory uses (runAwsInventory, with its caps and
// scan time budget) and maps it onto the report's cloud section. Called only when the user asked for it; the report never
// reaches AWS otherwise. The whole step is capped at 45 s so the report still finishes; any failure becomes a short sentence
// in the section and report generation continues. Nothing here names an environment variable or shows its value.
import { rankReason } from '../assessment/rank.js';
import type { ReportCloud, ReportCloudFinding } from '../report/report-data.js';
import { CloudError, errorCode, loadAwsConfig } from './aws-config.js';
import { runAwsInventory, type InventoryDeps, type InventoryResult } from './inventory.js';
import { cloudReportSection } from './report-section.js';

export const CLOUD_STEP_MS = 45_000;
export const CLOUD_SCAN_BUDGET_MS = 40_000; // the inventory's own scan budget (default 60 s) is shortened so it ends before the step cap
export const CLOUD_NOT_CONFIGURED_TEXT = 'A cloud scan was requested, but this server is not set up for it. Nothing from AWS is in this report. See docs/AWS_SETUP.md.';
export const CLOUD_HEADING = 'Cloud inventory (AWS, read-only)';
export const CLOUD_METHOD_NOTE = 'Read-only scan through an assumed role; see docs/AWS_SETUP.md.';

export interface CloudStepDeps extends InventoryDeps {
  /** Test hook: replaces the inventory call. */
  inventory?: () => Promise<InventoryResult>;
  stepMs?: number;
}

// "lambda eu-west-1 my-fn runtime=nodejs12.x" -> service, region, resource. Evidence is written by cloud/findings.ts.
const EVIDENCE_RE = /^([a-z0-9]+) ([a-z]{2}(?:-[a-z]+)+-\d{1,2}) (\S+)/;

function toFinding(f: InventoryResult['findings'][number]): ReportCloudFinding {
  const m = (f.evidence ?? '').match(EVIDENCE_RE);
  const idTail = f.id.includes(':') ? f.id.slice(f.id.indexOf(':') + 1) : f.id;
  return {
    id: f.id,
    category: f.category,
    severity: f.severity,
    title: f.title,
    ...(f.evidence ? { evidence: f.evidence } : {}),
    recommendation: f.recommendation,
    cwe: [],
    owasp: [],
    kev: false,
    rankReason: f.rankReason ?? rankReason(f),
    source: 'aws-readonly',
    service: m?.[1] ?? 'aws',
    region: m?.[2] ?? 'unknown',
    resource: m?.[3] ?? idTail
  };
}

function failed(text: string, status: ReportCloud['status']): ReportCloud {
  return { status, heading: CLOUD_HEADING, summary: text, regions: [], counts: [], findings: [], findingsTotal: 0, moreFindings: 0, notChecked: [], limits: [], note: CLOUD_METHOD_NOTE };
}

export async function collectCloudSection(deps: CloudStepDeps = {}): Promise<ReportCloud> {
  const env = deps.env ?? process.env;
  try {
    loadAwsConfig(env);
  } catch {
    return failed(CLOUD_NOT_CONFIGURED_TEXT, 'not-configured');
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const stepMs = deps.stepMs ?? CLOUD_STEP_MS;
    const run = deps.inventory ? deps.inventory() : runAwsInventory({}, { ...deps, env, budgetMs: Math.min(deps.budgetMs ?? CLOUD_SCAN_BUDGET_MS, CLOUD_SCAN_BUDGET_MS) });
    const limit = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new CloudError('time budget', 'ReportTimeBudget')), stepMs);
    });
    run.catch(() => undefined); // a scan still running after the cap must not become an unhandled rejection
    const r = await Promise.race([run, limit]);
    const sec = cloudReportSection(r);
    return {
      status: 'scanned',
      heading: CLOUD_HEADING,
      summary: sec.summary,
      regions: r.regions,
      counts: Object.entries(r.counts).map(([service, n]) => ({ service, count: { value: n as number, origin: 'measured' as const } })),
      findings: r.findings.map(toFinding),
      findingsTotal: r.findingsTotal,
      moreFindings: r.moreFindings,
      notChecked: r.notChecked.map((n) => ({ service: n.service, ...(n.region ? { region: n.region } : {}), code: n.code, ...(n.note ? { note: n.note } : {}) })),
      limits: r.limits,
      note: CLOUD_METHOD_NOTE,
      generatedAt: r.generatedAt
    };
  } catch (e) {
    const code = errorCode(e);
    return failed(`The AWS scan did not finish (${code}). Nothing from AWS is in this report. See docs/AWS_SETUP.md.`, 'failed');
  } finally {
    clearTimeout(timer);
  }
}
