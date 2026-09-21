import { EventBus } from './event-bus.js';
import { StateManager } from './state-manager.js';
import { HealthManager } from './health-manager.js';

export type LifecycleState =
  | 'created'
  | 'initializing'
  | 'running'
  | 'stopping'
  | 'stopped';

export interface KernelStatus {
  state: LifecycleState;
  version: string;
  uptime: number;
  health: ReturnType<HealthManager['getAllStatuses']>;
}

export class EnterpriseKernel {
  static readonly VERSION = '1.0.0';

  readonly eventBus = new EventBus();
  readonly stateManager = new StateManager();
  readonly healthManager = new HealthManager();

  private state: LifecycleState = 'created';
  private startTime?: Date;

  async initialize(): Promise<void> {
    this.state = 'initializing';
    this.healthManager.register('kernel');
    this.healthManager.register('pipeline');
    this.healthManager.register('llm');
    this.healthManager.update('kernel', 'healthy');
    this.state = 'running';
    this.startTime = new Date();
    await this.eventBus.publish('kernel.started', {
      version: EnterpriseKernel.VERSION,
    });
  }

  async shutdown(): Promise<void> {
    this.state = 'stopping';
    await this.eventBus.publish('kernel.stopping', {});
    this.state = 'stopped';
  }

  getStatus(): KernelStatus {
    return {
      state: this.state,
      version: EnterpriseKernel.VERSION,
      uptime: this.startTime
        ? Date.now() - this.startTime.getTime()
        : 0,
      health: this.healthManager.getAllStatuses(),
    };
  }

  isRunning(): boolean {
    return this.state === 'running';
  }
}
