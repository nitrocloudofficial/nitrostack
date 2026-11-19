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

'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { WidgetLayout, useWidgetSDK, type CallToolResponse } from '@nitrostack/widgets';
import {
  Approvals,
  Audit,
  Infrastructure,
  money,
  Policies,
  type Snapshot,
} from '../../components/sections.js';
import '../globals.css';

const tabs = ['Overview', 'Infrastructure', 'Policies', 'Approvals', 'Audit logs'] as const;
const request = {
  region: 'Mumbai',
  machine: 'accelerated',
  cpu: 1,
  memory: 4,
  gpu: 1,
  count: 8,
  environment: 'development',
  workload: 'ML training',
};
function unpack(response: CallToolResponse) {
  const text = response.result ?? (response as { content?: { text: string }[] }).content?.[0]?.text;
  if (response.isError) throw new Error(text || 'Tool call failed');
  if (response.structuredContent && typeof response.structuredContent === 'object') {
    if (
      'content' in response.structuredContent &&
      typeof response.structuredContent.content === 'string'
    )
      throw new Error(response.structuredContent.content);
    return response.structuredContent;
  }
  if (!text) throw new Error('The server returned an empty result');
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(text);
  }
}
function Dashboard() {
  const { sdk, isReady, toolOutput } = useWidgetSDK();
  const [data, setData] = useState<Snapshot | null>(null),
    [tab, setTab] = useState<(typeof tabs)[number]>('Overview');
  const [busy, setBusy] = useState(false),
    [message, feedback] = useState(''),
    [step, setStep] = useState(0);
  const [confirmReset, confirm] = useState(false);
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const ticket = ++sequence.current;
    const snapshot = unpack(await sdk.callTool('get_cloudops_snapshot', {}));
    if (!snapshot.settings) throw new Error('Dashboard snapshot unavailable');
    if (ticket === sequence.current) setData(snapshot);
  }, [sdk]);
  useEffect(() => {
    if (!isReady) return;
    const load = () => refresh().catch((e) => feedback(e.message));
    void load();
    const timer = setInterval(load, 4000);
    return () => {
      clearInterval(timer);
      sequence.current++;
    };
  }, [refresh, isReady]);
  const view = data ?? (toolOutput as Snapshot | null);
  async function action(tool: string, args: Record<string, unknown>) {
    setBusy(true);
    try {
      const result = unpack(await sdk.callTool(tool, args));
      feedback(
        [
          result.decision ?? result.status ?? 'Saved',
          result.reason,
          result.executionError,
          result.revision && 'revision ' + result.revision,
        ]
          .filter(Boolean)
          .join(' · ')
      );
      await refresh();
      if (tool === 'reset_demo') {
        setStep(0);
        setTab('Overview');
        confirm(false);
      }
      if (tool === 'provision_instance' && result.decision === 'REQUIRE_APPROVAL' && step === 0)
        setStep(1);
      if (
        tool === 'update_policy' &&
        step === 1 &&
        (args.settings as Snapshot['settings']).gpu === 8
      ) {
        setStep(2);
        setTab('Overview');
      }
      if (tool === 'provision_instance' && result.executed && step === 2) setStep(3);
      if (tool === 'provision_instance' && result.decision === 'BLOCK' && step === 3) setStep(4);
    } catch (e) {
      feedback(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }
  if (!view?.settings)
    return (
      <main>
        <h1>CloudOps Guardian</h1>
        <p role="status">{message || 'Connecting to the MCP server…'}</p>
        {isReady && (
          <button onClick={() => refresh().catch((e) => feedback(e.message))}>
            Retry connection
          </button>
        )}
      </main>
    );
  const r = view.resources;
  const metrics = [
    ['Instances', r.filter((x) => x.type === 'instance').reduce((n, x) => n + x.count, 0)],
    ['Deployments', r.filter((x) => x.type === 'deployment' && x.status === 'running').length],
    ['vCPU', r.reduce((n, x) => n + x.cpu * x.count, 0)],
    ['RAM (GB)', r.reduce((n, x) => n + x.memory * x.count, 0)],
    ['GPU utilization', r.some((x) => x.gpu) ? '65%' : '0%'],
    ['Monthly spend', money(view.monthly)],
    ['Pending review', view.approvals.filter((a) => a.status === 'pending').length],
  ];
  return (
    <main>
      <header>
        <div>
          <small>Infrastructure simulator</small>
          <h1>CloudOps Guardian</h1>
        </div>
        <div>
          {view.name}
          <br />
          <small>
            {view.actor} · policy v{view.revision}
          </small>
        </div>
      </header>
      <nav aria-label="Dashboard sections">
        {tabs.map((t) => (
          <button key={t} aria-current={tab === t ? 'page' : undefined} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>
      <p role="status" aria-live="polite">
        {busy ? 'Working…' : message}
      </p>
      {tab === 'Overview' && (
        <>
          <div className="metrics">
            {metrics.map(([k, v]) => (
              <article key={k}>
                <small>{k}</small>
                <b>{v}</b>
              </article>
            ))}
          </div>
          {view.team === 'ml' && (
            <section className="demo">
              <h2>GPU walkthrough</h2>
              <p>
                {
                  [
                    'Request eight GPUs in Mumbai. The current immediate quota is ' +
                      view.settings.gpu +
                      '.',
                    'Open Policies, set Immediate GPUs to 8 and save.',
                    'Retry the original Mumbai request with the same arguments.',
                    'Try the same workload in Singapore.',
                    'Inspect the decisions and policy revisions in the audit log.',
                  ][step]
                }
              </p>
              <button
                disabled={busy}
                onClick={() =>
                  step === 1
                    ? setTab('Policies')
                    : step === 4
                      ? setTab('Audit logs')
                      : action('provision_instance', {
                          ...request,
                          region: step === 3 ? 'Singapore' : 'Mumbai',
                        })
                }
              >
                {
                  [
                    'Request eight GPUs',
                    'Edit GPU quota',
                    'Retry Mumbai request',
                    'Try Singapore',
                    'Inspect audit log',
                  ][step]
                }
              </button>
            </section>
          )}
          <Audit data={view} compact />
        </>
      )}
      {tab === 'Infrastructure' && <Infrastructure data={view} />}
      {tab === 'Policies' && (
        <Policies key={view.team + '-' + view.revision} data={view} action={action} busy={busy} />
      )}
      {tab === 'Approvals' && <Approvals data={view} action={action} busy={busy} />}
      {tab === 'Audit logs' && <Audit data={view} />}
      {view.canEdit && (
        <footer>
          {confirmReset ? (
            <>
              <span>Restore this team’s resources, policy and history?</span>
              <button disabled={busy} onClick={() => action('reset_demo', {})}>
                Restore fixtures
              </button>
              <button onClick={() => confirm(false)}>Cancel</button>
            </>
          ) : (
            <button onClick={() => confirm(true)}>Reset team demo</button>
          )}
        </footer>
      )}
    </main>
  );
}
export default function Page() {
  return (
    <WidgetLayout>
      <Dashboard />
    </WidgetLayout>
  );
}
