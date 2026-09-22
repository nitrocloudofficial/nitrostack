import { parentPort, workerData } from 'node:worker_threads';

/**
 * Off-thread regular expression match. The host terminates this worker if the
 * match does not finish, so a catastrophic pattern cannot block the server.
 */
const data = workerData as { pattern?: string; fields?: unknown[] };

try {
  const pattern = String(data?.pattern ?? '');
  const fields = Array.isArray(data?.fields) ? data.fields : [];
  const regex = new RegExp(pattern, 'i');
  parentPort?.postMessage({
    ok: true,
    hits: fields.map((field) => regex.test(String(field))),
  });
} catch {
  parentPort?.postMessage({ ok: false });
}
