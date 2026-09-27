/**
 * Caseflow UI — the passport process, on screen.
 *
 * Four surfaces, each answering a different question an officer actually asks:
 *
 *   LifecycleBoard   "where is everything?"      kanban by stage, SLA clocks
 *   IntakeForm       "file a new one"            the citizen's online form
 *   CaseJourney      "what happened to this one?" every stage + every artefact
 *   ArnTracker       "what do I tell the caller?" the enquiry-counter view
 *   OrchestratorPanel "what did the agent do?"    ticks, steps, and its reasoning
 *
 * DESIGN RULE
 * ----------
 * The board never hides the gate. The `officer_review` column is drawn in the
 * accent colour with an explicit "human decision required" label, and its cards
 * carry no advance button — because there is no autonomous transition out of it.
 * The UI is a projection of CASE_TRANSITIONS, not a second opinion about it.
 */
import React from 'react';
import {
  CASE_STAGE_LABELS,
  type AdvanceResult,
  type BoardCard,
  type BoardColumn,
  type CaseFile,
  type CaseStage,
  type CaseflowBoard,
  type OrchestratorStatus,
  type OrchestratorTick,
} from '../lib/api.js';
import { COLORS } from '../lib/theme.js';
import { Bar, Button, Card, Empty, Field, Fields, Pill, Spinner } from './chrome.jsx';
import { IconAgent, IconAlert, IconBolt, IconCheck, IconClock, IconUser } from './icons.jsx';

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

/**
 * Stage → colour.
 *
 * Three bands, and the choice is semantic rather than decorative:
 *   accent   the human gate — the one place the machine stops
 *   machine  stages PassportIQ drives itself
 *   low      closed, happy
 *   high     closed, unhappy
 */
function stageTone(stage: CaseStage): { fg: string; bg: string; border: string } {
  if (stage === 'officer_review' || stage === 'clarification') {
    return { fg: COLORS.accent, bg: COLORS.accentSoft, border: COLORS.accentBorder };
  }
  if (stage === 'delivered' || stage === 'granted') {
    return { fg: COLORS.low, bg: COLORS.lowSoft, border: COLORS.lowBorder };
  }
  if (stage === 'rejected' || stage === 'withdrawn') {
    return { fg: COLORS.high, bg: COLORS.highSoft, border: COLORS.highBorder };
  }
  return { fg: COLORS.machine, bg: COLORS.machineSoft, border: '#E9D5FF' };
}

function shortTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function hours(n: number): string {
  if (n < 1) return `${Math.round(n * 60)}m`;
  if (n < 48) return `${Math.round(n)}h`;
  return `${Math.round(n / 24)}d`;
}

/** The SLA clock, as a chip an officer can read at a glance. */
export function SlaChip({ sla }: { sla: BoardCard['sla'] }) {
  if (sla.slaHours === 0) {
    return <Pill background={COLORS.surfaceAlt}>closed</Pill>;
  }
  const pct = Math.min(100, Math.round(sla.consumed * 100));
  const tone = sla.breached
    ? { fg: COLORS.high, bg: COLORS.highSoft, border: COLORS.highBorder }
    : pct > 70
      ? { fg: COLORS.medium, bg: COLORS.mediumSoft, border: COLORS.mediumBorder }
      : { fg: COLORS.textSecondary, bg: COLORS.surfaceAlt, border: 'transparent' };

  return (
    <Pill color={tone.fg} background={tone.bg} border={tone.border}>
      <IconClock size={11} />
      {sla.breached ? 'SLA breached' : `${hours(sla.hoursInStage)} / ${hours(sla.slaHours)}`}
    </Pill>
  );
}

// ---------------------------------------------------------------------------
// The board
// ---------------------------------------------------------------------------

export function LifecycleBoard({
  board,
  busyArn,
  onOpen,
  onAdvance,
  onDecide,
}: {
  board: CaseflowBoard | null;
  busyArn: string | null;
  onOpen: (arn: string) => void;
  onAdvance: (arn: string) => void;
  onDecide: (applicationId: string) => void;
}) {
  if (board === null) return <Spinner />;

  return (
    <div className="piq-board" role="list">
      {board.columns.map((col) => (
        <BoardLane
          key={col.stage}
          column={col}
          busyArn={busyArn}
          onOpen={onOpen}
          onAdvance={onAdvance}
          onDecide={onDecide}
        />
      ))}
    </div>
  );
}

function BoardLane({
  column,
  busyArn,
  onOpen,
  onAdvance,
  onDecide,
}: {
  column: BoardColumn;
  busyArn: string | null;
  onOpen: (arn: string) => void;
  onAdvance: (arn: string) => void;
  onDecide: (applicationId: string) => void;
}) {
  const tone = stageTone(column.stage);

  return (
    <section className="piq-lane" role="listitem">
      <header className="piq-lane-head" style={{ borderTopColor: tone.fg }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span className="piq-lane-title">{column.label}</span>
          <span className="piq-lane-count">{column.cases.length}</span>
        </div>
        {column.waitingOnHuman ? (
          <span className="piq-lane-gate">
            <IconUser size={11} /> human decision
          </span>
        ) : column.terminal ? (
          <span className="piq-lane-note">closed</span>
        ) : (
          <span className="piq-lane-note" style={{ color: COLORS.machine }}>
            <IconBolt size={11} /> automated
          </span>
        )}
      </header>

      <div className="piq-lane-body">
        {column.cases.length === 0 ? (
          <p className="piq-lane-empty">No cases</p>
        ) : (
          column.cases.map((c) => (
            <article
              key={c.arn}
              className={`piq-case-card${c.sla.breached ? ' is-breached' : ''}`}
              onClick={() => onOpen(c.arn)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpen(c.arn);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="piq-case-top">
                <span className="piq-case-name">{c.applicantName}</span>
                {c.tatkal ? (
                  <Pill color={COLORS.medium} background={COLORS.mediumSoft}>
                    tatkal
                  </Pill>
                ) : null}
              </div>

              <div className="piq-case-arn">{c.arn}</div>

              <Bar percent={c.progress} color={tone.fg} />

              <div className="piq-case-foot">
                <SlaChip sla={c.sla} />
                <span className="piq-case-since">{shortTime(c.stageEnteredAt)}</span>
              </div>

              {column.waitingOnHuman && column.stage === 'officer_review' ? (
                <div className="piq-case-act" onClick={(e) => e.stopPropagation()}>
                  <Button
                    small
                    variant="primary"
                    block
                    onClick={() => onDecide(c.applicationId)}
                    icon={<IconUser size={12} />}
                  >
                    Officer decision
                  </Button>
                  <p className="piq-case-hold">{c.hold}</p>
                </div>
              ) : c.nextAutonomousStep ? (
                <div className="piq-case-act" onClick={(e) => e.stopPropagation()}>
                  <Button
                    small
                    variant="machine"
                    block
                    disabled={busyArn === c.arn}
                    onClick={() => onAdvance(c.arn)}
                    icon={<IconBolt size={12} />}
                  >
                    {busyArn === c.arn ? 'Advancing…' : c.nextAutonomousStep}
                  </Button>
                </div>
              ) : c.hold ? (
                <p className="piq-case-hold">{c.hold}</p>
              ) : null}
            </article>
          ))
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Intake
// ---------------------------------------------------------------------------

const APPLICATION_TYPES = ['fresh', 'renewal', 'lost_replacement', 'minor'] as const;

const DOCUMENT_TYPES = [
  'aadhaar',
  'birth_certificate',
  'old_passport',
  'address_proof',
  'photograph',
  'fir_copy',
  'parent_consent',
] as const;

/**
 * The online application form.
 *
 * Submitting calls `submit_passport_application` — the real MCP tool — so the new
 * ARN is a first-class case immediately: it appears on the board, the fraud graph
 * is reindexed against it, and the orchestrator will pick it up on the next pass.
 *
 * `imageHash` is exposed on purpose. Reusing one document scan across two
 * applications is the strongest fraud signal the system has, and being able to
 * type the same hash twice is what makes that demonstrable live in ten seconds.
 */
export function IntakeForm({
  busy,
  onSubmit,
  lastResult,
}: {
  busy: boolean;
  onSubmit: (input: Record<string, unknown>) => void;
  lastResult: import('../lib/api.js').SubmitApplicationResult | null;
}) {
  const [fullName, setFullName] = React.useState('');
  const [dateOfBirth, setDateOfBirth] = React.useState('1995-06-15');
  const [applicationType, setApplicationType] =
    React.useState<(typeof APPLICATION_TYPES)[number]>('fresh');
  const [tatkal, setTatkal] = React.useState(false);
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [line1, setLine1] = React.useState('');
  const [city, setCity] = React.useState('Pune');
  const [stateName, setStateName] = React.useState('Maharashtra');
  const [pincode, setPincode] = React.useState('411001');
  const [docs, setDocs] = React.useState<string[]>([
    'aadhaar',
    'birth_certificate',
    'address_proof',
    'photograph',
  ]);
  const [imageHash, setImageHash] = React.useState('');

  const valid =
    fullName.trim().length >= 2 &&
    /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) &&
    phone.trim().length >= 6 &&
    /.+@.+\..+/.test(email) &&
    line1.trim().length > 0 &&
    /^\d{6}$/.test(pincode);

  function submit(): void {
    onSubmit({
      fullName: fullName.trim(),
      dateOfBirth,
      applicationType,
      tatkal,
      phone: phone.trim(),
      email: email.trim(),
      address: { line1: line1.trim(), city: city.trim(), state: stateName.trim(), pincode },
      documents: docs.map((type) => ({
        type,
        ...(imageHash.trim() ? { imageHash: imageHash.trim() } : {}),
      })),
    });
  }

  return (
    <div className="piq-grid-2">
      <Card
        eyebrow="Step 1 of the passport process"
        title="File a new application"
        subtitle="Calls submit_passport_application. The ARN is issued immediately and the fraud graph is reindexed against the new applicant."
      >
        <div className="piq-form">
          <label className="piq-lbl">
            Full name (as it must appear in the passport)
            <input
              className="piq-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ananya Sharma"
            />
          </label>

          <div className="piq-form-row">
            <label className="piq-lbl">
              Date of birth
              <input
                className="piq-input"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                placeholder="YYYY-MM-DD"
              />
            </label>
            <label className="piq-lbl">
              Application type
              <select
                className="piq-input"
                value={applicationType}
                onChange={(e) =>
                  setApplicationType(e.target.value as (typeof APPLICATION_TYPES)[number])
                }
              >
                {APPLICATION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="piq-form-row">
            <label className="piq-lbl">
              Mobile
              <input
                className="piq-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </label>
            <label className="piq-lbl">
              Email
              <input
                className="piq-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </label>
          </div>

          <label className="piq-lbl">
            Address line 1
            <input
              className="piq-input"
              value={line1}
              onChange={(e) => setLine1(e.target.value)}
              placeholder="14 MG Road"
            />
          </label>

          <div className="piq-form-row-3">
            <label className="piq-lbl">
              City
              <input className="piq-input" value={city} onChange={(e) => setCity(e.target.value)} />
            </label>
            <label className="piq-lbl">
              State
              <input
                className="piq-input"
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
              />
            </label>
            <label className="piq-lbl">
              PIN
              <input
                className="piq-input"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                maxLength={6}
              />
            </label>
          </div>

          <label className="piq-check">
            <input type="checkbox" checked={tatkal} onChange={(e) => setTatkal(e.target.checked)} />
            <span>
              Tatkal (expedited) — higher fee, tighter SLA on every stage
            </span>
          </label>

          <div>
            <div className="piq-eyebrow" style={{ marginBottom: 6 }}>
              Documents uploaded
            </div>
            <div className="piq-chipset">
              {DOCUMENT_TYPES.map((d) => {
                const on = docs.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    className={`piq-toggle${on ? ' is-on' : ''}`}
                    onClick={() =>
                      setDocs((prev) => (on ? prev.filter((x) => x !== d) : [...prev, d]))
                    }
                  >
                    {on ? <IconCheck size={11} /> : null}
                    {d.replace(/_/g, ' ')}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="piq-lbl">
            Document image hash (optional)
            <input
              className="piq-input"
              value={imageHash}
              onChange={(e) => setImageHash(e.target.value)}
              placeholder="e.g. ph_9f3c1a — reuse an existing hash to plant a duplicate signal"
            />
            <span className="piq-hint">
              Reusing a hash from another application is the strongest fraud signal PassportIQ
              detects. Type the same value on two filings to see the graph link them.
            </span>
          </label>

          <Button variant="primary" disabled={!valid || busy} onClick={submit} block>
            {busy ? 'Filing…' : 'File application and open a case'}
          </Button>
          {!valid ? (
            <p className="piq-hint">
              Name, a YYYY-MM-DD date of birth, mobile, a valid email, address line and a 6-digit PIN
              are all required — the same validation the tool's Zod schema enforces.
            </p>
          ) : null}
        </div>
      </Card>

      <Card
        eyebrow="Acknowledgement"
        title={lastResult ? `ARN ${lastResult.arn}` : 'No application filed yet'}
        subtitle={
          lastResult
            ? 'This case is now on the lifecycle board and visible to every MCP tool.'
            : 'File an application on the left and the acknowledgement appears here.'
        }
      >
        {lastResult === null ? (
          <Empty>
            The form on the left is the citizen-facing half of the process. Everything it produces —
            the ARN, the fee, the document checklist — comes from the same tool an LLM client would
            call.
          </Empty>
        ) : (
          <>
            <Fields>
              <Field label="ARN">{lastResult.arn}</Field>
              <Field label="Application id">{lastResult.applicationId}</Field>
              <Field label="Stage">{CASE_STAGE_LABELS[lastResult.stage]}</Field>
              {lastResult.feeDue ? (
                <Field label="Fee due">
                  ₹{lastResult.feeDue.amount.toLocaleString('en-IN')} {lastResult.feeDue.currency}
                </Field>
              ) : null}
            </Fields>

            {lastResult.documentChecklist ? (
              <div style={{ marginTop: 14 }}>
                <div className="piq-eyebrow" style={{ marginBottom: 6 }}>
                  Counter-A checklist
                </div>
                <div className="piq-chipset">
                  {lastResult.documentChecklist.required.map((d) => {
                    const missing = lastResult.documentChecklist?.missing.includes(d) ?? false;
                    return (
                      <Pill
                        key={d}
                        color={missing ? COLORS.high : COLORS.low}
                        background={missing ? COLORS.highSoft : COLORS.lowSoft}
                        border={missing ? COLORS.highBorder : COLORS.lowBorder}
                      >
                        {missing ? <IconAlert size={11} /> : <IconCheck size={11} />}
                        {d.replace(/_/g, ' ')}
                      </Pill>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {lastResult.nextStep ? (
              <p className="piq-note" style={{ marginTop: 14 }}>
                <strong>Next:</strong> {lastResult.nextStep}
              </p>
            ) : null}
            {lastResult.message ? (
              <p className="piq-note" style={{ marginTop: 10 }}>
                {lastResult.message}
              </p>
            ) : null}
          </>
        )}
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The case journey
// ---------------------------------------------------------------------------

const JOURNEY_STAGES: readonly CaseStage[] = [
  'submitted',
  'fee_paid',
  'appointment_booked',
  'psk_visit_complete',
  'verification_running',
  'police_verification',
  'officer_review',
  'granted',
  'printing',
  'dispatched',
  'delivered',
];

/**
 * One case, whole: the stage rail, every artefact, and the journal.
 *
 * The journal is the point. Each entry carries the rationale written by whoever
 * performed the transition — the agent's own reasoning for machine steps, the
 * officer's note for the decision. Read top to bottom it is an explanation of
 * the case, not a log of it.
 */
export function CaseJourney({
  file,
  busy,
  onAdvance,
  onDecide,
  onBack,
}: {
  file: CaseFile | null;
  busy: boolean;
  onAdvance: (arn: string, maxSteps: number) => void;
  onDecide: (applicationId: string) => void;
  onBack: () => void;
}) {
  if (file === null) return <Spinner />;

  const reached = new Set(file.journal.map((j) => j.stage));
  reached.add(file.stage);
  const currentIndex = JOURNEY_STAGES.indexOf(file.stage);
  const tone = stageTone(file.stage);
  const closed = file.closedAt !== null;

  return (
    <>
      <Card
        eyebrow={`${file.arn} · ${file.applicationId}`}
        title={file.applicantName}
        subtitle={`${file.applicationType.replace('_', ' ')}${file.tatkal ? ' · tatkal' : ''} · filed ${shortTime(file.openedAt)}`}
        actions={
          <>
            <Button small onClick={onBack}>
              Back to board
            </Button>
            {file.stage === 'officer_review' ? (
              <Button
                small
                variant="primary"
                onClick={() => onDecide(file.applicationId)}
                icon={<IconUser size={12} />}
              >
                Officer decision
              </Button>
            ) : !closed ? (
              <Button
                small
                variant="machine"
                disabled={busy}
                onClick={() => onAdvance(file.arn, 6)}
                icon={<IconBolt size={12} />}
              >
                {busy ? 'Running…' : 'Run to the next gate'}
              </Button>
            ) : null}
          </>
        }
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Pill color={tone.fg} background={tone.bg} border={tone.border}>
            {CASE_STAGE_LABELS[file.stage]}
          </Pill>
          <SlaChip sla={file.sla} />
          {file.officerDecision ? (
            <Pill
              color={file.officerDecision === 'approve' ? COLORS.low : COLORS.high}
              background={file.officerDecision === 'approve' ? COLORS.lowSoft : COLORS.highSoft}
            >
              officer: {file.officerDecision}
            </Pill>
          ) : null}
        </div>

        {/* The stage rail. Terminal-unhappy cases show where they stopped. */}
        <ol className="piq-rail">
          {JOURNEY_STAGES.map((stage, i) => {
            const done = reached.has(stage) && i < currentIndex;
            const now = stage === file.stage;
            return (
              <li
                key={stage}
                className={`piq-rail-step${done ? ' is-done' : ''}${now ? ' is-now' : ''}`}
              >
                <span className="piq-rail-dot">{done ? <IconCheck size={10} /> : i + 1}</span>
                <span className="piq-rail-label">{CASE_STAGE_LABELS[stage]}</span>
              </li>
            );
          })}
        </ol>

        {file.stage === 'clarification' && file.clarification ? (
          <p className="piq-note is-warn" style={{ marginTop: 14 }}>
            <strong>Held for clarification:</strong> {file.clarification.question}
          </p>
        ) : null}
        {file.stage === 'rejected' || file.stage === 'withdrawn' ? (
          <p className="piq-note is-bad" style={{ marginTop: 14 }}>
            Case closed at <strong>{CASE_STAGE_LABELS[file.stage]}</strong>. It did not reach
            issuance.
          </p>
        ) : null}
      </Card>

      <div className="piq-grid-2" style={{ marginTop: 16 }}>
        <Card title="Process artefacts" subtitle="Everything the case has produced so far.">
          <ArtefactList file={file} />
        </Card>

        <Card
          title="Case journal"
          subtitle="Every transition, with the reasoning of whoever performed it."
        >
          {file.journal.length === 0 ? (
            <Empty>No journal entries yet.</Empty>
          ) : (
            <ol className="piq-journal">
              {[...file.journal].reverse().map((e) => (
                <li key={e.seq} className="piq-journal-item">
                  <div className="piq-journal-head">
                    <Pill
                      color={e.actor === 'passport_officer' ? COLORS.accent : COLORS.machine}
                      background={
                        e.actor === 'passport_officer' ? COLORS.accentSoft : COLORS.machineSoft
                      }
                    >
                      {e.actor === 'passport_officer' ? (
                        <IconUser size={11} />
                      ) : (
                        <IconAgent size={11} />
                      )}
                      {e.by}
                    </Pill>
                    <span className="piq-journal-time">{shortTime(e.at)}</span>
                  </div>
                  <p className="piq-journal-summary">{e.summary}</p>
                  <p className="piq-journal-why">{e.rationale}</p>
                  <code className="piq-journal-tool">{e.tool}</code>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </>
  );
}

function ArtefactList({ file }: { file: CaseFile }) {
  const rows: Array<{ label: string; body: React.ReactNode }> = [];

  if (file.fee) {
    rows.push({
      label: 'Fee receipt',
      body: (
        <Fields>
          <Field label="Receipt">{file.fee.receiptNo}</Field>
          <Field label="Amount">₹{file.fee.amount.toLocaleString('en-IN')}</Field>
          <Field label="Method">{file.fee.method}</Field>
          <Field label="Paid">{shortTime(file.fee.paidAt)}</Field>
        </Fields>
      ),
    });
  }

  if (file.appointment) {
    rows.push({
      label: 'PSK appointment',
      body: (
        <Fields>
          <Field label="Kendra">{file.appointment.pskName}</Field>
          <Field label="Code">{file.appointment.pskCode}</Field>
          <Field label="Slot">{shortTime(file.appointment.slot)}</Field>
          <Field label="Token">{file.appointment.tokenNo}</Field>
        </Fields>
      ),
    });
  }

  if (file.pskVisit) {
    const v = file.pskVisit;
    rows.push({
      label: 'Counters A / B / C',
      body: (
        <>
          <div className="piq-chipset" style={{ marginBottom: 8 }}>
            {(
              [
                ['A · documents', v.counterA],
                ['B · biometrics', v.counterB],
                ['C · review', v.counterC],
              ] as const
            ).map(([label, ok]) => (
              <Pill
                key={label}
                color={ok ? COLORS.low : COLORS.high}
                background={ok ? COLORS.lowSoft : COLORS.highSoft}
                border={ok ? COLORS.lowBorder : COLORS.highBorder}
              >
                {ok ? <IconCheck size={11} /> : <IconAlert size={11} />}
                {label}
              </Pill>
            ))}
          </div>
          <Fields>
            <Field label="Fingerprints">{v.biometrics.fingerprints} / 10</Field>
            <Field label="Photo">{v.biometrics.photo ? 'captured' : 'missing'}</Field>
            <Field label="Signature">{v.biometrics.signature ? 'captured' : 'missing'}</Field>
            <Field label="Documents granted">{v.documentsGranted.length}</Field>
          </Fields>
          {v.documentsMissing.length > 0 ? (
            <p className="piq-note is-warn" style={{ marginTop: 8 }}>
              Missing: {v.documentsMissing.join(', ')}
            </p>
          ) : null}
        </>
      ),
    });
  }

  if (file.policeVerification) {
    const pv = file.policeVerification;
    rows.push({
      label: 'Police verification',
      body: (
        <Fields>
          <Field label="Reference">{pv.referenceNo}</Field>
          <Field label="District">{pv.district}</Field>
          <Field label="Station">{pv.station}</Field>
          <Field label="Verdict">{pv.verdict ?? 'awaiting report'}</Field>
          <Field label="Requested">{shortTime(pv.requestedAt)}</Field>
          <Field label="Reported">{shortTime(pv.reportedAt)}</Field>
        </Fields>
      ),
    });
  }

  if (file.booklet) {
    rows.push({
      label: 'Passport booklet',
      body: (
        <Fields>
          <Field label="Passport no.">{file.booklet.passportNumber}</Field>
          <Field label="Pages">{file.booklet.pages}</Field>
          <Field label="Valid until">{file.booklet.validUntil}</Field>
          <Field label="Print queue">{file.booklet.printQueue}</Field>
        </Fields>
      ),
    });
  }

  if (file.dispatch) {
    rows.push({
      label: 'Dispatch',
      body: (
        <Fields>
          <Field label="Courier">{file.dispatch.courier}</Field>
          <Field label="Tracking">{file.dispatch.trackingNo}</Field>
          <Field label="Dispatched">{shortTime(file.dispatch.dispatchedAt)}</Field>
          <Field label="Delivered">{shortTime(file.dispatch.deliveredAt)}</Field>
        </Fields>
      ),
    });
  }

  if (rows.length === 0) {
    return (
      <Empty>
        Nothing produced yet — this case has only just been filed. Artefacts appear here as the
        process generates them.
      </Empty>
    );
  }

  return (
    <div className="piq-artefacts">
      {rows.map((r) => (
        <section key={r.label} className="piq-artefact">
          <div className="piq-eyebrow">{r.label}</div>
          {r.body}
        </section>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The ARN tracker
// ---------------------------------------------------------------------------

/**
 * The enquiry-counter view.
 *
 * Deliberately thinner than the case file: it is what a citizen is entitled to
 * see. No fraud reasoning, no officer notes, no agent rationale.
 */
export function ArnTracker({
  value,
  onChange,
  onSearch,
  busy,
  result,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  onSearch: () => void;
  busy: boolean;
  result: Record<string, unknown> | null;
  error: string | null;
}) {
  const r = result as
    | {
        arn: string;
        applicantName: string;
        status: string;
        statusMessage: string;
        progressPercent: number;
        scheme: string;
        filedOn: string;
        expectedBy: string | null;
        actionRequiredFromYou: string | null;
        yourDetails: {
          feeReceipt: { receiptNo: string; amount: number } | null;
          appointment: { centre: string; slot: string; tokenNo: string } | null;
          passportNumber: string | null;
          dispatch: { courier: string; trackingNo: string } | null;
        };
        timeline: Array<{ at: string; stageLabel: string; milestone: string }>;
      }
    | null;

  return (
    <div className="piq-grid-2">
      <Card
        eyebrow="Public enquiry"
        title="Track an application"
        subtitle="Calls track_passport_application — the citizen-facing projection. Internal reasoning is deliberately not returned."
      >
        <div className="piq-form">
          <label className="piq-lbl">
            ARN or application id
            <input
              className="piq-input"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSearch();
              }}
              placeholder="ARN-2026-000001 or PIQ-2026-2001"
            />
          </label>
          <Button variant="primary" block disabled={busy || value.trim() === ''} onClick={onSearch}>
            {busy ? 'Checking…' : 'Check status'}
          </Button>
          {error ? <p className="piq-note is-bad">{error}</p> : null}
        </div>
      </Card>

      <Card
        title={r ? `${r.applicantName} · ${r.status}` : 'Status'}
        subtitle={r ? `ARN ${r.arn} · ${r.scheme} scheme` : 'Enter an ARN on the left.'}
      >
        {r === null ? (
          <Empty>No application looked up yet.</Empty>
        ) : (
          <>
            <Bar percent={r.progressPercent} color={COLORS.accent} />
            <p className="piq-note" style={{ marginTop: 12 }}>
              {r.statusMessage}
            </p>

            {r.actionRequiredFromYou ? (
              <p className="piq-note is-warn" style={{ marginTop: 10 }}>
                <strong>Action required from you:</strong> {r.actionRequiredFromYou}
              </p>
            ) : null}

            <Fields>
              <Field label="Filed on">{shortTime(r.filedOn)}</Field>
              <Field label="Expected by">{shortTime(r.expectedBy)}</Field>
              {r.yourDetails.feeReceipt ? (
                <Field label="Fee receipt">
                  {r.yourDetails.feeReceipt.receiptNo} · ₹
                  {r.yourDetails.feeReceipt.amount.toLocaleString('en-IN')}
                </Field>
              ) : null}
              {r.yourDetails.appointment ? (
                <Field label="Appointment">
                  {r.yourDetails.appointment.centre} · token {r.yourDetails.appointment.tokenNo}
                </Field>
              ) : null}
              {r.yourDetails.passportNumber ? (
                <Field label="Passport no.">{r.yourDetails.passportNumber}</Field>
              ) : null}
              {r.yourDetails.dispatch ? (
                <Field label="Speed Post">{r.yourDetails.dispatch.trackingNo}</Field>
              ) : null}
            </Fields>

            {r.timeline.length > 0 ? (
              <ol className="piq-journal" style={{ marginTop: 14 }}>
                {[...r.timeline].reverse().map((t, i) => (
                  <li key={`${t.at}-${i}`} className="piq-journal-item">
                    <div className="piq-journal-head">
                      <Pill>{t.stageLabel}</Pill>
                      <span className="piq-journal-time">{shortTime(t.at)}</span>
                    </div>
                    <p className="piq-journal-summary">{t.milestone}</p>
                  </li>
                ))}
              </ol>
            ) : null}
          </>
        )}
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The orchestrator
// ---------------------------------------------------------------------------

/**
 * What the lifecycle agent did, and — more importantly — where it refused to go.
 *
 * Every step shows the rationale the orchestrator composed BEFORE it acted, and
 * every tick's narrative ends by naming the cases it left for a human. That is
 * the honest shape of an agent with a hard gate in it.
 */
export function OrchestratorPanel({
  status,
  ticks,
  busy,
  onTick,
  onStart,
  onStop,
  lastAdvance,
}: {
  status: OrchestratorStatus | null;
  ticks: OrchestratorTick[];
  busy: boolean;
  onTick: () => void;
  onStart: () => void;
  onStop: () => void;
  lastAdvance: AdvanceResult | null;
}) {
  const armed = status?.mode === 'running';

  return (
    <>
      <Card
        eyebrow="Autonomous lifecycle loop"
        title="Case orchestrator"
        subtitle={status?.detail ?? 'Status unavailable.'}
        actions={
          <>
            <Button
              small
              variant="machine"
              disabled={busy}
              onClick={onTick}
              icon={<IconBolt size={12} />}
            >
              {busy ? 'Running…' : 'Run one pass'}
            </Button>
            {armed ? (
              <Button small onClick={onStop}>
                Disarm
              </Button>
            ) : (
              <Button small variant="primary" onClick={onStart}>
                Arm loop
              </Button>
            )}
          </>
        }
      >
        <div className="piq-grid-4">
          <MiniStat label="Passes" value={status?.ticks ?? '—'} />
          <MiniStat
            label="Transitions executed"
            value={status?.transitionsExecuted ?? '—'}
            tone={COLORS.machine}
          />
          <MiniStat
            label="Handed to an officer"
            value={status?.handoffsToOfficer ?? '—'}
            tone={COLORS.accent}
          />
          <MiniStat label="Cases closed" value={status?.casesClosed ?? '—'} tone={COLORS.low} />
        </div>

        <p className="piq-note" style={{ marginTop: 12 }}>
          The loop may only execute transitions declared <code>autonomous: true</code> in the
          lifecycle contract. The three <code>officer_review</code> branches are declared{' '}
          <code>autonomous: false</code>, so no number of passes can grant, refuse or clarify an
          application — that is a structural property of the state machine, not a policy the agent
          is asked to respect.
        </p>
      </Card>

      {lastAdvance ? (
        <Card
          title={`Last manual advance · ${lastAdvance.arn}`}
          subtitle={`${lastAdvance.stepsExecuted} step(s) executed — ${lastAdvance.stopped}`}
          style={{ marginTop: 16 }}
        >
          <StepList
            steps={lastAdvance.steps.map((s) => ({
              arn: lastAdvance.arn,
              applicantName: lastAdvance.applicantName,
              from: s.from,
              to: s.to,
              tool: s.tool,
              ok: s.ok,
              rationale: s.rationale,
              outcome: s.outcome,
            }))}
          />
        </Card>
      ) : null}

      <Card title="Recent passes" subtitle="Newest first." style={{ marginTop: 16 }}>
        {ticks.length === 0 ? (
          <Empty>
            The loop has not run yet. Press <strong>Run one pass</strong> to watch it perceive the
            register, prioritise by tatkal and SLA breach, act, and explain itself.
          </Empty>
        ) : (
          <div className="piq-ticks">
            {[...ticks].reverse().map((t) => (
              <section key={t.tickId} className="piq-tick">
                <div className="piq-tick-head">
                  <Pill color={COLORS.machine} background={COLORS.machineSoft}>
                    <IconAgent size={11} />
                    {t.tickId}
                  </Pill>
                  <span className="piq-journal-time">
                    {shortTime(t.startedAt)} · {t.durationMs}ms
                  </span>
                </div>
                <p className="piq-tick-narrative">{t.narrative}</p>
                <div className="piq-chipset" style={{ marginBottom: 8 }}>
                  <Pill>{t.considered} considered</Pill>
                  <Pill color={COLORS.machine} background={COLORS.machineSoft}>
                    {t.advanced} advanced
                  </Pill>
                  <Pill color={COLORS.accent} background={COLORS.accentSoft}>
                    {t.blockedOnHuman} awaiting a human
                  </Pill>
                  {t.slaBreaches > 0 ? (
                    <Pill color={COLORS.high} background={COLORS.highSoft}>
                      {t.slaBreaches} SLA breach{t.slaBreaches === 1 ? '' : 'es'}
                    </Pill>
                  ) : null}
                </div>
                <StepList steps={t.steps} />
              </section>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

function StepList({
  steps,
}: {
  steps: Array<{
    arn: string;
    applicantName: string;
    from: CaseStage;
    to: CaseStage | null;
    tool: string;
    ok: boolean;
    rationale: string;
    outcome: string;
  }>;
}) {
  if (steps.length === 0) {
    return <p className="piq-lane-empty">No transitions in this pass.</p>;
  }
  return (
    <ol className="piq-steps">
      {steps.map((s, i) => (
        <li key={`${s.arn}-${i}`} className={`piq-step${s.ok ? '' : ' is-bad'}`}>
          <div className="piq-step-head">
            <span className="piq-step-move">
              {CASE_STAGE_LABELS[s.from]} → {s.to ? CASE_STAGE_LABELS[s.to] : 'refused'}
            </span>
            <span className="piq-step-who">
              {s.applicantName} · {s.arn}
            </span>
          </div>
          <p className="piq-step-why">{s.rationale}</p>
          <p className="piq-step-out">{s.outcome}</p>
          <code className="piq-journal-tool">{s.tool}</code>
        </li>
      ))}
    </ol>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: string;
}) {
  return (
    <div className="piq-ministat">
      <div className="piq-ministat-value" style={tone ? { color: tone } : undefined}>
        {value}
      </div>
      <div className="piq-ministat-label">{label}</div>
    </div>
  );
}
