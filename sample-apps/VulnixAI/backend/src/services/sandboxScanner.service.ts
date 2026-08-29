import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import axios from 'axios';
import os from 'os';
import { WebsiteScan } from '../db/models/WebsiteScan.model.js';
import { AIService } from './ai.service.js';

const execAsync = promisify(exec);

interface SandboxEnvironment {
  id: string;
  repoUrl: string;
  branch: string;
  workDir: string;
  port: number;
  process?: any;
  url?: string;
  status: 'cloning' | 'installing' | 'running' | 'scanning' | 'completed' | 'failed';
  logs: Array<{ time: Date; message: string; level: string }>;
  scanId?: string;        // website scan id
  codeScanResults?: any;  // AI code analysis results
  penTestResults?: any;   // penetration test results
  error?: string;
}

// Supported language runtimes for multi-language detection
const LANGUAGE_CONFIGS: Record<string, { files: string[]; installCmd?: string; startCmd: string }> = {
  python: {
    files: ['app.py', 'main.py', 'server.py', 'manage.py', 'wsgi.py'],
    installCmd: 'pip install -r requirements.txt',
    startCmd: 'python',
  },
  go: {
    files: ['main.go'],
    installCmd: 'go mod download',
    startCmd: 'go run .',
  },
  php: {
    files: ['index.php', 'server.php'],
    startCmd: `php -S 0.0.0.0:PORT`,
  },
  ruby: {
    files: ['app.rb', 'config.ru', 'Gemfile'],
    installCmd: 'bundle install',
    startCmd: 'bundle exec ruby',
  },
};

export class SandboxScannerService {
  private static sandboxes = new Map<string, SandboxEnvironment>();
  private static readonly SANDBOX_BASE_DIR = path.join(os.tmpdir(), 'sandboxes');
  private static readonly PORT_RANGE_START = 4000;
  private static readonly PORT_RANGE_END = 5000;
  private static usedPorts = new Set<number>();

  /**
   * Initialize sandbox and start clone & scan process
   */
  static async createSandbox(
    userId: string,
    repoUrl: string,
    branch: string = 'main'
  ): Promise<string> {
    const sandboxId = crypto.randomUUID();
    const workDir = path.join(this.SANDBOX_BASE_DIR, sandboxId);
    const port = this.allocatePort();

    const sandbox: SandboxEnvironment = {
      id: sandboxId,
      repoUrl,
      branch,
      workDir,
      port,
      status: 'cloning',
      logs: [],
    };

    this.sandboxes.set(sandboxId, sandbox);

    // Start the process in background
    this.processSandbox(sandboxId, userId).catch(error => {
      console.error('Sandbox process error:', error);
      const sb = this.sandboxes.get(sandboxId);
      if (sb) {
        sb.status = 'failed';
        sb.error = error.message;
      }
    });

    return sandboxId;
  }

  /**
   * Get sandbox status
   */
  static getSandboxStatus(sandboxId: string): SandboxEnvironment | null {
    return this.sandboxes.get(sandboxId) || null;
  }

  /**
   * Process sandbox: clone -> install -> run -> AI code scan + website scan + pen test
   */
  private static async processSandbox(sandboxId: string, userId: string): Promise<void> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) throw new Error('Sandbox not found');

    try {
      await fs.mkdir(this.SANDBOX_BASE_DIR, { recursive: true });

      // ── Step 1: Clone ──────────────────────────────────────────────────────
      this.addSandboxLog(sandboxId, 'info', `Cloning ${sandbox.repoUrl}...`);
      try {
        await execAsync(`git clone --depth 1 --branch "${sandbox.branch}" "${sandbox.repoUrl}" "${sandbox.workDir}"`);
      } catch (branchError: any) {
        if (branchError.message.includes('Remote branch') || branchError.message.includes('not found')) {
          this.addSandboxLog(sandboxId, 'warning', `Branch '${sandbox.branch}' not found, trying default branch...`);
          await execAsync(`git clone --depth 1 "${sandbox.repoUrl}" "${sandbox.workDir}"`);
        } else {
          throw branchError;
        }
      }
      this.addSandboxLog(sandboxId, 'success', 'Repository cloned successfully');

      // ── Step 2: AI Code Analysis (runs on disk files, no GitHub API needed) ─
      sandbox.status = 'scanning';
      this.addSandboxLog(sandboxId, 'info', 'Starting AI code analysis on cloned files...');
      try {
        const codeFiles = await this.readCodeFilesFromDisk(sandbox.workDir);
        this.addSandboxLog(sandboxId, 'info', `Found ${codeFiles.length} code files to analyze`);
        if (codeFiles.length > 0) {
          const MAX_BATCH = 3;
          const allVulns: any[] = [];

          for (let i = 0; i < codeFiles.length; i += MAX_BATCH) {
            const batch = codeFiles.slice(i, i + MAX_BATCH);
            const batchNum = Math.floor(i / MAX_BATCH) + 1;
            const totalBatches = Math.ceil(codeFiles.length / MAX_BATCH);
            this.addSandboxLog(sandboxId, 'info', `AI batch ${batchNum}/${totalBatches}...`);
            try {
              const result = await AIService.analyzeCode(batch);
              allVulns.push(...result.vulnerabilities);
              this.addSandboxLog(sandboxId, 'success', `Batch ${batchNum}: ${result.vulnerabilities.length} issues found`);
            } catch (err: any) {
              this.addSandboxLog(sandboxId, 'warning', `Batch ${batchNum} failed: ${err.message}`);
            }
            if (i + MAX_BATCH < codeFiles.length) {
              await new Promise(r => setTimeout(r, 1000));
            }
          }

          sandbox.codeScanResults = {
            total: allVulns.length,
            critical: allVulns.filter(v => v.severity === 'critical').length,
            high: allVulns.filter(v => v.severity === 'high').length,
            medium: allVulns.filter(v => v.severity === 'medium').length,
            low: allVulns.filter(v => v.severity === 'low').length,
            vulnerabilities: allVulns,
          };
          this.addSandboxLog(sandboxId, 'success', `AI code analysis complete: ${allVulns.length} vulnerabilities found`);
        } else {
          this.addSandboxLog(sandboxId, 'warning', 'No supported code files found for AI analysis');
        }
      } catch (err: any) {
        this.addSandboxLog(sandboxId, 'warning', `AI code analysis failed: ${err.message} — continuing`);
      }

      // ── Step 3: Install dependencies ──────────────────────────────────────
      sandbox.status = 'installing';
      this.addSandboxLog(sandboxId, 'info', 'Installing dependencies...');
      const lang = await this.detectLanguage(sandbox.workDir);
      this.addSandboxLog(sandboxId, 'info', `Detected language: ${lang}`);
      await this.installDependencies(sandboxId, sandbox.workDir, lang);

      // ── Step 4: Run the application ────────────────────────────────────────
      sandbox.status = 'running';
      this.addSandboxLog(sandboxId, 'info', `Starting application on port ${sandbox.port}...`);
      const startCommand = await this.detectStartCommand(sandbox.workDir, lang, sandbox.port);

      if (!startCommand) {
        // Language like Java can't be auto-booted — skip run + pen test, still complete
        this.addSandboxLog(sandboxId, 'warning', `Auto-boot not supported for language: ${lang}. Skipping runtime scan.`);
        sandbox.status = 'completed';
        const totalIssues = sandbox.codeScanResults?.total || 0;
        this.addSandboxLog(sandboxId, 'success', `Scan complete (code analysis only). Issues found: ${totalIssues}`);
        setTimeout(() => this.cleanupSandbox(sandboxId), 300000);
        return;
      }

      this.addSandboxLog(sandboxId, 'info', `Start command: ${startCommand}`);
      sandbox.url = `http://localhost:${sandbox.port}`;

      const childProcess = exec(startCommand, {
        cwd: sandbox.workDir,
        env: { ...process.env, PORT: sandbox.port.toString() },
      });
      sandbox.process = childProcess;
      childProcess.stdout?.on('data', d => console.log(`[Sandbox ${sandboxId}] ${d}`));
      childProcess.stderr?.on('data', d => console.error(`[Sandbox ${sandboxId}] ${d}`));

      await this.waitForServer(sandbox.url, 60000);
      this.addSandboxLog(sandboxId, 'success', `Application running at ${sandbox.url}`);

      // ── Step 5: Website scan + Pen test in parallel ────────────────────────
      sandbox.status = 'scanning';
      this.addSandboxLog(sandboxId, 'info', 'Running website scan and penetration test in parallel...');

      const [scanId, penTestResult] = await Promise.allSettled([
        this.scanRunningApp(userId, sandbox.url, sandbox.repoUrl),
        this.runPenTest(sandboxId, sandbox.url),
      ]);

      if (scanId.status === 'fulfilled') {
        sandbox.scanId = scanId.value;
        const scan = await WebsiteScan.findById(scanId.value);
        const vulnCount = scan?.vulnerabilities?.length || 0;
        this.addSandboxLog(sandboxId, 'success', `Website scan complete: ${vulnCount} issues found`);
      } else {
        this.addSandboxLog(sandboxId, 'warning', `Website scan failed: ${scanId.reason?.message}`);
      }

      if (penTestResult.status === 'fulfilled') {
        sandbox.penTestResults = penTestResult.value;
        const vulnCount = penTestResult.value?.vulnerabilitiesFound || 0;
        this.addSandboxLog(sandboxId, 'success', `Pen test complete: ${vulnCount} vulnerabilities found`);
      } else {
        this.addSandboxLog(sandboxId, 'warning', `Pen test failed: ${penTestResult.reason?.message}`);
      }

      // ── Done ───────────────────────────────────────────────────────────────
      sandbox.status = 'completed';
      const totalIssues =
        (sandbox.codeScanResults?.total || 0) +
        (sandbox.penTestResults?.vulnerabilitiesFound || 0);
      this.addSandboxLog(sandboxId, 'success', `All scans complete! Total issues found: ${totalIssues}`);

      setTimeout(() => this.cleanupSandbox(sandboxId), 300000);
    } catch (error: any) {
      console.error('Sandbox processing error:', error);
      sandbox.status = 'failed';
      sandbox.error = error.message;
      this.addSandboxLog(sandboxId, 'error', `Failed: ${error.message}`);
      setTimeout(() => this.cleanupSandbox(sandboxId), 60000);
    }
  }

  /**
   * Read all code files from disk for AI analysis
   */
  private static async readCodeFilesFromDisk(
    workDir: string,
    maxFiles = 10,        // keep low to avoid burning daily token quota
    maxCharsPerFile = 800 // ~200 tokens per file, 10 files = ~2000 tokens per batch
  ): Promise<Array<{ path: string; content: string }>> {
    const SUPPORTED_EXTS = new Set(['js', 'ts', 'jsx', 'tsx', 'py', 'go', 'php', 'rb', 'java', 'cs', 'cpp', 'c', 'rs', 'kt', 'swift']);
    const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'vendor', '__pycache__', '.venv', 'venv']);
    const results: Array<{ path: string; content: string; priority: number }> = [];

    const walk = async (dir: string): Promise<void> => {
      let entries: any[];
      try { entries = await fs.readdir(dir, { withFileTypes: true }); }
      catch { return; }

      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (!SKIP_DIRS.has(entry.name)) await walk(path.join(dir, entry.name));
        } else if (entry.isFile()) {
          const ext = entry.name.split('.').pop()?.toLowerCase() || '';
          if (!SUPPORTED_EXTS.has(ext)) continue;
          const fullPath = path.join(dir, entry.name);
          const relPath = path.relative(workDir, fullPath);
          try {
            let content = await fs.readFile(fullPath, 'utf-8');
            if (content.length > maxCharsPerFile) {
              content = content.slice(0, maxCharsPerFile) + '\n// ... (truncated)';
            }
            // Simple priority: security-related filenames first
            const p = relPath.toLowerCase();
            const priority = (p.includes('auth') || p.includes('login') || p.includes('password') || p.includes('token') || p.includes('api')) ? 1 : 0;
            results.push({ path: relPath, content, priority });
          } catch { /* skip unreadable files */ }
        }
      }
    };

    await walk(workDir);
    // Sort high-priority files first, then cap
    results.sort((a, b) => b.priority - a.priority);
    return results.slice(0, maxFiles).map(({ path, content }) => ({ path, content }));
  }

  /**
   * Detect the primary language of the project
   */
  private static async detectLanguage(workDir: string): Promise<string> {
    const files = await fs.readdir(workDir).catch(() => [] as string[]);
    if (files.includes('package.json')) return 'node';
    if (files.includes('requirements.txt') || files.includes('setup.py') || files.includes('pyproject.toml')) return 'python';
    if (files.includes('go.mod')) return 'go';
    if (files.includes('Gemfile')) return 'ruby';
    if (files.includes('composer.json') || files.some(f => f.endsWith('.php'))) return 'php';
    if (files.includes('pom.xml') || files.includes('build.gradle') || files.some(f => f.endsWith('.java'))) return 'java';
    return 'unknown';
  }

  /**
   * Install dependencies based on detected language
   */
  private static async installDependencies(sandboxId: string, workDir: string, lang: string): Promise<void> {
    try {
      switch (lang) {
        case 'node': {
          try {
            await execAsync('npm install --legacy-peer-deps', { cwd: workDir, timeout: 300000 });
          } catch {
            await execAsync('npm install', { cwd: workDir, timeout: 300000 });
          }
          this.addSandboxLog(sandboxId, 'success', 'Node.js dependencies installed');
          break;
        }
        case 'python': {
          const hasReqs = await fs.access(path.join(workDir, 'requirements.txt')).then(() => true).catch(() => false);
          if (hasReqs) {
            await execAsync('pip install -r requirements.txt', { cwd: workDir, timeout: 300000 });
            this.addSandboxLog(sandboxId, 'success', 'Python dependencies installed');
          } else {
            this.addSandboxLog(sandboxId, 'warning', 'No requirements.txt found, skipping pip install');
          }
          break;
        }
        case 'go': {
          await execAsync('go mod download', { cwd: workDir, timeout: 120000 });
          this.addSandboxLog(sandboxId, 'success', 'Go modules downloaded');
          break;
        }
        case 'ruby': {
          await execAsync('bundle install', { cwd: workDir, timeout: 300000 });
          this.addSandboxLog(sandboxId, 'success', 'Ruby gems installed');
          break;
        }
        case 'php': {
          const hasComposer = await fs.access(path.join(workDir, 'composer.json')).then(() => true).catch(() => false);
          if (hasComposer) {
            await execAsync('composer install --no-interaction', { cwd: workDir, timeout: 300000 });
            this.addSandboxLog(sandboxId, 'success', 'PHP composer dependencies installed');
          }
          break;
        }
        default:
          this.addSandboxLog(sandboxId, 'warning', `No install step for language: ${lang}`);
      }
    } catch (err: any) {
      this.addSandboxLog(sandboxId, 'warning', `Dependency install failed: ${err.message} — continuing`);
    }
  }

  /**
   * Run penetration test on the running sandbox app
   */
  private static async runPenTest(sandboxId: string, url: string): Promise<any> {
    try {
      const { PenetrationTestingService } = await import('./penetrationTesting.service.js');
      this.addSandboxLog(sandboxId, 'info', 'Starting penetration test on running app...');
      const result = await PenetrationTestingService.performPenetrationTest(url);
      return result;
    } catch (err: any) {
      this.addSandboxLog(sandboxId, 'warning', `Pen test error: ${err.message}`);
      return null;
    }
  }

  /**
   * Detect how to start the application (multi-language)
   */
  private static async detectStartCommand(workDir: string, lang: string, port: number): Promise<string> {
    switch (lang) {
      case 'node': {
        try {
          const pkg = JSON.parse(await fs.readFile(path.join(workDir, 'package.json'), 'utf-8'));
          if (pkg.scripts?.start) return 'npm start';
          if (pkg.scripts?.dev) return 'npm run dev';
          if (pkg.scripts?.serve) return 'npm run serve';
        } catch { /* fall through */ }
        const files = await fs.readdir(workDir).catch(() => [] as string[]);
        for (const f of ['server.js', 'index.js', 'app.js', 'main.js']) {
          if (files.includes(f)) return `node ${f}`;
        }
        // check src/
        const srcFiles = await fs.readdir(path.join(workDir, 'src')).catch(() => [] as string[]);
        for (const f of ['server.js', 'index.js', 'app.js', 'main.js']) {
          if (srcFiles.includes(f)) return `node src/${f}`;
        }
        throw new Error('Could not detect Node.js start command');
      }
      case 'python': {
        const files = await fs.readdir(workDir).catch(() => [] as string[]);
        if (files.includes('manage.py')) return `python manage.py runserver 0.0.0.0:${port}`;
        for (const f of ['app.py', 'main.py', 'server.py', 'wsgi.py']) {
          if (files.includes(f)) return `python ${f}`;
        }
        throw new Error('Could not detect Python start command');
      }
      case 'go':
        return 'go run .';
      case 'ruby': {
        const files = await fs.readdir(workDir).catch(() => [] as string[]);
        if (files.includes('config.ru')) return `bundle exec rackup -p ${port}`;
        if (files.includes('app.rb')) return `bundle exec ruby app.rb -p ${port}`;
        throw new Error('Could not detect Ruby start command');
      }
      case 'php': {
        return `php -S 0.0.0.0:${port}`;
      }
      default:
        // java and unknown — can't auto-boot, return null signal
        return '';
    }
  }

  /**
   * Wait for server to be ready
   */
  private static async waitForServer(url: string, timeout: number): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        await axios.get(url, { timeout: 2000 });
        return; // Server is ready
      } catch (error) {
        // Server not ready yet, wait and retry
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    throw new Error('Server failed to start within timeout period');
  }

  /**
   * Scan the running application
   */
  private static async scanRunningApp(userId: string, url: string, repoUrl: string): Promise<string> {
    // Import websiteScanner service
    const { WebsiteScannerService } = await import('./websiteScanner.service.js');

    // Run the scan to get results
    const scanResult = await WebsiteScannerService.scanWebsite(url);

    // Create scan record with results
    const scan = await WebsiteScan.create({
      userId: parseInt(userId),
      url: scanResult.url,
      scanDate: scanResult.scanDate,
      vulnerabilities: scanResult.vulnerabilities,
      securityScore: scanResult.securityScore,
      headers: scanResult.headers,
      technologies: scanResult.technologies,
      ssl: scanResult.ssl,
    });

    return scan._id.toString();
  }

  /**
   * Cleanup sandbox environment
   */
  private static async cleanupSandbox(sandboxId: string): Promise<void> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) return;

    try {
      // Kill process if running
      if (sandbox.process) {
        sandbox.process.kill();
      }

      // Release port
      this.usedPorts.delete(sandbox.port);

      // Remove directory
      await fs.rm(sandbox.workDir, { recursive: true, force: true });

      // Remove from map
      this.sandboxes.delete(sandboxId);

      console.log(`Sandbox ${sandboxId} cleaned up`);
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  /**
   * Allocate an available port
   */
  private static allocatePort(): number {
    for (let port = this.PORT_RANGE_START; port <= this.PORT_RANGE_END; port++) {
      if (!this.usedPorts.has(port)) {
        this.usedPorts.add(port);
        return port;
      }
    }
    throw new Error('No available ports in range');
  }

  /**
   * Add log to sandbox
   */
  private static addSandboxLog(
    sandboxId: string,
    level: 'info' | 'success' | 'warning' | 'error',
    message: string
  ): void {
    const sandbox = this.sandboxes.get(sandboxId);
    if (sandbox) {
      sandbox.logs.push({ time: new Date(), message, level });
    }
  }
}
