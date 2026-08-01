'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import { GatewayApiService } from '../../services/gateway-api.service';
import { useFactorySocket } from '../../hooks/useFactorySocket';
import { machineView, inventoryView, supplierView, productionView, approvalView, workflowView } from '../../utils/adapters';
import type { FactoryDashboardState, FactorySocketEvent } from '../../types/factory.types';
import { MachineHealthDashboard } from '../../components/widgets/MachineHealthDashboard';
import { InventoryCard } from '../../components/widgets/InventoryCard';
import { SupplierComparison } from '../../components/widgets/SupplierComparison';
import { ProductionTimeline } from '../../components/widgets/ProductionTimeline';
import { ManagerApprovalPanel } from '../../components/widgets/ManagerApprovalPanel';
import { FactoryKpiDashboard } from '../../components/widgets/FactoryKpiDashboard';

const empty: FactoryDashboardState = {
  machineHealth: null, inventory: null, suppliers: null, productionPlan: null,
  approval: null, workflowKpis: null, connectionStatus: 'connecting',
};

export default function FactoryDashboard() {
  const { sdk, isReady, toolOutput } = useWidgetSDK();
  const seed = toolOutput as any;
  const api = useMemo(
    () => new GatewayApiService((name, args) => sdk.callTool(name, args), () => sdk.waitForReady(15_000)),
    [sdk],
  );
  const [state, setState] = useState<FactoryDashboardState>(empty);
  const [loading, setLoading] = useState(true);
  const workflowId = state.workflowKpis?.workflowId ?? seed?.workflowId;

  const onEvent = useCallback((event: FactorySocketEvent) => {
    setState((current) => {
      if (event.type === 'monitoring.updated' && event.workflow) return { ...current, workflowKpis: workflowView(event.workflow) };
      if (event.type === 'notification.updated' && event.notification) return { ...current, workflowKpis: current.workflowKpis ? { ...current.workflowKpis, updatedAt: event.notification.updatedAt } : null };
      if (event.eventType === 'machine.telemetry.updated' || event.eventType === 'machine.alert.created') return { ...current, machineHealth: machineView(event.payload?.machine ?? current.machineHealth, event.payload?.alert) };
      return current;
    });
  }, []);
  const connection = useFactorySocket(workflowId, onEvent);
  useEffect(() => setState((current) => ({ ...current, connectionStatus: connection })), [connection]);

  useEffect(() => {
    if (!isReady) return;
    const controller = new AbortController();
    setLoading(true);
    setState((current) => ({ ...current, error: undefined }));
    (async () => {
      try {
        await sdk.waitForReady(15_000);
        const workflows = await api.getWorkflows();
        const workflow = (workflows ?? []).at(-1) ?? seed?.workflow ?? seed;
        const kpi = workflowView(workflow);
        const machine = kpi?.machineId ? await api.getMachineHealth(kpi.machineId) : null;
        const inventory = await api.getInventory();
        const item = (inventory ?? []).at(-1);
        const [plans, approvals] = await Promise.all([api.getProductionPlans(), api.getApprovals()]);
        const partName = item?.partName;
        const suppliers = partName ? await api.getSuppliers(partName) : [];
        if (!controller.signal.aborted) setState((current) => ({
          ...current, workflowKpis: kpi, machineHealth: machineView(machine), inventory: inventoryView(item),
          suppliers: partName ? supplierView(suppliers, item?.partId) : null,
          productionPlan: productionView((plans ?? []).at(-1)),
          approval: approvalView((approvals ?? []).find((approval: any) => approval.status === 'Pending') ?? (approvals ?? []).at(-1)),
        }));
      } catch (error) {
        if (!controller.signal.aborted) setState((current) => ({ ...current, error: error instanceof Error ? error.message : String(error) }));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [api, isReady, sdk, seed]);

  const identity = seed?.auth?.subject ?? seed?.managerIdentity;
  const decide = async (action: 'Approve' | 'Reject' | 'Request Changes', reason: string) => {
    if (!isReady) throw new Error('Widget SDK is still initializing');
    const approval = state.approval;
    if (!approval) throw new Error('Approval unavailable');
    if (!identity) throw new Error('Authenticated Manager identity is required');
    const response = action === 'Approve'
      ? await api.approveRequest(approval.approvalId, identity, reason)
      : action === 'Reject'
        ? await api.rejectRequest(approval.approvalId, identity, reason)
        : await api.requestChanges(approval.approvalId, identity, reason);
    setState((current) => ({ ...current, approval: approvalView(response.approval ?? response) }));
  };

  return <main style={{ background: '#f8fafc', minHeight: '100vh', padding: 20, color: '#0f172a' }}>
    <div style={{ maxWidth: 1200, margin: 'auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div><small>FACTORYBRAIN</small><h1 style={{ marginTop: 4 }}>Factory Recovery Dashboard</h1></div>
        <span aria-live="polite">{connection === 'connected' ? '● Live' : connection}</span>
      </header>
      {!isReady && <p role="status">Waiting for the NitroStack Widget SDK…</p>}
      {isReady && loading && <p role="status">Loading current factory snapshot…</p>}
      {state.error && <p role="alert" style={{ color: '#dc2626' }}>Gateway error: {state.error}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(330px,1fr))', gap: 16 }}>
        <MachineHealthDashboard data={state.machineHealth} disconnected={connection !== 'connected'} />
        <InventoryCard data={state.inventory} />
      </div>
      <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
        <SupplierComparison data={state.suppliers} />
        <ProductionTimeline data={state.productionPlan} />
        <ManagerApprovalPanel data={state.approval} managerIdentity={identity} onDecision={decide} />
        <FactoryKpiDashboard data={state.workflowKpis} />
      </div>
    </div>
  </main>;
}
