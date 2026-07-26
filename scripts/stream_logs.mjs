/**
 * Aegis Protocol — JSON-RPC Streaming Log Viewer
 * 
 * Watches logs/stream.log and renders each JSON-RPC entry with
 * color-coded severity levels in real-time.
 * 
 * Usage:
 *   node scripts/stream_logs.mjs
 *   node scripts/stream_logs.mjs --follow     (tail -f mode, default)
 *   node scripts/stream_logs.mjs --replay     (replay existing log then follow)
 *   node scripts/stream_logs.mjs --replay-only (replay existing log and exit)
 * 
 * Severity Colors:
 *   info     → Cyan
 *   warn     → Yellow
 *   error    → Red
 *   critical → White on Red background
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const LOG_PATH = path.join(ROOT, 'logs', 'stream.log');

// ─── ANSI Colors ────────────────────────────────────────────────────
const C = {
  reset:    '\x1b[0m',
  bold:     '\x1b[1m',
  dim:      '\x1b[2m',
  red:      '\x1b[31m',
  green:    '\x1b[32m',
  yellow:   '\x1b[33m',
  blue:     '\x1b[34m',
  magenta:  '\x1b[35m',
  cyan:     '\x1b[36m',
  white:    '\x1b[37m',
  bgRed:    '\x1b[41m',
  bgGreen:  '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue:   '\x1b[44m',
  bgMagenta:'\x1b[45m',
};

// ─── Severity Styling ───────────────────────────────────────────────
const SEVERITY_STYLES = {
  info:     { icon: 'ℹ', color: C.cyan,   bg: '' },
  warn:     { icon: '⚠', color: C.yellow, bg: '' },
  error:    { icon: '✖', color: C.red,    bg: '' },
  critical: { icon: '🚨', color: C.white,  bg: C.bgRed },
};

// ─── Method Category Colors ─────────────────────────────────────────
function getMethodColor(method) {
  if (method.includes('telecom'))    return C.blue;
  if (method.includes('deepfake'))   return C.magenta;
  if (method.includes('mule'))       return C.yellow;
  if (method.includes('adjudicate')) return C.cyan;
  if (method.includes('guard'))      return C.red;
  if (method.includes('mha'))        return C.green;
  if (method.includes('pipeline'))   return C.green;
  if (method.includes('flag'))       return C.yellow;
  if (method.includes('cleared'))    return C.green;
  return C.white;
}

// ─── Render a single log entry ──────────────────────────────────────
function renderLogEntry(line) {
  try {
    const entry = JSON.parse(line.trim());
    
    if (!entry.jsonrpc || entry.jsonrpc !== '2.0') {
      // Not a JSON-RPC entry, print raw
      console.log(`${C.dim}${line.trim()}${C.reset}`);
      return;
    }

    const level = entry.params?._level || 'info';
    const style = SEVERITY_STYLES[level] || SEVERITY_STYLES.info;
    const methodColor = getMethodColor(entry.method || '');
    const ts = entry.params?._timestamp || new Date().toISOString();

    // Build the formatted line
    const severityTag = style.bg
      ? `${style.bg}${style.color}${C.bold} ${style.icon} ${level.toUpperCase()} ${C.reset}`
      : `${style.color}${style.icon} ${level.toUpperCase().padEnd(8)}${C.reset}`;

    const methodTag = `${methodColor}${C.bold}${entry.method || 'unknown'}${C.reset}`;
    const idTag = `${C.dim}${entry.id || ''}${C.reset}`;
    const timeTag = `${C.dim}${ts.substring(11, 23)}${C.reset}`;

    console.log(`${timeTag} ${severityTag} ${methodTag} ${idTag}`);

    // Print key params (excluding internal fields)
    const params = { ...entry.params };
    delete params._timestamp;
    delete params._level;

    if (Object.keys(params).length > 0) {
      const paramsStr = JSON.stringify(params, null, 2)
        .split('\n')
        .map(l => `  ${C.dim}│${C.reset} ${l}`)
        .join('\n');
      console.log(paramsStr);
    }

    console.log(`  ${C.dim}└${'─'.repeat(60)}${C.reset}`);

  } catch {
    // Not valid JSON, print raw
    if (line.trim()) {
      console.log(`${C.dim}${line.trim()}${C.reset}`);
    }
  }
}

// ─── Main ───────────────────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);
  const replayOnly = args.includes('--replay-only');
  const replay = args.includes('--replay') || replayOnly;
  const follow = !replayOnly;

  console.log('');
  console.log(`${C.bold}${C.cyan}╔══════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║   🛡️  AEGIS PROTOCOL — JSON-RPC STREAM VIEWER              ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}║   Log: logs/stream.log                                      ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}║   Mode: ${(replay ? (replayOnly ? 'Replay Only' : 'Replay + Follow') : 'Follow (live)').padEnd(52)}║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════════════════════════╝${C.reset}`);
  console.log('');

  // Ensure log directory exists
  const logsDir = path.dirname(LOG_PATH);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // Ensure log file exists
  if (!fs.existsSync(LOG_PATH)) {
    fs.writeFileSync(LOG_PATH, '');
  }

  // Replay existing entries
  if (replay) {
    const existing = fs.readFileSync(LOG_PATH, 'utf-8');
    const lines = existing.split('\n').filter(l => l.trim());
    
    if (lines.length > 0) {
      console.log(`${C.dim}─── Replaying ${lines.length} existing entries ───${C.reset}`);
      for (const line of lines) {
        renderLogEntry(line);
      }
      console.log(`${C.dim}─── End of replay ───${C.reset}`);
      console.log('');
    } else {
      console.log(`${C.dim}─── No existing entries to replay ───${C.reset}`);
      console.log('');
    }
  }

  if (!follow) {
    console.log(`${C.green}Replay complete.${C.reset}`);
    return;
  }

  // Watch for new entries
  console.log(`${C.cyan}Watching for new log entries... (Ctrl+C to stop)${C.reset}`);
  console.log('');

  let fileSize = fs.statSync(LOG_PATH).size;

  fs.watchFile(LOG_PATH, { interval: 100 }, () => {
    try {
      const stats = fs.statSync(LOG_PATH);
      if (stats.size > fileSize) {
        // Read only the new data
        const fd = fs.openSync(LOG_PATH, 'r');
        const buffer = Buffer.alloc(stats.size - fileSize);
        fs.readSync(fd, buffer, 0, buffer.length, fileSize);
        fs.closeSync(fd);

        const newData = buffer.toString('utf-8');
        const newLines = newData.split('\n').filter(l => l.trim());

        for (const line of newLines) {
          renderLogEntry(line);
        }

        fileSize = stats.size;
      } else if (stats.size < fileSize) {
        // Log file was truncated/reset
        fileSize = 0;
        console.log(`${C.yellow}⚠ Log file reset detected${C.reset}`);
      }
    } catch {
      // File might be temporarily unavailable
    }
  });

  // Keep process alive
  process.on('SIGINT', () => {
    console.log(`\n${C.dim}Stream viewer stopped.${C.reset}`);
    fs.unwatchFile(LOG_PATH);
    process.exit(0);
  });
}

main();
