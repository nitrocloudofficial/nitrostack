/**
 * Copyright 2025 Nitrostack Inc
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import { describeOutcome } from './format.js';
import { parseToolResult } from './tool-result.js';
import type { Snapshot, ToolOutcome } from './types.js';

const POLL_INTERVAL_MS = 4000;

/**
 * Live team snapshot plus a helper to call tools.
 *
 * The snapshot is polled so decisions made by agents appear without a reload. Responses
 * that arrive out of order are dropped.
 */
export function useCloudOps() {
  const { sdk, isReady, toolOutput } = useWidgetSDK();
  const [data, setData] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const sequence = useRef(0);

  const refresh = useCallback(async () => {
    const ticket = ++sequence.current;
    const snapshot = parseToolResult(await sdk.callTool('get_cloudops_snapshot', {}));
    if (!snapshot.settings) throw new Error('Dashboard snapshot unavailable');
    if (ticket === sequence.current) setData(snapshot);
  }, [sdk]);

  const reload = useCallback(
    () => refresh().catch((e) => setMessage(e.message)),
    [refresh]
  );

  useEffect(() => {
    if (!isReady) return;
    void reload();
    const timer = setInterval(reload, POLL_INTERVAL_MS);
    return () => {
      clearInterval(timer);
      sequence.current++;
    };
  }, [reload, isReady]);

  /**
   * Calls a tool, reports its outcome in the status line and refreshes the snapshot.
   * Resolves to the tool result, or `null` if the call failed.
   */
  const callTool = useCallback(
    async (tool: string, args: Record<string, unknown>): Promise<ToolOutcome | null> => {
      setBusy(true);
      try {
        const result: ToolOutcome = parseToolResult(await sdk.callTool(tool, args));
        setMessage(describeOutcome(result));
        await refresh();
        return result;
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Request failed');
        return null;
      } finally {
        setBusy(false);
      }
    },
    [sdk, refresh]
  );

  /**
   * Calls a read-only tool (such as `simulate_policy`) and returns its result without
   * touching the status line or the snapshot. Errors are still reported.
   */
  const query = useCallback(
    async <T,>(tool: string, args: Record<string, unknown>): Promise<T | null> => {
      setBusy(true);
      try {
        return parseToolResult(await sdk.callTool(tool, args)) as T;
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Request failed');
        return null;
      } finally {
        setBusy(false);
      }
    },
    [sdk]
  );

  return {
    isReady,
    /** Latest snapshot, falling back to the output of the tool that opened the widget. */
    snapshot: data ?? (toolOutput as Snapshot | null),
    busy,
    message,
    reload,
    callTool,
    query,
  };
}
