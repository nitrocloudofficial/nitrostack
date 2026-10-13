/**
 * Optional HTTP client for a remote CAD API (see api/server.py).
 *
 * NitroCloud hosts this MCP server in a Node-only container with no Python,
 * so the local-subprocess path in fill.tools.ts / cap.tools.ts / repair.tools.ts
 * can't run there. Setting CAD_API_URL (pointing at api/server.py running
 * wherever Python + CadQuery + PyMeshLab actually live) switches those tools
 * to call out over HTTP instead.
 *
 * Leave CAD_API_URL unset for local NitroStudio development — the tools fall
 * back to spawning `python3` directly, unchanged from before.
 */

const CAD_API_URL = process.env.CAD_API_URL;
const CAD_API_KEY = process.env.CAD_API_KEY;

export function isRemoteCadApiConfigured(): boolean {
  return !!CAD_API_URL;
}

export async function callCadApi<T = unknown>(path: string, body: unknown): Promise<T> {
  if (!CAD_API_URL) {
    throw new Error('CAD_API_URL is not configured.');
  }

  const res = await fetch(`${CAD_API_URL.replace(/\/$/, '')}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(CAD_API_KEY ? { 'X-API-Key': CAD_API_KEY } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`CAD API ${path} failed: ${res.status} ${text.slice(0, 500)}`);
  }

  return (await res.json()) as T;
}
