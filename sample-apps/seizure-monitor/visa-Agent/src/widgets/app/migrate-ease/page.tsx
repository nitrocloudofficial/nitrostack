'use client';

/**
 * [HLD] Client Portal — target shell
 * [STATUS: IMPLEMENTED guided widget flow; full portal tabs are CONCEPTUAL]
 * ------------------------------------------------------------------
 * Target tabs are Home, Applications, Assistant, Document Vault, and
 * Notifications. Onboarding lives inside the Assistant, entered through
 * Apply New, and switches between intake and policy Q&A context. Rich tool
 * output uses NitroStack widgets for checklists, progress, documents, and
 * inline input. The future ops portal shares the component library but adds
 * approval/diff cards, broker management, a policy KB, audit history, and
 * health metrics behind an OAuth role gate.
 *
 * The current route is the client-facing five-step flow: describe, case,
 * checklist, upload, and validation. It intentionally includes no ops action.
 * [/HLD]
 */
/**
 * MigrateEase — single widget surface for the whole visa workflow.
 *
 * NitroStack mounts a widget in response to a tool call, handing it that
 * tool's output. Rather than one dead-end widget per tool, this route is an
 * app shell: it seeds its state from whichever tool mounted it, then drives
 * every later step through `callTool`. That is what lets a user finish the
 * flow without reopening tool panels.
 *
 * Linked from the backend by `@Widget('migrate-ease')` on case_start,
 * onboarding_extract, resolve_requirements, and document_validate.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getWidgetSDK } from '@nitrostack/widgets';
import { isHostReady } from '../../lib/mcp';
import type { CaseGetOutput, ResolveRequirementsOutput } from '../../lib/types';
import type { StepKey } from '../../components/ui';
import {
  Alert,
  Card,
  Logo,
  ProgressStepper,
  Shell,
  WordMark,
} from '../../components/ui';
import { Landing } from '../../components/screens/Landing';
import { Chat } from '../../components/screens/Chat';
import { CaseSummary } from '../../components/screens/CaseSummary';
import { Checklist } from '../../components/screens/Checklist';
import { Upload } from '../../components/screens/Upload';
import { Validation } from '../../components/screens/Validation';

type Screen = 'landing' | StepKey;

interface FlowState {
  screen: Screen;
  caseId?: string;
  documentId?: string;
  celebrateCase?: boolean;
  caseRecord?: CaseGetOutput;
  requirements?: ResolveRequirementsOutput;
}

/**
 * Works out where to drop the user based on the mounting tool's output.
 * Each tool has a distinctive field, so no tool name is needed.
 */
function seedFromToolOutput(output: unknown): FlowState | null {
  if (!output || typeof output !== 'object') return null;
  const o = output as Record<string, unknown>;

  // document_validate -> straight to the result
  if (Array.isArray(o.passedChecks) && typeof o.status === 'string') {
    return { screen: 'validation' };
  }

  // resolve_requirements -> the checklist
  if (
    Array.isArray(o.checklist) &&
    o.checklist.every((item) => typeof item === 'string') &&
    typeof o.caseId === 'string' &&
    typeof o.timeline === 'string' &&
    Array.isArray(o.notes) &&
    o.notes.every((note) => typeof note === 'string')
  ) {
    return {
      screen: 'requirements',
      caseId: o.caseId,
      requirements: {
        caseId: o.caseId,
        checklist: o.checklist,
        timeline: o.timeline,
        notes: o.notes,
      },
    };
  }

  // onboarding_extract
  if (typeof o.outcome === 'string') {
    if (o.outcome === 'case_started' && typeof o.caseId === 'string') {
      const hasCompleteCase =
        typeof o.status === 'string' &&
        typeof o.createdAt === 'string' &&
        o.extracted !== null &&
        typeof o.extracted === 'object' &&
        typeof (o.extracted as Record<string, unknown>).nationality === 'string' &&
        typeof (o.extracted as Record<string, unknown>).destinationCountry === 'string' &&
        typeof (o.extracted as Record<string, unknown>).visaType === 'string';

      const caseRecord = hasCompleteCase
        ? {
            caseId: o.caseId,
            nationality: (o.extracted as Record<string, string>).nationality,
            destinationCountry: (o.extracted as Record<string, string>).destinationCountry,
            visaType: (o.extracted as Record<string, string>).visaType,
            status: o.status as CaseGetOutput['status'],
            createdAt: o.createdAt as string,
            nextStep: typeof o.nextStep === 'string' ? o.nextStep : 'Review your draft case.',
          }
        : undefined;

      return { screen: 'case', caseId: o.caseId, celebrateCase: true, caseRecord };
    }
    return { screen: 'chat' };
  }

  // case_start / case_get
  if (typeof o.caseId === 'string' && typeof o.createdAt === 'string') {
    return { screen: 'case', caseId: o.caseId, celebrateCase: true };
  }

  return null;
}

export default function MigrateEasePage() {
  const [state, setState] = useState<FlowState>({ screen: 'landing' });
  const [ready, setReady] = useState<boolean | null>(null);

  // Wait for the host bridge, then seed from the mounting tool's output.
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const sdk = getWidgetSDK();
      try {
        await sdk.waitForReady(4000);
      } catch {
        /* fall through — handled by the isHostReady check below */
      }
      if (cancelled) return;

      const connected = isHostReady();
      setReady(connected);

      if (connected) {
        const seeded = seedFromToolOutput(sdk.getToolOutput());
        if (seeded) setState(seeded);
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  const go = useCallback((screen: Screen, patch: Partial<FlowState> = {}) => {
    setState((prev) => ({ ...prev, ...patch, screen }));
  }, []);

  const reachable = useCallback(
    (step: StepKey) => {
      if (step === 'chat') return true;
      if (step === 'case' || step === 'requirements' || step === 'upload') return !!state.caseId;
      return !!state.documentId;
    },
    [state.caseId, state.documentId],
  );

  const showStepper = state.screen !== 'landing';
  const currentStep: StepKey = state.screen === 'landing' ? 'chat' : state.screen;

  const banner = useMemo(() => {
    if (ready === false) {
      return (
        <div style={{ marginBottom: 16 }}>
          <Alert tone="warning" title="Not connected to the MigrateEase server">
            This app talks to the server through its host. Open it from NitroStudio — running the
            page directly in a browser leaves it without a connection, so the steps below can't load
            your data.
          </Alert>
        </div>
      );
    }
    return null;
  }, [ready]);

  return (
    <Shell>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 18,
        }}
      >
        <Logo size={28} />
        <WordMark size={17} />
      </header>

      {banner}

      {showStepper && (
        <ProgressStepper
          current={currentStep}
          reachable={reachable}
          onNavigate={(step) => go(step)}
        />
      )}

      {state.screen === 'landing' && <Landing onStart={() => go('chat')} />}

      {state.screen === 'chat' && (
        <Chat onCaseStarted={(caseId) => go('case', { caseId, celebrateCase: true })} />
      )}

      {state.screen === 'case' &&
        (state.caseId ? (
          <CaseSummary
            caseId={state.caseId}
            celebrate={state.celebrateCase}
            initialRecord={state.caseRecord}
            onBack={() => go('chat')}
            onContinue={() => go('requirements', { celebrateCase: false, requirements: undefined })}
          />
        ) : (
          <MissingCase onRestart={() => go('chat')} />
        ))}

      {state.screen === 'requirements' &&
        (state.caseId ? (
          <Checklist
            caseId={state.caseId}
            initialData={state.requirements}
            onBack={() => go('case')}
            onContinue={() => go('upload')}
          />
        ) : (
          <MissingCase onRestart={() => go('chat')} />
        ))}

      {state.screen === 'upload' &&
        (state.caseId ? (
          <Upload
            caseId={state.caseId}
            onBack={() => go('requirements')}
            onUploaded={(documentId) => go('validation', { documentId })}
          />
        ) : (
          <MissingCase onRestart={() => go('chat')} />
        ))}

      {state.screen === 'validation' &&
        (state.caseId && state.documentId ? (
          <Validation
            caseId={state.caseId}
            documentId={state.documentId}
            onUploadAnother={() => go('upload', { documentId: undefined })}
            onRestart={() => setState({ screen: 'landing' })}
          />
        ) : (
          <MissingDocument onBack={() => go(state.caseId ? 'upload' : 'chat')} />
        ))}

      <footer
        style={{
          marginTop: 22,
          textAlign: 'center',
          fontSize: 12.5,
          color: 'var(--me-text-subtle)',
        }}
      >
        MigrateEase gives guidance only — it is not legal advice, and it does not decide your
        application.
      </footer>
    </Shell>
  );
}

function MissingCase({ onRestart }: { onRestart: () => void }) {
  return (
    <Card>
      <Alert tone="warning" title="No case yet">
        Start by describing your move, and we'll open a case for you.
      </Alert>
      <div style={{ marginTop: 14 }}>
        <button
          type="button"
          onClick={onRestart}
          style={{
            padding: '10px 17px',
            borderRadius: 'var(--me-radius)',
            border: 'none',
            background: 'var(--me-blue-600)',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Describe my move
        </button>
      </div>
    </Card>
  );
}

function MissingDocument({ onBack }: { onBack: () => void }) {
  return (
    <Card>
      <Alert tone="warning" title="Nothing to check yet">
        Upload a document first and we'll read it for you.
      </Alert>
      <div style={{ marginTop: 14 }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            padding: '10px 17px',
            borderRadius: 'var(--me-radius)',
            border: 'none',
            background: 'var(--me-blue-600)',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Go to upload
        </button>
      </div>
    </Card>
  );
}
