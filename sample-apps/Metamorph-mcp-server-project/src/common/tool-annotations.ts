// MCP tool annotations (spec hints for clients; they are hints, not enforcement: the scope guard enforces access).
// Every choice below states why, so the hint can be checked against the code. Field meanings in the spec:
//   readOnlyHint     the tool does not modify its environment
//   destructiveHint  (only meaningful when not read-only) the tool may delete or overwrite; false means additive only
//   idempotentHint   (only meaningful when not read-only) repeating a call with the same arguments adds no further effect
//   openWorldHint    the tool talks to systems outside this server (the network)
import type { ToolAnnotations } from '@nitrostack/core';

// assess_project, plan_modernization, preview_changes, analyze_advisory, check_watch.
// Read-only: each downloads public data (a GitHub archive, OSV, CISA KEV, EPSS, endoflife.date, release feeds), computes in a
// private temp folder that is deleted afterwards, and returns text. Nothing in the user's repository or accounts changes.
// Idempotent: same input gives the same kind of answer (preview_changes mints a fresh time-limited token, which is not a change).
// Open world: all of them call out to public network services.
export const READS_PUBLIC_DATA: ToolAnnotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };

// generate_report. Read-only for the user's repository and accounts: it renders PDF, SARIF and SBOM files.
// It does keep the rendered files in this server's memory cache for 10 minutes (so signed links and metamorph:// resources
// work); that is process-internal state that expires on its own, not a change to the user's environment.
// Not idempotent: every call renders again and stores another cache entry under a new report id.
export const GENERATES_REPORT: ToolAnnotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true };

// apply_stage. Needs write scope because it acts on an approval token, but it changes nothing in the user's repository:
// it patches a throwaway copy on the server, deletes it, and returns the patch text for the user to apply.
// The spec asks whether the tool modifies its environment; here it does not, so it is declared read-only even though its
// scope guard is "write" (scope is about who may approve a change, the hint is about side effects).
// Idempotent: the same stage and token produce the same patch (see approval-token.ts: replay is accepted on purpose).
// Open world: it downloads the repository archive and queries OSV.
export const RETURNS_PATCH_ONLY: ToolAnnotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };

// verify_patch. Not read-only: it dispatches GitHub Actions runs (a patched run and a baseline run) in the operator's runner
// repository, which creates runs and artifacts there. Not destructive: it only adds runs, deletes and overwrites nothing, and
// never touches the user's repository. Not idempotent: each start creates two new runs (resuming with run ids does not).
// Open world: it calls the GitHub API and downloads the result artifact.
export const DISPATCHES_RUNS: ToolAnnotations = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true };

// Read-only look at the user's cloud account through an assumed read-only role (cloud_inventory): reads, never changes anything,
// same answer for the same account state, talks to an outside system.
export const READS_CLOUD_ACCOUNT: ToolAnnotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };
