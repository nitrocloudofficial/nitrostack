const { spawn } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const backendDir = path.join(root, "backend", "GuardianSenseBackend");
const frontendDir = path.join(root, "frontend");

const isWin = process.platform === "win32";
const npmCmd = isWin ? "npm.cmd" : "npm";
const nodeCmd = process.execPath;

const args = process.argv.slice(2);
const backendOnly = args.includes("--backend-only");
const frontendOnly = args.includes("--frontend-only");

const children = [];
let shuttingDown = false;

function run(command, args, cwd, label) {
  const child = spawn(command, args, { cwd, stdio: "inherit" });
  children.push(child);
  console.log(`[${label}] started (pid ${child.pid})`);
  child.on("exit", (code) => {
    if (code !== 0 && !shuttingDown) {
      console.error(`[${label}] exited with code ${code}`);
      process.exit(code);
    }
  });
  return child;
}

function startBackend() {
  const tsc = path.join(backendDir, "node_modules", "typescript", "bin", "tsc");
  const compile = spawn(nodeCmd, [tsc, "-p", backendDir], {
    cwd: backendDir,
    stdio: "inherit",
  });

  compile.on("exit", (code) => {
    if (code !== 0) {
      console.error("[backend] TypeScript compilation failed. Aborting.");
      process.exit(code);
    }
    console.log("[backend] compiled -> dist/");
    run(nodeCmd, ["dist/api/server.js"], backendDir, "backend");
  });
}

function startFrontend() {
  const nextBin = path.join(
    frontendDir,
    "node_modules",
    "next",
    "dist",
    "bin",
    "next"
  );
  run(nodeCmd, [nextBin, "dev", frontendDir], frontendDir, "frontend");
}

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    try {
      child.kill("SIGTERM");
    } catch (_) {
      /* ignore */
    }
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("exit", shutdown);

if (frontendOnly) {
  startFrontend();
} else {
  console.log(
    "[dev] compiling backend, then starting backend API (:5000) + WebSocket (:8080)"
  );
  startBackend();
}

if (!backendOnly) {
  startFrontend();
}
