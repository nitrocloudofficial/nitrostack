import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { TelemetryRepository } from '../../data/repositories/telemetry-repository.js';

export class telemetryResources {
  
  private repo = new TelemetryRepository();

  @Resource({
    uri: 'telemetry://{userId}/today',
    name: 'Today\'s Telemetry',
    description: 'Read this to obtain today\'s biometric snapshot (steps, sleep, hr, hydration, stress). Use this for immediate adjustments.',
    mimeType: 'application/json',
  })
  async getToday(context: ExecutionContext) {
    const uri = String(context.metadata?.uri || '');
    const match = uri.match(/telemetry:\/\/([^/]+)\/today/);
    const userId = match ? match[1] : null;

    if (!userId) throw new Error("Missing userId in URI");

    const snapshots = this.repo.getByUserId(userId);
    if (!snapshots || snapshots.length === 0) throw new Error(`No telemetry found for user: ${userId}`);
    
    // Last item is today
    const today = snapshots[snapshots.length - 1];
    const stat = this.repo.getStatSync(userId);

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(today, null, 2)
      }],
      annotations: { audience: ['any'], priority: 1 },
      lastModified: stat ? stat.mtimeMs : undefined
    };
  }

  @Resource({
    uri: 'telemetry://{userId}/7d',
    name: '7-Day Telemetry Trends',
    description: 'Read this to get the 7-day rolling biometric trends (sleep debt, recovery, hydration deficit, stress). Crucial for longitudinal diet adjustments.',
    mimeType: 'application/json',
  })
  async get7Day(context: ExecutionContext) {
    const uri = String(context.metadata?.uri || '');
    const match = uri.match(/telemetry:\/\/([^/]+)\/7d/);
    const userId = match ? match[1] : null;

    if (!userId) throw new Error("Missing userId in URI");

    const snapshots = this.repo.getByUserId(userId);
    if (!snapshots || snapshots.length === 0) throw new Error(`No telemetry found for user: ${userId}`);
    
    const last7 = snapshots.slice(-7);
    
    let totalSleep = 0;
    let totalHydration = 0;
    let totalStress = 0;
    let totalRecovery = 0;
    
    last7.forEach(s => {
      totalSleep += s.sleep.duration_min;
      totalHydration += s.hydration_ml;
      totalStress += s.stress_index;
      totalRecovery += s.hr_recovery;
    });

    const days = last7.length || 1;
    
    // Baseline targets (simplified for demo)
    const TARGET_SLEEP = 480; // 8 hrs
    const TARGET_HYDRATION = 2500;

    const data = {
      raw_data: last7,
      computed_trends: {
        avg_sleep_min: totalSleep / days,
        sleep_debt_min: (TARGET_SLEEP * days) - totalSleep,
        avg_hydration_ml: totalHydration / days,
        hydration_deficit_ml: (TARGET_HYDRATION * days) - totalHydration,
        avg_stress_index: totalStress / days,
        avg_hr_recovery: totalRecovery / days,
      }
    };
    
    const stat = this.repo.getStatSync(userId);

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2)
      }],
      annotations: { audience: ['any'], priority: 1 },
      lastModified: stat ? stat.mtimeMs : undefined
    };
  }
}

