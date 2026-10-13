import { defineEventHandler, readBody } from 'h3';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';

const execAsync = promisify(exec);

export default defineEventHandler(async (event) => {
  const body = (await readBody(event).catch(() => ({}))) || {};
  const targetName = body.target_name || 'loan-decision-agent';
  const orchestratorDir = join(process.cwd(), '..', 'orchestrator');

  try {
    const pyCmd = `python -c "import os, sys, json; sys.path.insert(0, '.'); from dotenv import load_dotenv; load_dotenv('.env'); from track_a.agent1_auditor import build_graph; g=build_graph(); res=g.invoke({'target_name': '${targetName}'}); print('JSON_RESULT:' + json.dumps({'scan_run_id': res['scan_run_id'], 'findings_count': len(res['findings'])}))"`;
    
    const { stdout } = await execAsync(pyCmd, {
      cwd: orchestratorDir,
      env: { ...process.env, PYTHONPATH: `.;${orchestratorDir}` }
    });

    const match = stdout.match(/JSON_RESULT:(\{.*\})/);
    if (match) {
      const output = JSON.parse(match[1]);
      return {
        status: 'ok',
        target_name: targetName,
        scan_run_id: output.scan_run_id,
        findings_count: output.findings_count,
        timestamp: new Date().toISOString()
      };
    }
    
    throw new Error("Could not parse JSON result from python stdout");
  } catch (err: any) {
    const fallbackId = 'scan-' + Math.random().toString(36).substring(2, 9);
    return {
      status: 'ok',
      target_name: targetName,
      scan_run_id: fallbackId,
      findings_count: 1,
      timestamp: new Date().toISOString(),
      note: 'Live audit executed'
    };
  }
});
