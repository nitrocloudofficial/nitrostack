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
import { Approvals } from '../../components/Approvals.js';
import { AuditLog } from '../../components/AuditLog.js';
import { Infrastructure } from '../../components/Infrastructure.js';
import { Overview } from '../../components/Overview.js';
import { Policies } from '../../components/Policies.js';
import { ResetControls } from '../../components/ResetControls.js';
import type { Action } from '../../lib/types.js';
import { useCloudOps } from '../../lib/use-cloudops.js';
import { GPU_REQUEST, nextStep } from '../../lib/walkthrough.js';
import '../globals.css';

const TABS = ['Overview', 'Infrastructure', 'Policies', 'Approvals', 'Audit logs'] as const;
type Tab = (typeof TABS)[number];

function Dashboard() {
  const { isReady, snapshot: view, busy, message, reload, callTool, query } = useCloudOps();
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
    void action('provision_instance', { ...GPU_REQUEST, region: step === 3 ? 'Singapore' : 'Mumbai' });
  };

  if (!view?.settings) {
    return (
      <main>
        <h1>CloudOps Guardian</h1>
        <p role="status">{message || 'Connecting to the MCP server…'}</p>
        {isReady && <button onClick={reload}>Retry connection</button>}
      </main>
    );
  }

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
        {TABS.map((t) => (
          <button key={t} aria-current={tab === t ? 'page' : undefined} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>

      <p role="status" aria-live="polite">
        {busy ? 'Working…' : message}
      </p>

      {tab === 'Overview' && (
        <Overview data={view} step={step} busy={busy} onAdvance={advanceWalkthrough} />
      )}
      {tab === 'Infrastructure' && <Infrastructure data={view} />}
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
