const { spawn } = require('child_process');

const child = spawn('node', ['dist/index.js'], {
  cwd: __dirname,
  stdio: ['pipe', 'pipe', 'inherit'],
  shell: false
});

// Forward our stdin to the child process (MCP requests)
process.stdin.pipe(child.stdin);

// Filter the child's stdout
let buffer = '';
child.stdout.on('data', (data) => {
  buffer += data.toString();
  let newlineIndex;
  
  while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, newlineIndex).trim();
    buffer = buffer.slice(newlineIndex + 1);
    
    if (!line) continue;
    
    try {
      // If it's valid JSON, it's a real MCP message. Forward to stdout.
      JSON.parse(line);
      process.stdout.write(line + '\n');
    } catch (e) {
      // If it's NOT valid JSON, it's a rogue CLI log (e.g. "Starting server...").
      // Route it to stderr so it doesn't break the MCP stdio protocol!
      process.stderr.write('[CLI LOG] ' + line + '\n');
    }
  }
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
