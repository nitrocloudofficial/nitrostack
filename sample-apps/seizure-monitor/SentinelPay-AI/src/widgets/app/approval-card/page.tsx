'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { ApprovalCard } from '../../ApprovalCard';

/**
 * Widget page for the `prepareApproval` tool.
 *
 * `prepareApproval`'s locked output shape (§5.8) is only
 * `{ caseId, status, recommendation, riskScore }` — it deliberately does
 * NOT include `transactionId` or `riskLevel`. Rather than touch that
 * spec-locked tool output, this page widens its own local type to make
 * those two fields optional and falls back to a placeholder when they're
 * absent (e.g. when a caller invokes this tool directly rather than via
 * the full calculateRisk -> prepareApproval chain).
 */
interface ApprovalToolOutput {
  caseId: string;
  status: 'WAITING_FOR_HUMAN_APPROVAL' | 'APPROVED' | 'DENIED';
  recommendation: 'RELEASE' | 'HOLD';
  riskScore: number;
  transactionId?: string;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export default function ApprovalCardPage() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<ApprovalToolOutput>();

  if (!data) {
    return (
      <div
        style={{
          padding: 24,
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
          color: theme === 'dark' ? '#fff' : '#000',
        }}
      >
        Loading approval request…
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <ApprovalCard
        caseId={data.caseId}
        transactionId={data.transactionId ?? '—'}
        riskScore={data.riskScore}
        riskLevel={data.riskLevel ?? 'HIGH'}
        recommendation={data.recommendation}
        status={data.status}
      />
    </div>
  );
}
