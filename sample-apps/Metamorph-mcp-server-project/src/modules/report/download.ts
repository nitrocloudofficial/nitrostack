// GET /reports/<id>.<ext>?t=<token>: serves a generated report from the in-memory cache.
// Auth is the signed, expiring token (a browser click cannot send an API key); its key id must match the cache entry's owner. No directory listing: only this one route.
import { hasValidSecret, verifyDownloadToken } from '../../common/download-token.js';
import { FORMATS, MIME, SUFFIX, reportCache, type ReportCache } from './report.js';

export const REPORT_ROUTE = '/reports';
const FILE_RE = /^([a-f0-9]{24})\.(pdf|sarif|cdx\.json)$/;
const EXPIRED = 'This report has expired or is not on this server instance. Run generate_report again to get new links.';

// The few Express members used here, so the handler is testable without a server.
export interface Req {
  params: { file?: string };
  query: Record<string, unknown>;
}
export interface Res {
  status(code: number): Res;
  setHeader(name: string, value: string | number): unknown;
  send(body: Buffer | string): unknown;
}
export interface DownloadDeps {
  cache?: ReportCache;
  secret?: string;
  now?: () => number; // epoch seconds
}

function text(res: Res, code: number, message: string): void {
  res.status(code);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.send(message);
}

export function handleReportDownload(req: Req, res: Res, deps: DownloadDeps = {}): void {
  const secret = deps.secret ?? process.env.METAMORPH_TOKEN_SECRET;
  if (!hasValidSecret(secret)) return text(res, 503, 'Report downloads are not configured on this server (METAMORPH_TOKEN_SECRET is missing or shorter than 32 characters).');
  const m = (typeof req.params.file === 'string' ? req.params.file : '').match(FILE_RE);
  if (!m) return text(res, 404, 'Not found.');
  const [, id, ext] = m;
  const format = FORMATS.find((f) => SUFFIX[f] === ext);
  if (!format) return text(res, 404, 'Not found.');
  const v = verifyDownloadToken(req.query.t, { id, ext }, secret, deps.now?.());
  if (!v.ok) {
    return text(res, 403, v.reason === 'expired' ? 'This download link has expired. Run generate_report again to get new links.' : 'Invalid download link.');
  }
  const cache = deps.cache ?? reportCache;
  const owner = cache.ownerOf(id);
  if (owner === undefined) return text(res, 404, EXPIRED);
  // The link was issued for one key; the entry records which key created it. Disagreement is refused with the same
  // message as a bad signature, so a caller learns nothing about whose report it is.
  if (owner !== v.kid) return text(res, 403, 'Invalid download link.');
  const artifact = cache.get(id, format);
  if (!artifact) return text(res, 404, EXPIRED);
  res.status(200);
  res.setHeader('Content-Type', MIME[format]);
  res.setHeader('Content-Disposition', `attachment; filename="metamorph-report-${id.slice(0, 8)}.${ext}"`);
  res.setHeader('Content-Length', artifact.data.length);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.send(artifact.data);
}

// Express-like app (the SDK's HTTP transport exposes it through getApp()).
export interface AppLike {
  get(path: string, handler: (req: never, res: never) => void): unknown;
}

let routesRegistered = false;
export const reportRoutesActive = (): boolean => routesRegistered;

export function registerReportRoutes(app: AppLike): void {
  app.get(`${REPORT_ROUTE}/:file`, ((req: Req, res: Res) => handleReportDownload(req, res)) as (req: never, res: never) => void);
  routesRegistered = true;
}
