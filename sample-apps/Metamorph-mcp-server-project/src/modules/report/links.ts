// Builds signed download links for generate_report from the environment. Pure of the network.
import { hasValidSecret, signDownloadToken } from '../../common/download-token.js';
import { REPORT_ROUTE } from './download.js';
import type { LinkProvider } from './report.js';

// METAMORPH_PUBLIC_URL: the address a user's browser reaches this server at, e.g. https://metamorph.example.com
// Only http(s) origins (plus an optional path prefix) are accepted; anything else is ignored.
export function publicBase(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return undefined;
    if (u.username || u.password || u.search || u.hash) return undefined;
    return `${u.origin}${u.pathname.replace(/\/+$/, '')}`;
  } catch {
    return undefined;
  }
}

export interface LinkEnv {
  secret?: string;
  publicUrl?: string;
  routesActive: boolean;
  keyId: string; // short non-secret id of the requesting key ('anon' when auth is off); goes into the signed claim
  now?: number; // epoch seconds, for tests
}

const NO_HTTP = 'Download links need the HTTP transport (run with MCP_TRANSPORT_TYPE=http or dual, as in production).';
const NO_SECRET = 'Download links are disabled until METAMORPH_TOKEN_SECRET (32+ characters) is set on the server.';
const NO_PUBLIC = 'Set METAMORPH_PUBLIC_URL (for example https://metamorph.example.com) on the server to get clickable absolute links; prefix these paths with the server address meanwhile.';

export function linkProvider(env: LinkEnv): LinkProvider {
  if (!env.routesActive) return { link: () => undefined, hint: NO_HTTP };
  if (!hasValidSecret(env.secret)) return { link: () => undefined, hint: NO_SECRET };
  const secret = env.secret;
  const base = publicBase(env.publicUrl);
  return {
    hint: base ? '' : NO_PUBLIC,
    link(id, ext) {
      const path = `${REPORT_ROUTE}/${id}.${ext}?t=${signDownloadToken({ id, ext, kid: env.keyId }, secret, env.now)}`;
      return { path, url: base ? `${base}${path}` : undefined };
    }
  };
}
