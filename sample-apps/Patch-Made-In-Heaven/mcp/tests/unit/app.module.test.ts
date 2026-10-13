import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { AppModule } from '../../src/app.module.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const appModuleSource = fs.readFileSync(path.join(currentDir, '../../src/app.module.ts'), 'utf-8');

describe('AppModule tool discovery', () => {
  it('exports a valid module', () => {
    expect(AppModule).toBeDefined();
  });

  it('imports VerifyTools and SubmitTools (Phase 3: trust chain complete, tools now registered)', () => {
    expect(appModuleSource).toMatch(/^import .*VerifyTools/m);
    expect(appModuleSource).toMatch(/^import .*SubmitTools/m);
  });

  it('registers all four tool classes as controllers (not providers)', () => {
    // @nitrostack/core only scans `controllers` for @Tool/@Resource/@Prompt
    // methods — `providers` is DI-only and is never inspected for tools. See
    // DOUBTS.md for how this was discovered (tools/list returned empty while
    // this project used `providers`, silently, since before Phase 1).
    const controllersMatch = appModuleSource.match(/controllers:\s*\[([^\]]*)]/);
    expect(controllersMatch).not.toBeNull();
    const controllerNames = controllersMatch![1].split(',').map((name) => name.trim()).filter(Boolean);
    expect(controllerNames).toEqual(['SearchTools', 'RetrieveTools', 'VerifyTools', 'SubmitTools']);

    expect(appModuleSource).not.toMatch(/providers:\s*\[/);
  });
});
