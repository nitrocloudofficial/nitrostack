'use client';

import React from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import TxnTimeline from '../../../../widgets/txn-timeline/index';
import type { TxnTimelineData } from '../../../../widgets/txn-timeline/normalize';

export const dynamic = 'force-dynamic';

export default function TxnTimelinePage() {
  const { isReady, toolOutput, theme, getToolOutput } = useWidgetSDK();

  // `toolOutput` (the reactive property) is the RAW, unparsed MCP response
  // wrapper (e.g. { content: [{ type: 'text', text: '...' }] }) — not the
  // tool's actual return value. Using it directly crashed normalize() on
  // every real call. getToolOutput() runs the SDK's actual extraction
  // (structuredContent / content-array JSON parsing); `toolOutput` is kept
  // here only as a reactive dependency so the widget re-renders on new data
  // (e.g. on txn.step.compensated).
  const data = React.useMemo(() => getToolOutput<TxnTimelineData>(), [toolOutput, getToolOutput]);

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      {!isReady || !data ? (
        <div className="p-10 text-center text-[13px] text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-950">
          Loading transaction timeline…
        </div>
      ) : (
        <TxnTimeline data={data} />
      )}
    </div>
  );
}
