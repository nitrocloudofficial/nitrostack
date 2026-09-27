import { eventBus } from '../../infrastructure/eventBus/index.js';
import { logger } from '../../infrastructure/logger/index.js';
import { wsManager } from '../../infrastructure/websocket/index.js';

export function initializeDomainEvents() {
  eventBus.on('TaskCreated', (data) => {
    logger.info({ data }, '[DomainEvent] Task Created');
    wsManager.broadcast('TASK_CREATED', data);
  });

  eventBus.on('TaskCompleted', (data) => {
    logger.info({ data }, '[DomainEvent] Task Completed');
    wsManager.broadcast('TASK_COMPLETED', data);
  });

  eventBus.on('RiskDetected', (data) => {
    logger.info({ data }, '[DomainEvent] Risk Detected');
    wsManager.broadcast('RISK_DETECTED', data);
  });

  eventBus.on('WorkflowExecuted', (data) => {
    logger.info({ data }, '[DomainEvent] Workflow Executed');
    wsManager.broadcast('WORKFLOW_EXECUTED', data);
  });

  eventBus.on('ApprovalGranted', (data) => {
    logger.info({ data }, '[DomainEvent] Approval Granted');
    wsManager.broadcast('APPROVAL_GRANTED', data);
  });
}
