const { execSync } = require('child_process');
const fs = require('fs');

console.log("Starting ADIP build logic...");

try {
  const archMap = { 'arm64': 'aarch64', 'x64': 'x86_64' };
  const arch = archMap[process.arch] || 'x86_64';
  console.log(`Detected arch: ${process.arch} -> downloading uv for ${arch}-musl...`);

  const url = `https://github.com/astral-sh/uv/releases/latest/download/uv-${arch}-unknown-linux-musl.tar.gz`;
  execSync(`wget -qO uv.tar.gz ${url} || curl -sSL -o uv.tar.gz ${url}`, { stdio: 'inherit' });
  execSync('tar -xzf uv.tar.gz', { stdio: 'inherit' });
  execSync(`mv uv-${arch}-unknown-linux-musl/uv /app/uv || cp uv /app/uv 2>/dev/null || true`, { stdio: 'inherit' });
  execSync('chmod +x /app/uv 2>/dev/null || true', { stdio: 'inherit' });
  console.log("uv binary setup complete!");
} catch (e) {
  console.warn("uv download warning (will fallback at runtime if needed):", e.message);
}

try {
  console.log("Pre-installing Python 3.11 virtual environment...");
  const env = { ...process.env, UV_PYTHON_INSTALL_DIR: '/app/.uv_python' };

  if (fs.existsSync('/app/uv')) {
    execSync('/app/uv venv --python 3.11 /app/.venv || /app/uv venv /app/.venv', { stdio: 'inherit', env });

    const reqs = ['orchestrator', 'explorer-mcp', 'documentation-mcp', 'qa-mcp', 'demo-mcp', 'release-mcp', 'knowledge-mcp']
      .map(f => `${f}/requirements.txt`)
      .filter(f => fs.existsSync(f))
      .map(f => `-r ${f}`)
      .join(' ');

    console.log("Installing python packages...");
    execSync(`/app/uv pip install --python /app/.venv/bin/python ${reqs} fastmcp pydantic mcp`, { stdio: 'inherit', env });
    console.log("Python environment pre-installation successful!");
  }
} catch (e) {
  console.warn("Pre-installation warning:", e.message);
}

console.log("Build script completed safely!");
