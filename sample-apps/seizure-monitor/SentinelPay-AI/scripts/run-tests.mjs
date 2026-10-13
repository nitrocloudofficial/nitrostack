import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";

async function findTests(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await findTests(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".test.ts")) {
      files.push(fullPath);
    }
  }

  return files;
}

const testFiles = await findTests("tests");

if (testFiles.length === 0) {
  console.error("No test files found.");
  process.exit(1);
}

console.log(`Running ${testFiles.length} test files...`);

const child = spawn(
  process.execPath,
  ["--import", "tsx", "--test", ...testFiles],
  {
    stdio: "inherit",
    shell: false
  }
);

child.on("exit", (code) => {
  process.exit(code ?? 1);
});