import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';

/**
 * Operations Resources
 * 
 * Provides queryable resources for operations state.
 * Currently minimal as most state is managed through diagnostics resources.
 */
export class OperationsResources {
  @Resource({
    uri: 'factory://operations/work-orders',
    name: 'Active Work Orders',
    description: 'Get list of active maintenance work orders',
    mimeType: 'application/json',
  })
  async activeWorkOrders(context: ExecutionContext) {
    context.logger.info('Resource: fetching active work orders');

    // In a real system, this would query a database
    // For now, return a template structure
    const workOrders = {
      total: 0,
      orders: [],
      message: 'Work orders are created dynamically via createMaintenanceWorkOrder tool',
    };

    return {
      type: 'text' as const,
      text: JSON.stringify(workOrders, null, 2),
    };
  }

  @Resource({
    uri: 'factory://operations/notifications',
    name: 'Recent Notifications',
    description: 'Get recent notifications sent to managers',
    mimeType: 'application/json',
  })
  async recentNotifications(context: ExecutionContext) {
    context.logger.info('Resource: fetching recent notifications');

    const notifications = {
      total: 0,
      notifications: [],
      message: 'Notifications are sent dynamically via notifyManager tool',
    };

    return {
      type: 'text' as const,
      text: JSON.stringify(notifications, null, 2),
    };
  }
}
