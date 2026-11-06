import type { Finding } from './types.js';
import { SEVERITY_RANK } from './types.js';

export interface HostingResult {
  hints: string[];
  findings: Finding[];
}

const base = (p: string): string => p.slice(p.lastIndexOf('/') + 1);

const BASENAME_HINTS: Array<[string, (name: string) => boolean]> = [
  ['docker', (n) => n === 'Dockerfile' || n.startsWith('Dockerfile.')],
  ['docker-compose', (n) => n === 'docker-compose.yml' || n === 'docker-compose.yaml'],
  ['serverless-framework', (n) => n === 'serverless.yml' || n === 'serverless.yaml'],
  ['vercel', (n) => n === 'vercel.json'],
  ['cloudflare-workers', (n) => n === 'wrangler.toml'],
  ['netlify', (n) => n === 'netlify.toml'],
  ['heroku-style (Procfile)', (n) => n === 'Procfile'],
  ['google-app-engine', (n) => n === 'app.yaml'],
  ['terraform', (n) => n.endsWith('.tf')],
  ['apache-htaccess', (n) => n === '.htaccess'],
  ['nginx', (n) => n === 'nginx.conf']
];

const PACKAGING_HINTS = ['docker', 'kubernetes', 'serverless-framework', 'vercel', 'cloudflare-workers', 'netlify', 'heroku-style (Procfile)'];
const ENV_TEMPLATE = /\.(example|sample|template|dist)$/i;

function isEnvFile(name: string): boolean {
  return /^\.env(\..+)?$/.test(name) && !ENV_TEMPLATE.test(name);
}

function isKubernetesManifest(path: string, text: string): boolean {
  if (!/\.ya?ml$/.test(path)) return false;
  return /^apiVersion:/m.test(text) && /^kind:\s*(Deployment|Service|Ingress)\b/m.test(text);
}

function parseFromImages(dockerfile: string): string[] {
  const stages = new Set<string>();
  const images: string[] = [];
  for (const line of dockerfile.split(/\r?\n/)) {
    const m = line.match(/^\s*FROM\s+(?:--\S+\s+)*(\S+)(?:\s+AS\s+(\S+))?/i);
    if (!m) continue;
    const image = m[1];
    const lower = image.toLowerCase();
    if (!stages.has(lower) && lower !== 'scratch' && !image.includes('$')) images.push(image);
    if (m[2]) stages.add(m[2].toLowerCase());
  }
  return images;
}

function dockerFindings(path: string, text: string, isEol?: (major: number) => boolean): Finding[] {
  const out: Finding[] = [];
  for (const image of parseFromImages(text)) {
    const node = image.match(/^(?:docker\.io\/library\/)?node:(\d+)/);
    if (node && isEol && isEol(Number(node[1]))) {
      out.push({
        id: 'docker-base-image-eol',
        category: 'runtime',
        severity: 'high',
        title: 'Docker base image uses an end-of-life Node.js version',
        evidence: `${path} (${image})`,
        recommendation: 'Switch the FROM line to a supported Node.js LTS image.'
      });
    }
    if (image.includes('@')) continue; // pinned by digest
    const colon = image.indexOf(':', image.lastIndexOf('/') + 1);
    const tag = colon === -1 ? '' : image.slice(colon + 1);
    if (tag === '' || tag === 'latest') {
      out.push({
        id: 'docker-latest-tag',
        category: 'cloud',
        severity: 'low',
        title: 'Docker base image is not pinned to a version',
        evidence: `${path} (${image})`,
        recommendation: 'Pin the base image to a specific version tag or digest.'
      });
    }
  }
  if (!/^\s*USER\s+\S/im.test(text)) {
    out.push({
      id: 'docker-runs-as-root',
      category: 'security',
      severity: 'low',
      title: 'Dockerfile never switches away from the root user',
      evidence: path,
      recommendation: 'Add a USER instruction so the container runs as an unprivileged user.'
    });
  }
  return out;
}

export function detectHosting(
  paths: string[],
  contents: Record<string, string>,
  opts?: { isNodeMajorEol?: (major: number) => boolean }
): HostingResult {
  const found = new Set<string>();
  for (const p of paths) {
    const name = base(p);
    for (const [hint, test] of BASENAME_HINTS) if (test(name)) found.add(hint);
    if (/(^|\/)\.github\/workflows\/[^/]+\.ya?ml$/.test(p)) found.add('github-actions');
  }
  for (const [p, text] of Object.entries(contents)) if (isKubernetesManifest(p, text)) found.add('kubernetes');
  const hints = [...found].sort();

  const findings: Finding[] = [];
  for (const p of [...new Set(paths)].sort()) {
    if (!isEnvFile(base(p))) continue;
    findings.push({
      id: 'env-file-committed',
      category: 'security',
      severity: 'high',
      title: 'Environment file is part of the project files',
      evidence: p,
      recommendation: 'Remove it from version control, rotate any secrets it held and keep a .env.example instead.'
    });
  }
  if (!PACKAGING_HINTS.some((h) => found.has(h))) {
    findings.push({
      id: 'no-container-packaging',
      category: 'cloud',
      severity: 'low',
      title: 'No container or platform deployment config found',
      recommendation: 'Add a Dockerfile or a platform config so deployments are repeatable.'
    });
  }
  const otherCi = paths.some((p) => {
    const name = base(p);
    return name === '.gitlab-ci.yml' || name === 'Jenkinsfile' || p.startsWith('.circleci/') || p.includes('/.circleci/');
  });
  if (!found.has('github-actions') && !otherCi) {
    findings.push({
      id: 'no-ci',
      category: 'standards',
      severity: 'low',
      title: 'No continuous integration config found',
      recommendation: 'Add a CI workflow that runs the tests on every push.'
    });
  }
  for (const [p, text] of Object.entries(contents)) {
    if (base(p) === 'Dockerfile') findings.push(...dockerFindings(p, text, opts?.isNodeMajorEol));
  }

  findings.sort(
    (a, b) =>
      SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] ||
      a.id.localeCompare(b.id) ||
      (a.evidence ?? '').localeCompare(b.evidence ?? '')
  );
  return { hints, findings };
}
