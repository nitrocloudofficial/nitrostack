import { Injectable } from '@nitrostack/core';
import { ConfigService } from '../config/config.service.js';

@Injectable({ deps: [ConfigService] })
export class ReportService {
  constructor(private readonly configService: ConfigService) {}

  private getScenarioInfo() {
    const active = this.configService.getActiveScenarioName();
    if (active === 'scenario2') {
      return {
        incidentId: 'INC-1026',
        summary: 'Incident INC-1026: user-service latency spiking and connection timeouts.',
        rootCause: 'The database connection pool limit (DB_POOL_MAX) is configured too low (value: 2), causing HikariCP pool exhaustion and query timeouts.',
        timeline: [
          { time: '16:10', event: 'Latency Spikes Detected (p95 > 5000ms)' },
          { time: '16:11', event: 'HikariPool connection timeout exceptions logged' }
        ],
        actions: ['Increase DB_POOL_MAX configuration to 20 or more', 'Check database connection limits'],
        resolved: false
      };
    }
    if (active === 'scenario3') {
      return {
        incidentId: 'INC-1027',
        summary: 'Incident INC-1027: auth-service crashing repeatedly with OutOfMemory errors.',
        rootCause: 'A memory leak was introduced by storing user validation sessions in an unbounded in-memory cache map that never evicts expired tokens, leading to JVM heap exhaustion.',
        timeline: [
          { time: '12:00', event: 'Session caching feature deployed' },
          { time: '12:30', event: 'Elevated memory usage (98.7%)' },
          { time: '12:35', event: 'Container OOMKilled with exit code 137' }
        ],
        actions: ['Implement cache eviction (LRU) or set TTL', 'Roll back to the previous deployment', 'Increase JVM heap limit -Xmx'],
        resolved: false
      };
    }
    // Default / Scenario 1
    return {
      incidentId: 'INC-1025',
      summary: 'Incident INC-1025: payment-service failures due to Stripe client initialization crash.',
      rootCause: 'The environment variable STRIPE_API_KEY is missing from the production deployment configuration, causing a NullPointerException in the Stripe API client initialization.',
      timeline: [
        { time: '15:30', event: 'Stripe integration deployed' },
        { time: '15:35', event: 'CrashLoopBackOff Detected (NullPointerException)' },
        { time: '15:40', event: 'Incident Investigation Initiated' }
      ],
      actions: ['Add STRIPE_API_KEY to production configuration', 'Rollback recent deployment', 'Add pre-deploy configuration validations'],
      resolved: false
    };
  }

  generateIncidentSummary(incidentId: string) {
    const info = this.getScenarioInfo();
    return {
      incidentId: incidentId || info.incidentId,
      summary: info.summary
    };
  }

  getRootCauseAnalysis(incidentId: string) {
    const info = this.getScenarioInfo();
    return {
      incidentId: incidentId || info.incidentId,
      rootCause: info.rootCause
    };
  }

  getEvidenceTimeline(incidentId: string) {
    const info = this.getScenarioInfo();
    return {
      incidentId: incidentId || info.incidentId,
      timeline: info.timeline
    };
  }

  getRecommendedActions(incidentId: string) {
    const info = this.getScenarioInfo();
    return {
      incidentId: incidentId || info.incidentId,
      actions: info.actions
    };
  }

  getResolutionStatus(incidentId: string) {
    const info = this.getScenarioInfo();
    return {
      incidentId: incidentId || info.incidentId,
      resolved: info.resolved
    };
  }
}

