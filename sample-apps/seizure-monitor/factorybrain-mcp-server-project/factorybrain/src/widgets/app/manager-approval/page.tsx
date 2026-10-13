'use client';
import { useMemo, useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import { ManagerApprovalPanel } from '../../components/widgets/ManagerApprovalPanel';
import { approvalView } from '../../utils/adapters';

export default function Page() {
  const { sdk, isReady, toolOutput } = useWidgetSDK();
  const output = toolOutput as any;
  const initial = useMemo(() => approvalView(Array.isArray(output) ? output[0] : output?.approval ?? output), [output]);
  const [data, setData] = useState(initial);
  const identity = output?.auth?.subject ?? output?.managerIdentity;
  if (!isReady) return <p role="status">Waiting for the NitroStack Widget SDK…</p>;
  return <ManagerApprovalPanel data={data} managerIdentity={identity} onDecision={async (action, reason) => {
    if (!data || !identity) throw new Error('Authenticated Manager identity required');
    await sdk.waitForReady(15_000);
    const response = await sdk.callTool('decide_manager_approval', { approvalId: data.approvalId, action, decidedBy: identity, comments: reason });
    if (response.isError) throw new Error(response.result || 'Decision failed');
    setData(approvalView((response.structuredContent as any)?.approval ?? response.structuredContent));
  }} />;
}
