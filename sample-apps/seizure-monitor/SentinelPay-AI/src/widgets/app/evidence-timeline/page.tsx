'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { EvidenceTimeline } from '../../EvidenceTimeline';
import type { EvidenceTimelineProps } from '../../EvidenceTimeline/types';

/**
 * Widget page for evidence display.
 *
 * Not currently attached to any tool's `widget: { route }` — evidence is
 * only exposed read-only via the `investigation://{caseId}` resource, and
 * `widget: { route }` only attaches to a Tool in this SDK version (see
 * src/index.ts). This page still renders correctly in NitroStack Studio
 * previews, which feed the `widget-manifest.json` examples through
 * `getToolOutput()` when there's no live tool invocation.
 */
export default function EvidenceTimelinePage() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const data = getToolOutput<EvidenceTimelineProps>();

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
        Loading evidence…
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <EvidenceTimeline caseId={data.caseId} evidence={data.evidence} />
    </div>
  );
}
