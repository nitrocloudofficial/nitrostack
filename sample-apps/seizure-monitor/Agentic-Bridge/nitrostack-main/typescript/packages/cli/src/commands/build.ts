import chalk from 'chalk';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import * as esbuild from 'esbuild';
import {
  createHeader,
  createSuccessBox,
  createErrorBox,
  NitroSpinner,
  log,
  spacer,
  nextSteps,
  brand,
  NITRO_BANNER_FULL,
  showFooter
} from '../ui/branding.js';
import { trackEvent, shutdownAnalytics } from '../analytics/posthog.js';

interface BuildOptions {
  output: string;
}

export async function buildCommand(options: BuildOptions) {
  console.log(NITRO_BANNER_FULL);
  console.log(createHeader('Build', 'Production bundle'));

  const startTime = Date.now();

  trackEvent('cli_command_invoked', {
    command: 'build',
    options: Object.keys(options).filter(k => options[k as keyof BuildOptions] !== undefined),
  });

  // Validate project
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.log(createErrorBox('Not a NitroStack Project', 'package.json not found'));
    process.exit(1);
  }

  const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
  if (!fs.existsSync(tsconfigPath)) {
    console.log(createErrorBox('Missing Configuration', 'tsconfig.json not found'));
    process.exit(1);
  }

  // Detect widgets
  const widgetsPath = path.resolve(process.cwd(), 'src/widgets');
  const widgetsPackageJsonPath = path.join(widgetsPath, 'package.json');
  const hasWidgets = fs.existsSync(widgetsPackageJsonPath);

  const buildArtifacts: string[] = [];

  try {
    // Build widgets first if they exist
    if (hasWidgets) {
      // Install dependencies if needed
      const widgetsNodeModulesPath = path.join(widgetsPath, 'node_modules');
      if (!fs.existsSync(widgetsNodeModulesPath)) {
        const depsSpinner = new NitroSpinner('Installing widget dependencies...').start();
        try {
          execSync('npm install', { cwd: widgetsPath, stdio: 'pipe' });
          depsSpinner.succeed('Widget dependencies installed');
        } catch {
          depsSpinner.fail('Failed to install widget dependencies');
          throw new Error('Widget dependency installation failed');
        }
      }

      const widgetSpinner = new NitroSpinner('Bundling widgets...').start();

      try {
        const APP_DIR = path.join(widgetsPath, 'app');
        const OUT_DIR = path.join(widgetsPath, 'out');

        // Clean output directory
        if (fs.existsSync(OUT_DIR)) {
          fs.rmSync(OUT_DIR, { recursive: true });
        }
        fs.mkdirSync(OUT_DIR, { recursive: true });

        // Find all widget pages
        const widgetPages: { name: string; entryPoint: string; outputName: string }[] = [];

        function findWidgetPages(dir: string, basePath = '') {
          const entries = fs.readdirSync(dir, { withFileTypes: true });

          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.join(basePath, entry.name);

            if (entry.isDirectory()) {
              findWidgetPages(fullPath, relativePath);
            } else if (entry.name === 'page.tsx' || entry.name === 'page.jsx') {
              const widgetName = basePath || 'index';
              widgetPages.push({
                name: widgetName,
                entryPoint: fullPath,
                outputName: widgetName.replace(/\//g, '-')
              });
            }
          }
        }

        if (fs.existsSync(APP_DIR)) {
          findWidgetPages(APP_DIR);
        }

        // Linked @nitrostack/widgets often has its own node_modules/react (e.g. v19) while this app
        // uses v18. Esbuild resolves from the realpath of the symlinked package, so without aliases
        // the widget bundle can contain two Reacts and render blank in MCP hosts. Next.js can use
        // webpack aliases in next.config.js; production `nitrostack-cli build` mirrors that here.
        const widgetsNm = path.join(widgetsPath, 'node_modules');
        const widgetReactAliases: Record<string, string> = {
          react: path.join(widgetsNm, 'react'),
          'react-dom': path.join(widgetsNm, 'react-dom'),
          'react/jsx-runtime': path.join(widgetsNm, 'react', 'jsx-runtime.js'),
          'react/jsx-dev-runtime': path.join(widgetsNm, 'react', 'jsx-dev-runtime.js'),
        };

        // Bundle each widget
        for (const widget of widgetPages) {
          const tempEntry = path.join(OUT_DIR, `_temp_${widget.outputName}.jsx`);
          const jsOutput = path.join(OUT_DIR, `${widget.outputName}.js`);
          const htmlOutput = path.join(OUT_DIR, `${widget.outputName}.html`);

          const entryCode = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import WidgetPage from '${widget.entryPoint.replace(/\\/g, '/')}';

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  const data = window.openai?.toolOutput || {};
  
  let root = document.getElementById('widget-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'widget-root';
    document.body.appendChild(root);
  }
  
  const reactRoot = createRoot(root);
  reactRoot.render(React.createElement(WidgetPage, { data }));
}
`;

          fs.writeFileSync(tempEntry, entryCode);

          await esbuild.build({
            entryPoints: [tempEntry],
            bundle: true,
            format: 'iife',
            outfile: jsOutput,
            platform: 'browser',
            target: ['es2020'],
            minify: true,
            jsx: 'automatic',
            jsxImportSource: 'react',
            external: [],
            nodePaths: [widgetsNm],
            alias: widgetReactAliases,
            define: {
              'process.env.NODE_ENV': '"production"'
            },
            logLevel: 'warning'
          });

          const bundledJs = fs.readFileSync(jsOutput, 'utf-8');

          const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; }
    body { 
      margin: 0; 
      padding: 0; 
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    #widget-root {
      width: 100%;
      min-height: 100vh;
    }
  </style>
</head>
<body>
  <div id="widget-root"></div>
  <script>${bundledJs}</script>
</body>
</html>`;

          fs.writeFileSync(htmlOutput, html);
          fs.unlinkSync(tempEntry);
          fs.unlinkSync(jsOutput);
        }

        widgetSpinner.succeed(`Widgets bundled (${widgetPages.length} widgets)`);
        buildArtifacts.push(`src/widgets/out/ (${widgetPages.length} widgets)`);
      } catch (error: unknown) {
        widgetSpinner.fail('Widget bundling failed');
        throw error;
      }
    }

    // Build TypeScript
    const tscSpinner = new NitroSpinner('Compiling TypeScript...').start();

    try {
      execSync('npx tsc', {
        cwd: process.cwd(),
        stdio: 'pipe',
      });
      tscSpinner.succeed('TypeScript compiled');
      buildArtifacts.push(options.output);
    } catch (error: unknown) {
      tscSpinner.fail('TypeScript compilation failed');
      // Show the actual TypeScript errors
      const execError = error as { stdout?: Buffer; stderr?: Buffer };
      if (execError.stdout) console.log('\n' + execError.stdout.toString());
      if (execError.stderr) console.log('\n' + execError.stderr.toString());
      throw error;
    }

    // Summary
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    spacer();
    console.log(createSuccessBox(`Build Complete (${elapsed}s)`, buildArtifacts));

    nextSteps([
      'npm start       - Start production server',
      'nitrostack start - Alternative start command',
    ]);

    showFooter();

    trackEvent('cli_build_completed', {
      has_widgets: hasWidgets,
      widget_count: buildArtifacts.length - 1,
      duration_ms: Date.now() - startTime,
    });
    await shutdownAnalytics();
  } catch (error: unknown) {
    console.log(NITRO_BANNER_FULL);
    spacer();
    console.log(createErrorBox('Build Failed', error instanceof Error ? error.message : String(error)));

    trackEvent('cli_build_failed', {
      error: (error instanceof Error ? error.message : String(error)).slice(0, 200),
      stage: hasWidgets ? 'widgets_or_typescript' : 'typescript',
    });
    await shutdownAnalytics();
    process.exit(1);
  }
}
