import { AegisService } from '../src/modules/aegis/aegis.service.js';
import { AegisTools } from '../src/modules/aegis/tools/aegis.tools.js';
import { BankingTools } from '../src/modules/aegis/tools/banking.tools.js';
import { ThreatScoreGuard } from '../src/modules/aegis/guards/threat-score.guard.js';

async function run() {
  const svc = new AegisService();
  await svc.onModuleInit();
  const aegisTools = new AegisTools(svc);
  const bankingTools = new BankingTools();
  const ctx = { logger: { info: console.log } } as any;

  console.log('--- HIGH ---');
  const highRes = await aegisTools.runThreatAnalysis({ priority: 'URGENT', scenario: 'high' }, ctx);
  console.log('High Score:', highRes.threat_score);

  console.log('--- MEDIUM ---');
  const medRes = await aegisTools.runThreatAnalysis({ priority: 'URGENT', scenario: 'medium' }, ctx);
  console.log('Medium Score:', medRes.threat_score);

  console.log('--- SAFE ---');
  const safeRes = await aegisTools.runThreatAnalysis({ priority: 'URGENT', scenario: 'safe' }, ctx);
  console.log('Safe Score:', safeRes.threat_score);

  console.log('--- APPROVE FREEZE ---');
  const highRes2 = await aegisTools.runThreatAnalysis({ priority: 'URGENT', scenario: 'high' }, ctx);
  
  // Start dispatch_mha_alert (it has the guard)
  // Wait, the @UseGuards decorator is an SDK feature. 
  // In a direct class call, decorators don't auto-execute unless we manually run the Guard or use the SDK framework.
  // We'll manually invoke the guard since we're just testing class methods directly.
  const guard = new ThreatScoreGuard();
  
  // We start the guard check in the background just like the framework would
  const guardPromise = guard.canActivate(ctx);
  
  // Then we approve it
  setTimeout(async () => {
     const freezeRes = await aegisTools.approveFreezeReport({ approved: true }, ctx);
     console.log('Freeze Approval Status:', freezeRes.status);
  }, 100);
  
  const canActivate = await guardPromise;
  console.log('Guard result:', canActivate);
}

run();
