import { parseGithubRepo } from '../../common/safe-archive.js';

// The validated input a result echoes back, so a client (the widget) can name the repository and compose the next call.
// Rebuilt from the parsed URL, never copied: credentials, query strings and fragments are rejected by parseGithubRepo
// and cannot appear. Tokens and approval tokens are never part of it.
export interface InputEcho {
  input?: { repo_url: string; subfolder?: string };
  commit?: string;
  generatedAt: string;
}

const SHA = /^[0-9a-f]{7,40}$/i;

export function echoOf(input: { repo_url?: string; subfolder?: string }, commit?: string, now: Date = new Date()): InputEcho {
  let url: string | undefined;
  try {
    if (input.repo_url) {
      const p = parseGithubRepo(input.repo_url);
      url = `https://github.com/${p.owner}/${p.repo}${p.ref ? `/tree/${p.ref}` : ''}`;
    }
  } catch {
    url = undefined;
  }
  const sub = typeof input.subfolder === 'string' && input.subfolder.length > 0 && input.subfolder.length <= 200 ? input.subfolder : undefined;
  return {
    ...(url ? { input: { repo_url: url, ...(sub ? { subfolder: sub } : {}) } } : {}),
    ...(commit && SHA.test(commit) ? { commit } : {}),
    generatedAt: now.toISOString()
  };
}
