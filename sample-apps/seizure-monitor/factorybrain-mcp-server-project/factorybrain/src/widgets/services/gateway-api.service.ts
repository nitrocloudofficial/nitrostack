import { widgetRuntimeConfig } from './runtime-config';

type CallToolResponse = { isError?: boolean; result?: string; structuredContent?: unknown };
type CallTool = (name: string, input: Record<string, unknown>) => Promise<CallToolResponse>;
type WaitUntilReady = () => Promise<void>;

export class GatewayApiService {
  readonly gatewayUrl = widgetRuntimeConfig.gatewayUrl;

  constructor(private readonly callTool: CallTool, private readonly waitUntilReady: WaitUntilReady) {}

  private async invoke<T>(name: string, input: Record<string, unknown>): Promise<T> {
    await this.waitUntilReady();
    const response = await this.callTool(name, input);
    if (response.isError) throw new Error(response.result || 'FactoryBrain gateway request failed');
    return response.structuredContent as T;
  }

  getMachineHealth(machineId: string) { return this.invoke<any>('get_machine', { machineId }); }
  getInventory() { return this.invoke<any[]>('list_items', {}); }
  getSuppliers(partName: string) { return this.invoke<any[]>('find_suppliers', { partName }); }
  getProductionPlans() { return this.invoke<any[]>('list_production_plans', {}); }
  getApprovals() { return this.invoke<any[]>('list_approval_requests', {}); }
  getWorkflows() { return this.invoke<any[]>('list_monitored_workflows', {}); }
  getNotifications(workflowId: string) { return this.invoke<any[]>('list_notifications', { workflowId }); }
  getAlerts(workflowId: string) { return this.invoke<any[]>('list_monitoring_alerts', { workflowId }); }
  approveRequest(approvalId: string, decidedBy: string, comments = '') { return this.invoke<any>('decide_manager_approval', { approvalId, action: 'Approve', decidedBy, comments }); }
  rejectRequest(approvalId: string, decidedBy: string, comments: string) { return this.invoke<any>('decide_manager_approval', { approvalId, action: 'Reject', decidedBy, comments }); }
  requestChanges(approvalId: string, decidedBy: string, comments: string) { return this.invoke<any>('decide_manager_approval', { approvalId, action: 'Request Changes', decidedBy, comments }); }
}
