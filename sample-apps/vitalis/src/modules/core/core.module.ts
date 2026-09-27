import { Module } from '@nitrostack/core';
import { CoreResources } from './core.resources.js';
import { CorePrompts } from './core.prompts.js';
import { AuditStore } from '../../gateway/audit.store.js';
import { MetricsStore } from '../../gateway/metrics.store.js';
import { ApiKeyGuard } from '../../gateway/api-key.guard.js';
import { ScopeGuard } from '../../gateway/scope.guard.js';
import { EmergencyDetectionGuard } from '../../gateway/emergency-detection.guard.js';
import { ClinicalSafetyInterceptor } from '../../gateway/clinical-safety.interceptor.js';
import { AuditLogInterceptor } from '../../gateway/audit-log.interceptor.js';
import { TimingInterceptor } from '../../gateway/timing.interceptor.js';
import { ClinicalExceptionFilter } from '../../gateway/clinical-exception.filter.js';
import { TrimPipe } from '../../gateway/trim.pipe.js';

@Module({
  name: 'core',
  description: 'Core module — system resources (vitalis://) and prompt templates',
  controllers: [CoreResources, CorePrompts],
  providers: [
    AuditStore,
    MetricsStore,
    ApiKeyGuard,
    ScopeGuard,
    EmergencyDetectionGuard,
    ClinicalSafetyInterceptor,
    AuditLogInterceptor,
    TimingInterceptor,
    ClinicalExceptionFilter,
    TrimPipe,
  ],
  exports: [AuditStore, MetricsStore],
})
export class CoreModule {}
