// Intercept stdout to divert all non-JSON logs (NITRO_LOG::, ASCII boxes) to stderr for MCP STDIO protocol compatibility
const origStdoutWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = (chunk: any, ...args: any[]): boolean => {
  const str = typeof chunk === 'string' ? chunk : chunk?.toString?.() || '';
  const trimmed = str.trim();
  if (trimmed.length > 0 && !trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return process.stderr.write(chunk, ...args as [any, any]);
  }
  return origStdoutWrite(chunk, ...args as [any, any]);
};
