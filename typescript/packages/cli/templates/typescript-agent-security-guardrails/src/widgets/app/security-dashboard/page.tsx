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
import { useState } from 'react';
import { WidgetLayout } from '@nitrostack/widgets';
import { dateTime } from '../../lib/format.js';
import { Approvals } from '../../components/Approvals.js';
import { AuditLog } from '../../components/AuditLog.js';
import { Inventory } from '../../components/Inventory.js';
import { Overview } from '../../components/Overview.js';
import { Policies } from '../../components/Policies.js';
import { ResetControls } from '../../components/ResetControls.js';
import type { Action } from '../../lib/types.js';
import { useSecurity } from '../../lib/use-security.js';
import { JOB_REQUEST, nextStep } from '../../lib/walkthrough.js';
import '../globals.css';

const TABS = ['Overview', 'Inventory', 'Policies', 'Approvals', 'Audit logs'] as const;
type Tab = (typeof TABS)[number];

function Dashboard() {
  const { isReady, snapshot: view, busy, message, reload, callTool, query } = useSecurity();
  const [tab, setTab] = useState<Tab>('Overview');
  const [step, setStep] = useState(0);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const action: Action = async (tool, args) => {
    const result = await callTool(tool, args);
    if (!result) return;

    const next = nextStep(step, tool, args, result);
    setStep(next);
    if (tool === 'reset_demo') {
      setTab('Overview');
      setConfirmingReset(false);
    }
    // After the quota edit, return to the walkthrough.
    if (step === 1 && next === 2) setTab('Overview');
  };

  const advanceWalkthrough = () => {
    if (step === 1) return setTab('Policies');
    if (step === 4) return setTab('Audit logs');
    void action('run_outbound_job', { ...JOB_REQUEST, destination: step === 3 ? 'unapproved_external' : JOB_REQUEST.destination });
  };

  if (!view?.settings) {
    return (
      <main>
        <h1>Agent Security Control Room</h1>
        <p role="status">{message || 'Connecting to the MCP server…'}</p>
        {isReady && <button onClick={reload}>Retry connection</button>}
      </main>
    );
  }

  return (
    <main>
      <header>
        <div>
          <small>Agent action simulator</small>
          <h1>Agent Security Control Room</h1>
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
        {TABS.map((t) => (
          <button key={t} aria-current={tab === t ? 'page' : undefined} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>

      {view.externalChange && (
        <p role="note" className="external-change">
          Policy v{view.revision} was changed at runtime by {view.externalChange.by} via{' '}
          {view.externalChange.source} · {dateTime(view.externalChange.at)}. No redeploy needed.
        </p>
      )}

      <p role="status" aria-live="polite">
        {busy ? 'Working…' : message}
      </p>

      {tab === 'Overview' && (
        <Overview data={view} step={step} busy={busy} onAdvance={advanceWalkthrough} />
      )}
      {tab === 'Inventory' && <Inventory data={view} />}
      {tab === 'Policies' && (
        // Re-mount on a new revision so the form shows the saved settings.
        <Policies
          key={view.team + '-' + view.revision}
          data={view}
          action={action}
          query={query}
          busy={busy}
        />
      )}
      {tab === 'Approvals' && <Approvals data={view} action={action} busy={busy} />}
      {tab === 'Audit logs' && <AuditLog data={view} />}

      {view.canEdit && (
        <ResetControls
          busy={busy}
          confirming={confirmingReset}
          onConfirmingChange={setConfirmingReset}
          onReset={() => action('reset_demo', {})}
        />
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
