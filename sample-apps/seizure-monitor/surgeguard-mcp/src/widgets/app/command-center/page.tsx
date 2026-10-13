'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import { WidgetShell, statusClass } from '../../components/widget-shell';

type PlanChoice = 'balanced_decompression' | 'fast_capacity_release' | 'transfer_first';

interface ScenarioDraft {
  arrivals: number;
  queueCompletions: number;
  rnChange: number;
  bedsCleaned: number;
  discharges: number;
}

interface CommandSnapshot {
  view_type: 'command_center';
  simulation_tick: number;
  last_event: string;
  incident: {
    incident: {
      name: string;
    };
  };
  capacity: {
    summary: {
      occupied: number;
      staffed_capacity: number;
      available: number;
      cleaning: number;
      occupancy_percent: number;
    };
  };
  queue: {
    system_pressure: {
      status: string;
      score: number;
      active_patients: number;
      service_level_breaches: number;
      longest_wait_minutes: number;
    };
  };
  staffing: {
    gaps: Array<{
      role: string;
      count: number;
      reason: string;
    }>;
  };
  planning: {
    comparison: Array<{
      candidate_plan_id: string;
      name: string;
      gate_status: string;
    }>;
    dominance: {
      preferred_plan_id: string;
    };
  };
  policy_gates: Record<PlanChoice, {
    status: string;
  }>;
  selected_plan: PlanChoice | null;
  execution: {
    execution: {
      status: string;
      progress_percent: number;
    };
  };
}

const PLAN_IDS: Record<PlanChoice, string> = {
  balanced_decompression: '98c9b7f2-a9ce-49a9-97d2-b39e181c51d3',
  fast_capacity_release: '549f6a4a-d7b7-4ea6-9af7-7f0c046b5dc7',
  transfer_first: '1ec26f84-6642-4bb2-aa45-afc05bf2decb',
};

const fallback: CommandSnapshot = {
  view_type: 'command_center',
  simulation_tick: 0,
  last_event: 'baseline',
  incident: {
    incident: {
      name: 'Metro respiratory surge',
    },
  },
  capacity: {
    summary: {
      occupied: 269,
      staffed_capacity: 316,
      available: 19,
      cleaning: 18,
      occupancy_percent: 85.1,
    },
  },
  queue: {
    system_pressure: {
      status: 'strained',
      score: 78,
      active_patients: 73,
      service_level_breaches: 42,
      longest_wait_minutes: 244,
    },
  },
  staffing: {
    gaps: [
      { role: 'Emergency RN', count: 3, reason: 'Below policy minimum' },
      { role: 'Respiratory Therapist', count: 1, reason: 'Qualification coverage gap' },
      { role: 'Hospitalist', count: 1, reason: 'Shift vacancy' },
    ],
  },
  planning: {
    comparison: [
      {
        candidate_plan_id: PLAN_IDS.balanced_decompression,
        name: 'Balanced decompression',
        gate_status: 'conditional',
      },
      {
        candidate_plan_id: PLAN_IDS.fast_capacity_release,
        name: 'Fast capacity release',
        gate_status: 'blocked',
      },
      {
        candidate_plan_id: PLAN_IDS.transfer_first,
        name: 'Transfer-first',
        gate_status: 'clear',
      },
    ],
    dominance: {
      preferred_plan_id: PLAN_IDS.balanced_decompression,
    },
  },
  policy_gates: {
    balanced_decompression: { status: 'conditional' },
    fast_capacity_release: { status: 'blocked' },
    transfer_first: { status: 'clear' },
  },
  selected_plan: null,
  execution: {
    execution: {
      status: 'queued',
      progress_percent: 0,
    },
  },
};

function parseSnapshot(value: unknown): CommandSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (record.view_type === 'command_center') return record as unknown as CommandSnapshot;

  for (const key of ['structuredContent', 'data', 'result']) {
    const nested = parseSnapshot(record[key]);
    if (nested) return nested;
  }

  if (Array.isArray(record.content)) {
    for (const item of record.content) {
      if (!item || typeof item !== 'object') continue;
      const text = (item as Record<string, unknown>).text;
      if (typeof text !== 'string') continue;
      try {
        const nested = parseSnapshot(JSON.parse(text));
        if (nested) return nested;
      } catch {
        // Ignore non-JSON tool content and retain the last valid snapshot.
      }
    }
  }

  return null;
}

function planChoiceFromId(planId: string): PlanChoice | null {
  const match = (Object.entries(PLAN_IDS) as Array<[PlanChoice, string]>)
    .find(([, id]) => id === planId);
  return match?.[0] ?? null;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(
    minimum,
    Math.min(maximum, Number.isFinite(value) ? Math.round(value) : minimum),
  );
}

function readableEvent(value: string) {
  const labels: Record<string, string> = {
    baseline: 'Baseline state',
    arrival_spike: 'Arrival update',
    staff_callout: 'Staffing update',
    beds_cleaned: 'Bed availability update',
    discharge_wave: 'Discharge update',
    custom_scenario: 'Operational update',
  };
  return labels[value] ?? value.replaceAll('_', ' ');
}

export default function CommandCenter() {
  const sdk = useWidgetSDK();
  const [snapshot, setSnapshot] = useState<CommandSnapshot>(
    () => parseSnapshot(sdk.getToolOutput()) ?? fallback,
  );
  const [scenario, setScenario] = useState<ScenarioDraft>({
    arrivals: 0,
    queueCompletions: 0,
    rnChange: 0,
    bedsCleaned: 0,
    discharges: 0,
  });
  const [busy, setBusy] = useState(false);
  const [openingTool, setOpeningTool] = useState<string | null>(null);
  const [message, setMessage] = useState(
    'Live monitoring is active. Enter a confirmed operational change only when conditions change.',
  );
  const refreshInFlight = useRef(false);
  const refreshCallTool = useRef(sdk.callTool);
  refreshCallTool.current = sdk.callTool;

  useEffect(() => {
    const next = parseSnapshot(sdk.toolOutput);
    if (next) setSnapshot(next);
  }, [sdk.toolOutput]);

  useEffect(() => {
    if (!sdk.isReady || busy) return;
    let cancelled = false;

    const refresh = async () => {
      if (refreshInFlight.current || document.visibilityState === 'hidden') return;
      refreshInFlight.current = true;
      try {
        const result = await refreshCallTool.current('surge_command_center', {
          action: 'view',
          priority: 'balanced',
        });
        const next = parseSnapshot(result);
        if (!cancelled && next) setSnapshot(next);
      } catch {
        // A transient refresh failure must not blank the operational view.
      } finally {
        refreshInFlight.current = false;
      }
    };

    const timer = window.setInterval(refresh, 1_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [busy, sdk.isReady]);

  const capacity = snapshot.capacity.summary;
  const pressure = snapshot.queue.system_pressure;
  const totalGap = snapshot.staffing.gaps.reduce((sum, gap) => sum + gap.count, 0);
  const preferredPlan =
    planChoiceFromId(snapshot.planning.dominance.preferred_plan_id) ??
    'balanced_decompression';
  const selectedPlan = snapshot.selected_plan ?? preferredPlan;
  const selectedGate = snapshot.policy_gates[selectedPlan] ?? { status: 'not evaluated' };
  const execution = snapshot.execution.execution;
  const preferredPlanName =
    snapshot.planning.comparison.find(
      (plan) => plan.candidate_plan_id === PLAN_IDS[preferredPlan],
    )?.name ?? 'Review available plans';
  const scenarioChangeCount =
    scenario.arrivals +
    scenario.queueCompletions +
    Math.abs(scenario.rnChange) +
    scenario.bedsCleaned +
    scenario.discharges;

  const commandStatus = useMemo(() => {
    if (pressure.status === 'critical' || totalGap >= 4) return 'critical';
    if (pressure.status === 'strained' || capacity.occupancy_percent >= 85) return 'strained';
    return 'normal';
  }, [capacity.occupancy_percent, pressure.status, totalGap]);

  const capacityStatus =
    capacity.occupancy_percent >= 92
      ? 'critical'
      : capacity.occupancy_percent >= 85
        ? 'strained'
        : 'normal';
  const staffingStatus = totalGap >= 4 ? 'critical' : totalGap > 0 ? 'strained' : 'normal';
  const flowStatus = pressure.status === 'watch' ? 'normal' : pressure.status;
  const staffingRoles = snapshot.staffing.gaps.map((gap) => gap.role).join(', ');

  const changeSummary = [
    scenario.arrivals
      ? `${scenario.arrivals} new patient arrival${scenario.arrivals === 1 ? '' : 's'}`
      : null,
    scenario.queueCompletions
      ? `${scenario.queueCompletions} patient queue step${scenario.queueCompletions === 1 ? '' : 's'} completed`
      : null,
    scenario.rnChange
      ? `${scenario.rnChange > 0 ? 'Add' : 'Remove'} ${Math.abs(scenario.rnChange)} qualified ED RN${Math.abs(scenario.rnChange) === 1 ? '' : 's'}`
      : null,
    scenario.bedsCleaned
      ? `${scenario.bedsCleaned} cleaned bed${scenario.bedsCleaned === 1 ? '' : 's'} returned to service`
      : null,
    scenario.discharges
      ? `${scenario.discharges} patient discharge${scenario.discharges === 1 ? '' : 's'}`
      : null,
  ].filter((item): item is string => item !== null);

  const tools = [
    {
      group: 'Situation',
      name: 'Incident Brief',
      value: `${pressure.active_patients} active patients`,
      description: 'Current incident summary, objectives, owners and next actions.',
      prompt: 'Open the current SurgeGuard incident brief.',
    },
    {
      group: 'Operations',
      name: 'Capacity Board',
      value: `${capacity.occupancy_percent}% staffed occupancy`,
      description: 'Occupied, available, cleaning and unstaffed beds by care area.',
      prompt: 'Open the live SurgeGuard capacity board for all care areas.',
    },
    {
      group: 'Operations',
      name: 'Queue Pressure',
      value: `${pressure.score}/100 pressure`,
      description: 'Patient queues, service breaches and waiting-time distribution.',
      prompt: 'Open the live SurgeGuard queue pressure view.',
    },
    {
      group: 'Operations',
      name: 'Staffing Readiness',
      value: `${totalGap} qualified positions open`,
      description: 'Required versus eligible on-shift coverage and blocking gaps.',
      prompt: 'Open the live SurgeGuard staffing readiness view.',
    },
    {
      group: 'Decision',
      name: 'Plan Comparison',
      value: preferredPlanName,
      description: 'Ranked response options recalculated from the current shared state.',
      prompt: 'Open the live SurgeGuard plan comparison with balanced priority.',
    },
    {
      group: 'Decision',
      name: 'Safety Check',
      value: selectedGate.status.replaceAll('_', ' '),
      description: 'Answers whether the selected plan can be approved now and shows exactly what must be fixed.',
      prompt: `Check whether ${selectedPlan.replaceAll('_', ' ')} can be safely approved right now.`,
    },
    {
      group: 'Decision',
      name: 'Plan Review',
      value: snapshot.selected_plan ? 'Approved plan selected' : 'Approval not recorded',
      description: 'Detailed plan actions, assumptions and approval evidence.',
      prompt: `Open the detailed plan review for ${selectedPlan.replaceAll('_', ' ')}. Do not approve or execute it.`,
    },
    {
      group: 'Execution',
      name: 'Execution Monitor',
      value: `${execution.progress_percent}% · ${execution.status.replaceAll('_', ' ')}`,
      description: 'Approved action progress, observed outcomes and rollback readiness.',
      prompt: 'Open the live SurgeGuard execution monitor.',
    },
  ];

  function updateScenario(field: keyof ScenarioDraft, value: number) {
    const limits: Record<keyof ScenarioDraft, [number, number]> = {
      arrivals: [0, 60],
      queueCompletions: [0, 420],
      rnChange: [-12, 12],
      bedsCleaned: [0, 30],
      discharges: [0, 40],
    };
    const [minimum, maximum] = limits[field];
    setScenario((current) => ({
      ...current,
      [field]: clamp(value, minimum, maximum),
    }));
  }

  async function applyOperationalUpdate() {
    setBusy(true);
    setMessage('Applying the confirmed update across every operational view...');
    try {
      const result = await sdk.callTool('surge_command_center', {
        action: 'apply_scenario',
        priority: 'balanced',
        plan: selectedPlan,
        arrivals: scenario.arrivals,
        queue_completions: scenario.queueCompletions,
        rn_change: scenario.rnChange,
        beds_cleaned: scenario.bedsCleaned,
        discharges: scenario.discharges,
      });
      const next = parseSnapshot(result);
      if (!next) throw new Error('The Command Center returned an invalid state update.');

      setSnapshot(next);
      setScenario({
        arrivals: 0,
        queueCompletions: 0,
        rnChange: 0,
        bedsCleaned: 0,
        discharges: 0,
      });
      setMessage(
        'Update applied. Capacity, queues, staffing, plan rankings and policy gates are synchronized.',
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The operational update failed.');
    } finally {
      setBusy(false);
    }
  }

  async function openConnectedTool(tool: (typeof tools)[number]) {
    setOpeningTool(tool.name);
    setMessage(`Opening ${tool.name}...`);
    try {
      await sdk.sendFollowUpMessage(tool.prompt);
      setMessage(`${tool.name} requested from the connected host.`);
    } catch {
      setMessage(
        `The host did not respond while opening ${tool.name}. Reopen the widget and retry; operational data was not changed.`,
      );
    } finally {
      setOpeningTool(null);
    }
  }

  return (
    <WidgetShell
      eyebrow="Incident command"
      title={snapshot.incident.incident.name}
      subtitle={`${pressure.active_patients} patients are in active queues; ${pressure.service_level_breaches} exceed service targets. ${capacity.occupied} of ${capacity.staffed_capacity} staffed beds are occupied.`}
      status={commandStatus}
      freshness="Shared simulation state · synchronized every second"
      variant="dashboard"
    >
      <section className="cc-sync-strip" id="overview">
        <div className="cc-sync-copy">
          <span className="cc-live-dot" aria-hidden="true" />
          <div>
            <strong>All operational views are synchronized</strong>
            <span>One shared simulated hospital state drives every metric, plan and safety decision.</span>
          </div>
        </div>
        <div className="cc-sync-facts" aria-label="Connection status">
          <span><b>8</b> connected tools</span>
          <span><b>1 second</b> refresh interval</span>
          <span><b>{readableEvent(snapshot.last_event)}</b> last confirmed input</span>
        </div>
      </section>

      <section className="cc-kpis" aria-label="Current operating state">
        <article>
          <span>Staffed bed occupancy</span>
          <strong>{capacity.occupancy_percent}%</strong>
          <small>{capacity.occupied} occupied of {capacity.staffed_capacity} staffed beds</small>
        </article>
        <article>
          <span>Patient-flow pressure</span>
          <strong>{pressure.score}/100</strong>
          <small>{pressure.active_patients} active · {pressure.service_level_breaches} over target</small>
        </article>
        <article>
          <span>Qualified staff shortfall</span>
          <strong>{totalGap}</strong>
          <small>{snapshot.staffing.gaps.length} role{snapshot.staffing.gaps.length === 1 ? '' : 's'} below minimum</small>
        </article>
        <article>
          <span>Beds immediately usable</span>
          <strong>{capacity.available}</strong>
          <small>{capacity.cleaning} additional beds are being cleaned</small>
        </article>
      </section>

      <section className="cc-section cc-status-section">
        <div className="cc-section-heading">
          <div>
            <p className="sg-eyebrow">Current assessment</p>
            <h2>Why the incident is {commandStatus}</h2>
          </div>
          <span>Thresholds are evaluated from the same live state used by specialist tools.</span>
        </div>
        <div className="cc-status-grid">
          <article>
            <div>
              <span>Patient flow</span>
              <span className={statusClass(flowStatus)}>{flowStatus}</span>
            </div>
            <strong>{pressure.score}/100</strong>
            <p>{pressure.active_patients} active patients, {pressure.service_level_breaches} service breaches and a {pressure.longest_wait_minutes}-minute longest wait.</p>
          </article>
          <article>
            <div>
              <span>Bed capacity</span>
              <span className={statusClass(capacityStatus)}>{capacityStatus}</span>
            </div>
            <strong>{capacity.occupancy_percent}%</strong>
            <p>{capacity.available} beds are usable now; {capacity.cleaning} more require cleaning before use.</p>
          </article>
          <article>
            <div>
              <span>Qualified staffing</span>
              <span className={statusClass(staffingStatus)}>{staffingStatus}</span>
            </div>
            <strong>{totalGap} open</strong>
            <p>{totalGap ? `Coverage is below minimum for ${staffingRoles}.` : 'Every monitored role meets its qualified coverage minimum.'}</p>
          </article>
        </div>
      </section>

      <section className="cc-section cc-operational-update" id="update-conditions">
        <div className="cc-section-heading">
          <div>
            <p className="sg-eyebrow">Update conditions</p>
            <h2>Enter confirmed operational changes</h2>
          </div>
          <span>Zero means no change. All entered values are applied together.</span>
        </div>
        <p className="cc-section-intro">
          Use this form only for observed changes since the previous update. Applying it recalculates every connected operational and decision-support tool.
        </p>
        <div className="cc-pressure-guidance">
          <strong>To reduce patient-flow pressure</strong>
          <p>
            Enter more patients cleared from queues than new arrivals, then apply the update. For the current demo surge, try 350 to 420 cleared with zero new arrivals. The score recalculates immediately and remains stable for five seconds.
          </p>
        </div>
        <div className="cc-scenario-editor">
          <ScenarioControl
            label="New patient arrivals"
            hint="Patients entering active queues during this update."
            effect="Updates queue pressure and consumes available treatment capacity."
            value={scenario.arrivals}
            minimum={0}
            maximum={60}
            onChange={(value) => updateScenario('arrivals', value)}
          />
          <ScenarioControl
            label="Patients cleared from queues"
            hint="Completed provider, admission, imaging or transport queue steps."
            effect="Directly reduces active patients, service breaches and patient-flow pressure."
            value={scenario.queueCompletions}
            minimum={0}
            maximum={420}
            onChange={(value) => updateScenario('queueCompletions', value)}
          />
          <ScenarioControl
            label="Qualified ED RN change"
            hint="Negative for callouts; positive for recalled qualified staff."
            effect="Updates coverage minimums and plan eligibility."
            value={scenario.rnChange}
            minimum={-12}
            maximum={12}
            signed
            onChange={(value) => updateScenario('rnChange', value)}
          />
          <ScenarioControl
            label="Cleaned beds returned"
            hint="Beds that completed cleaning and can be assigned now."
            effect="Increases immediately usable staffed capacity."
            value={scenario.bedsCleaned}
            minimum={0}
            maximum={30}
            onChange={(value) => updateScenario('bedsCleaned', value)}
          />
          <ScenarioControl
            label="Patient discharges"
            hint="Completed discharges during this update."
            effect="Closes active queues and moves occupied beds into cleaning."
            value={scenario.discharges}
            minimum={0}
            maximum={40}
            onChange={(value) => updateScenario('discharges', value)}
          />
        </div>
        <div className="cc-change-review">
          <div>
            <span>Changes ready to apply</span>
            {changeSummary.length ? (
              <ul>
                {changeSummary.map((item) => <li key={item}>{item}</li>)}
              </ul>
            ) : (
              <p>No operational changes entered.</p>
            )}
          </div>
          <button
            className="sg-button cc-commit-button"
            disabled={busy || !sdk.isReady || scenarioChangeCount === 0}
            onClick={applyOperationalUpdate}
          >
            {busy ? 'Applying update…' : 'Apply update to all tools'}
          </button>
        </div>
      </section>

      <section className="cc-section cc-tool-launcher">
        <div className="cc-section-heading">
          <div>
            <p className="sg-eyebrow">Connected operational tools</p>
            <h2>Open the tool for the decision you need</h2>
          </div>
          <span>Each tool refreshes from the same shared state.</span>
        </div>
        <div className="cc-tool-grid">
          {tools.map((tool) => (
            <button
              className="cc-tool-link"
              disabled={!sdk.isReady || openingTool !== null}
              key={tool.name}
              onClick={() => void openConnectedTool(tool)}
            >
              <span className="cc-tool-group">{tool.group}</span>
              <strong>{tool.name}</strong>
              <b>{tool.value}</b>
              <p>{tool.description}</p>
              <small>{openingTool === tool.name ? 'Opening...' : 'Open synchronized view →'}</small>
            </button>
          ))}
        </div>
        <div className="cc-connection-note">
          <strong>Connection model</strong>
          <p>
            The Command Center writes one simulated operational update. Capacity, queue, staffing, plan comparison, policy gate, plan review and execution views then read the recalculated shared state.
          </p>
        </div>
      </section>

      <div className={`cc-message ${busy ? 'cc-message--busy' : ''}`}>
        <span>{busy ? 'Updating' : sdk.isReady ? 'Live' : 'Preview'}</span>
        {sdk.isReady
          ? message
          : 'Open through NitroStack Studio or an MCP client to apply operational updates.'}
      </div>
    </WidgetShell>
  );
}

function ScenarioControl({
  label,
  hint,
  effect,
  value,
  minimum,
  maximum,
  signed = false,
  onChange,
}: {
  label: string;
  hint: string;
  effect: string;
  value: number;
  minimum: number;
  maximum: number;
  signed?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="cc-scenario-control cc-scenario-control--plain">
      <span className="cc-control-copy">
        <strong>{label}</strong>
        <small>{hint}</small>
      </span>
      <span className="cc-control-entry">
        <input
          aria-label={label}
          type="number"
          min={minimum}
          max={maximum}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <span>{signed && value > 0 ? `+${value}` : value}</span>
      </span>
      <small className="cc-control-effect">{effect}</small>
      <span className="cc-control-range">Allowed range: {minimum} to {maximum}</span>
    </label>
  );
}
