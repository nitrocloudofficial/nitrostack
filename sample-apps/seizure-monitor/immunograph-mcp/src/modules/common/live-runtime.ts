import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { ToolExecutionError } from './executor.js';

const execFileAsync = promisify(execFile);
const windowsBatchPattern = /\.(?:cmd|bat)$/i;

export interface CommandResult {
  stdout: string;
  stderr: string;
}

export interface LiveToolRuntime {
  fetchText(url: string): Promise<string>;
  fetchJson(url: string): Promise<unknown>;
  runCommand(command: string, args: string[]): Promise<CommandResult>;
}

export const defaultLiveToolRuntime: LiveToolRuntime = {
  async fetchText(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new ToolExecutionError(
        'LIVE_HTTP_REQUEST_FAILED',
        'CONNECTOR',
        `Live HTTP request failed with status ${response.status}.`,
        response.status >= 500 || response.status === 429,
        { url, status: response.status },
      );
    }
    return response.text();
  },
  async fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new ToolExecutionError(
        'LIVE_HTTP_REQUEST_FAILED',
        'CONNECTOR',
        `Live HTTP request failed with status ${response.status}.`,
        response.status >= 500 || response.status === 429,
        { url, status: response.status },
      );
    }
    return response.json() as Promise<unknown>;
  },
  async runCommand(command, args) {
    const isWindowsBatch = process.platform === 'win32' && windowsBatchPattern.test(command);
    const executable = isWindowsBatch ? 'cmd.exe' : command;
    const executableArgs = isWindowsBatch
      ? ['/d', '/s', '/c', command.replaceAll('/', '\\'), ...args]
      : args;
    try {
      const { stdout, stderr } = await execFileAsync(executable, executableArgs, {
        encoding: 'utf8',
        windowsHide: true,
        timeout: Number(process.env.DOCKING_COMMAND_TIMEOUT_MS ?? 120_000),
        maxBuffer: Number(process.env.DOCKING_COMMAND_MAX_BUFFER_BYTES ?? 10 * 1024 * 1024),
      });
      return { stdout, stderr };
    } catch (error) {
      const code =
        error instanceof Error && 'code' in error && error.code === 'ENOENT'
          ? 'LIVE_COMMAND_NOT_FOUND'
          : 'LIVE_COMMAND_FAILED';
      throw new ToolExecutionError(
        code,
        'CONNECTOR',
        `Live command failed: ${command}`,
        code === 'LIVE_COMMAND_NOT_FOUND',
        { command, args },
      );
    }
  },
};
