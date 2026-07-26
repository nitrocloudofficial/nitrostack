const { spawn, execSync } = require('child_process');
const fs = require('fs');

console.log("Starting FASTAPI Orchestrator...");

let pythonBin = '/app/.venv/bin/python';

if (!fs.existsSync(pythonBin)) {
    console.log("/app/.venv/bin/python not found, setting up fallback virtualenv in /tmp/.venv...");
    try {
        execSync('uv venv /tmp/.venv || python3 -m venv /tmp/.venv || python -m venv /tmp/.venv', { stdio: 'inherit' });
        pythonBin = '/tmp/.venv/bin/python';
        const reqs = ['orchestrator', 'explorer-mcp', 'documentation-mcp', 'qa-mcp', 'demo-mcp', 'release-mcp', 'knowledge-mcp']
            .map(f => `${f}/requirements.txt`)
            .filter(f => fs.existsSync(f))
            .map(f => `-r ${f}`)
            .join(' ');
        execSync(`${pythonBin} -m pip install ${reqs} fastmcp pydantic mcp fastapi uvicorn || uv pip install --python ${pythonBin} ${reqs} fastmcp pydantic mcp fastapi uvicorn`, { stdio: 'inherit' });
    } catch (e) {
        console.warn("Fallback environment setup warning, attempting system python...", e.message);
        pythonBin = 'python3';
    }
}

console.log(`Launching application using: ${pythonBin}`);
const env = { ...process.env, UV_PYTHON_INSTALL_DIR: '/tmp/.uv_python' };
const child = spawn(pythonBin, ['orchestrator/main.py'], { stdio: 'inherit', env });

child.on('close', (code) => {
    console.log(`Orchestrator process exited with code ${code}`);
    process.exit(code !== null ? code : 1);
});
