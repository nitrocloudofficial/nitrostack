import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

let cachedCmd: string | null = null;

/**
 * Resolve which Python command actually works on this machine.
 *
 * We can't hardcode 'python3': on Windows it's frequently missing even when
 * Python is installed, because the official python.org installer registers
 * `python` (and the `py` launcher), not `python3`. When no real `python3`/
 * `python` is on PATH, Windows' built-in "App execution alias" stub takes
 * over and prints "Python was not found; run without arguments to install
 * from the Microsoft Store..." instead of a normal command-not-found error
 * -- which is what you're likely seeing.
 *
 * This tries a short list of platform-appropriate candidates (or a single
 * override from PYTHON_EXECUTABLE, if set) and caches the first one that
 * actually runs, so each tool call doesn't re-probe.
 */
export async function getPythonCommand(): Promise<string> {
  if (cachedCmd) return cachedCmd;

  const override = process.env.PYTHON_EXECUTABLE;
  const candidates = override
    ? [override]
    : process.platform === 'win32'
      ? ['py', 'python', 'python3']
      : ['python3', 'python'];

  for (const candidate of candidates) {
    try {
      await run(candidate, ['--version']);
      cachedCmd = candidate;
      return candidate;
    } catch {
      // Not this one -- try the next candidate.
    }
  }

  throw new Error(
    `Could not find a working Python interpreter (tried: ${candidates.join(', ')}). ` +
      `Install Python 3 and make sure it's on PATH (on Windows, install from ` +
      `python.org and check "Add python.exe to PATH", or run "winget install ` +
      `Python.Python.3.12"), or set PYTHON_EXECUTABLE in .env to the full path ` +
      `of your python executable.`,
  );
}