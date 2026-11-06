'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import { AssessmentFull, AssessmentInline, EmptyState, ErrorState, LoadingState, type Actions } from '../../components/AssessmentView';
import { ApplyView } from '../../components/ApplyView';
import { CloudView, WatchView } from '../../components/MonitorViews';
import { PlanView } from '../../components/PlanView';
import { ReportView } from '../../components/ReportView';
import { VerifyView } from '../../components/VerifyView';
import { Shell, ThemeSwitch, useLayout, useTheme, type StepIndex } from '../../components/Shell';
import { repoLabel, shortSha } from '../../lib/calls';
import { tokensFor } from '../../lib/theme';
import { outputFromMessage } from '../../lib/tool-output';
import { UNRECOGNISED_HEADLINE, describeUnrecognised, toViewModel, unrecognisedDetail, type ViewModel } from '../../lib/view-model';
import '../tokens.css';
import '../mm.css';
import '../parts.css';
import '../report.css';
import '../verify.css';
import '../plan.css';
import '../monitor.css';
import '../apply.css';

class ResultBoundary extends React.Component<{ raw: unknown; children: React.ReactNode }, { error?: string }> {
  state: { error?: string } = {};
  static getDerivedStateFromError(e: unknown) {
    return { error: e instanceof Error ? e.name : 'an error' };
  }
  componentDidUpdate(prev: { raw: unknown }) {
    if (prev.raw !== this.props.raw && this.state.error) this.setState({ error: undefined });
  }
  render() {
    if (this.state.error) {
      const vm = describeUnrecognised(this.props.raw);
      return <ErrorState headline={UNRECOGNISED_HEADLINE} detail={unrecognisedDetail(vm, this.state.error)} />;
    }
    return this.props.children;
  }
}

type OpenAiGlobal = { toolOutput?: unknown };

// The host can hand over the result in the first injection, in a later one, or as a separate message, and the SDK
// only re-renders on one of those. Listen for all of them and poll window.openai as a last resort.
function useToolOutput(): unknown {
  const [output, setOutput] = useState<unknown>(null);
  useEffect(() => {
    let seen: unknown;
    const read = () => {
      const v = (window as unknown as { openai?: OpenAiGlobal }).openai?.toolOutput;
      if (v === undefined || v === null || v === seen) return;
      seen = v;
      setOutput(v);
    };
    const onMessage = (e: MessageEvent) => {
      const v = outputFromMessage(e.data);
      if (v !== undefined) setOutput(v);
      // The SDK layout sets window.openai in its own listener; read again after it ran.
      setTimeout(read, 0);
      setTimeout(read, 150);
    };
    read();
    window.addEventListener('message', onMessage);
    for (const ev of ['openai:set_globals', 'openai:ready', 'mcp:ready']) window.addEventListener(ev, read);
    const poll = setInterval(read, 400);
    return () => {
      window.removeEventListener('message', onMessage);
      for (const ev of ['openai:set_globals', 'openai:ready', 'mcp:ready']) window.removeEventListener(ev, read);
      clearInterval(poll);
    };
  }, []);
  return output;
}

// Which step of the journey (Assess > Plan > Preview > Apply/Verify > Report) a result belongs to.
function stepOf(vm: ViewModel): StepIndex | null {
  switch (vm.kind) {
    case 'watch':
    case 'cloud':
      return null;
    case 'plan':
      return 1;
    case 'apply':
      return 3;
    case 'verify':
      return 3;
    case 'report':
      return 4;
    default:
      return 0;
  }
}

function Body({ vm, layout, actions }: { vm: ViewModel; layout: 'full' | 'inline'; actions: Actions }) {
  switch (vm.kind) {
    case 'empty':
      return <EmptyState />;
    case 'unknown':
      return <ErrorState headline={UNRECOGNISED_HEADLINE} detail={unrecognisedDetail(vm)} />;
    case 'report':
      return <ReportView vm={vm} actions={actions} />;
    case 'verify':
      return <VerifyView vm={vm} actions={actions} />;
    case 'plan':
      return <PlanView vm={vm} actions={actions} />;
    case 'watch':
      return <WatchView vm={vm} />;
    case 'cloud':
      return <CloudView vm={vm} />;
    case 'assessment':
      return layout === 'inline' ? <AssessmentInline vm={vm} actions={actions} /> : <AssessmentFull vm={vm} actions={actions} />;
    default:
      return <ApplyView vm={vm} />;
  }
}

const timeOf = (iso: string | undefined): string => {
  const d = iso ? new Date(iso) : new Date();
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function ScoreDashboardPage() {
  const { isReady, theme: hostTheme, displayMode, openExternal, callTool, requestFullscreen } = useWidgetSDK();
  const raw = useToolOutput();
  const { theme, pref, cycle } = useTheme(hostTheme);
  const layout = useLayout(displayMode);

  // The page background outside the root element follows the theme too (inline mode can be shorter than the frame).
  useEffect(() => {
    if (!theme) return;
    const t = tokensFor(theme);
    document.documentElement.style.background = t['--base'];
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const vm = useMemo(() => toViewModel(raw), [raw]);
  // First render equals the server HTML (a skeleton); the real state follows after mount, so hydration never mismatches.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const loading = !mounted || (!isReady && raw === null);
  const [received, setReceived] = useState('');
  useEffect(() => {
    if (raw !== null) setReceived(timeOf(vm.kind === 'assessment' ? vm.generatedAt : undefined));
  }, [raw, vm]);
  const open = (url: string) => {
    try {
      openExternal(url);
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };
  const actions: Actions = { callTool, requestFullscreen, openExternal };
  const a = vm.kind === 'assessment' ? vm : undefined;
  const meta = { repo: repoLabel(a?.repoUrl) ?? (a?.assessmentId ? `assessment ${a.assessmentId.slice(0, 8)}` : undefined), sha: shortSha(a?.commit), time: received || undefined };
  // Only the assessment view has an inline layout so far; the other views always use the full one.
  const shellLayout = vm.kind === 'assessment' || loading ? layout : 'full';

  return (
    <Shell theme={theme} layout={shellLayout} step={stepOf(vm)} meta={meta} sw={<ThemeSwitch pref={pref} onCycle={cycle} theme={theme} />}>
      <div aria-busy={loading}>
        {loading ? (
          <LoadingState />
        ) : (
          <ResultBoundary raw={raw}>
            <Body vm={vm} layout={layout} actions={actions} />
          </ResultBoundary>
        )}
      </div>
    </Shell>
  );
}
