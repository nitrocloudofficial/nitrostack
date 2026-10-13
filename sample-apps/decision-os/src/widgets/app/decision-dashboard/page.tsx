'use client';

import React from 'react';
import {
  colors,
  fadeKeyframes,
  font,
  mutedLabel,
  radii,
  space,
  tabButton,
} from './components/ui';
import { StatusPanel } from './components/StatusPanel';
import { OverviewCard } from './components/OverviewCard';
import { ExecutionTimeline } from './components/ExecutionTimeline';
import { ConfidenceGauge } from './components/ConfidenceGauge';
import { RiskMatrix } from './components/RiskMatrix';
import { FinancialSummary } from './components/FinancialSummary';
import { ResearchSummary } from './components/ResearchSummary';
import { DecisionTree } from './components/DecisionTree';
import { RecommendationPanel } from './components/RecommendationPanel';
import { useTheme, useWidgetState, useWidgetSDK } from '@nitrostack/widgets';

const TABS = ['all', 'overview', 'timeline', 'financial', 'risk', 'research', 'tree', 'verdict'] as const;

/** Prefer structuredContent / DecisionReport shape; never invent demo values. */
function resolveDecisionReport(raw: unknown): Record<string, any> | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, any>;
  if (o.structuredContent && typeof o.structuredContent === 'object' && !Array.isArray(o.structuredContent)) {
    return o.structuredContent as Record<string, any>;
  }
  if (o.result?.structuredContent && typeof o.result.structuredContent === 'object') {
    return o.result.structuredContent as Record<string, any>;
  }
  if (o.result && typeof o.result === 'object' && (o.result.context || o.result.recommendation)) {
    return o.result as Record<string, any>;
  }
  return o;
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        return String(obj.hazard || obj.title || obj.name || obj.summary || obj.text || JSON.stringify(item));
      }
      return String(item);
    })
    .filter(Boolean);
}

export default function DecisionDashboardWidget() {
  const theme = useTheme();
  const { getToolOutput, isReady, toolOutput } = useWidgetSDK();
  const [state, setState] = useWidgetState<{ activeTab: string }>(() => ({
    activeTab: 'all',
  }));

  const rawToolOutput = getToolOutput<any>() ?? toolOutput;
  const rawData = resolveDecisionReport(rawToolOutput);
  const isDark = theme === 'dark';
  const toolError =
    rawData && typeof rawData.error === 'string' && !rawData.context && !rawData.recommendation
      ? rawData.error
      : null;

  if (!isReady) {
    return (
      <StatusPanel
        isDark={isDark}
        message="Connecting to NitroStack Host..."
        detail="Initializing widget runtime."
        tone="neutral"
      />
    );
  }

  if (toolError) {
    const isGeneric = /^tool execution failed$/i.test(toolError.trim());
    return (
      <StatusPanel
        isDark={isDark}
        message="Tool execution failed"
        detail={
          isGeneric ? (
            <>
              NitroStudio could not complete <code>analyzeDecision</code>. This is usually an AI provider free-tier
              quota (429) or a request timeout — not a dashboard UI issue.
              <div style={{ marginTop: space.sm }}>
                Wait ~30–60s, restart the NitroStack server if needed, then run again with a clear request like
                “Should I buy a coffee shop near SRM with ₹15 lakh?”
              </div>
            </>
          ) : (
            <>
              <div>{toolError}</div>
              <div style={{ marginTop: space.sm }}>
                If this mentions quota / 429, wait ~30–60s and run analyzeDecision again.
              </div>
            </>
          )
        }
        tone="error"
        role="alert"
      />
    );
  }

  if (!rawData || (!rawData.context && !rawData.recommendation && !rawData.metadata)) {
    return (
      <StatusPanel
        isDark={isDark}
        message="Waiting for DecisionReport from analyzeDecision..."
        detail={
          <>
            Tip: pass{' '}
            <code style={{ fontSize: 11 }}>
              {`{"request":"Should I open a coffee shop near SRM Chennai with ₹15 lakh?"}`}
            </code>
          </>
        }
        tone="info"
      />
    );
  }

  const context = rawData.context || {};
  const research = rawData.research || {};
  const market = rawData.market || {};
  const finance = rawData.finance || {};
  const risk = rawData.risk || {};
  const recommendation = rawData.recommendation || {};
  const metadata = rawData.metadata || {};

  const objective = context.objective || rawData.objective || rawData.request || 'Decision Analysis';
  const decisionType = context.decisionType || rawData.decisionType || 'GENERAL';

  const confidenceScore =
    recommendation.overallConfidence ??
    metadata.confidence ??
    context.confidenceScore ??
    context.confidence ??
    rawData.confidenceScore ??
    0;

  const verdict = recommendation.verdict || rawData.verdict || 'NEEDS_MORE_DATA';
  const recommendationSummary =
    recommendation.executiveSummary || rawData.recommendationSummary || '';
  const executionTimeMs = metadata.executionTime ?? rawData.aggregatedResult?.totalExecutionTimeMs ?? 0;

  const explainabilityEngines =
    metadata.enginesExecuted?.map((engine: string, index: number) => ({
      engineId: engine,
      reasonForSelection: `Executed ${engine} pipeline stage`,
      dependsOn: [],
      executionPriority: (index + 1) * 10,
    })) ||
    rawData.explainability?.selectedEngines ||
    [];

  const stageBreakdown = metadata.enginesExecuted || rawData.explainability?.stageBreakdown || [];

  const researchAssumptions = asStringList(research.assumptions);
  const financeAssumptions = asStringList(finance.assumptions);
  const contextAssumptions = asStringList(context.assumptions);
  const assumptions =
    researchAssumptions.length > 0
      ? researchAssumptions
      : financeAssumptions.length > 0
        ? financeAssumptions
        : contextAssumptions;

  const limitations = [
    ...asStringList(research.uncertainties),
    ...asStringList(research.dataGaps),
    ...asStringList(finance.additionalInformationRequired),
    ...asStringList(context.constraints),
    ...asStringList(context.missingInformation),
  ];

  const researchFindings = [
    research.summary,
    research.industryOverview,
    ...asStringList(research.supportingFacts),
    ...asStringList(research.keyFindings),
    ...asStringList(research.opportunities),
    market.targetIndustry ? `Market: ${market.targetIndustry}` : null,
    market.demand ? `Demand: ${market.demand}` : null,
    market.competition ? `Competition: ${market.competition}` : null,
  ].filter(Boolean) as string[];

  const recommendations = asStringList(recommendation.nextSteps);
  const pros = asStringList(recommendation.pros);
  const cons = asStringList(recommendation.cons);
  const alternatives = asStringList(recommendation.alternativeOptions);

  const identifiedRisks = Array.isArray(risk.identifiedRisks) ? risk.identifiedRisks : [];
  const mitigations = asStringList(risk.mitigationPlan);
  const riskScore = typeof risk.riskScore === 'number' ? risk.riskScore : 0;
  const overallRiskLevel = risk.overallRiskLevel || null;

  const activeTab = state?.activeTab || 'all';
  const failedEngines = asStringList(metadata.failedEngines);

  return (
    <div
      role="main"
      aria-label="DecisionOS dashboard"
      style={{
        fontFamily: font.family,
        padding: `${space.xxl} ${space.xxl} 200px`,
        background: isDark ? colors.slate800 : colors.slate50,
        color: isDark ? colors.slate50 : colors.slate800,
        borderRadius: radii.xl,
        maxWidth: '1000px',
        margin: '0 auto',
        boxSizing: 'border-box',
        width: '100%',
        overflowY: 'auto',
        minHeight: '100vh',
      }}
    >
      <style>{fadeKeyframes}</style>

      {failedEngines.length > 0 && (
        <div
          role="status"
          aria-live="polite"
          style={{
            marginBottom: space.lg,
            padding: `${space.md} 14px`,
            borderRadius: radii.md,
            background: isDark ? 'rgba(127,29,29,0.25)' : 'rgba(254,226,226,0.9)',
            border: `1px solid ${colors.red}`,
            fontSize: font.label,
            lineHeight: 1.5,
            animation: 'dosFadeIn 280ms ease-out',
          }}
        >
          <strong>Partial report:</strong> some engines failed ({failedEngines.join(', ')}). Showing available
          DecisionReport sections.
        </div>
      )}

      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: space.xl,
          flexWrap: 'wrap',
          gap: space.md,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }} aria-hidden="true">
            ⚡
          </span>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: font.title, fontWeight: 800, lineHeight: 1.25 }}>
              DecisionOS Operating System
            </h1>
            <p style={{ ...mutedLabel(isDark), margin: `${space.xs} 0 0` }}>
              Interactive Intelligence Dashboard
            </p>
          </div>
        </div>

        <nav aria-label="Dashboard sections" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TABS.map((tab) => {
            const selected = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                aria-pressed={selected}
                aria-label={`Show ${tab} section`}
                onClick={() => setState({ activeTab: tab })}
                onMouseEnter={(e) => {
                  if (!selected) e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                }}
                style={tabButton(selected, isDark)}
              >
                {tab}
              </button>
            );
          })}
        </nav>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: space.xl }}>
        {(activeTab === 'all' || activeTab === 'overview') && (
          <section
            aria-label="Overview"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
              gap: space.xl,
              alignItems: 'stretch',
            }}
          >
            <OverviewCard
              objective={objective}
              decisionType={decisionType}
              confidenceScore={confidenceScore}
              verdict={verdict}
              executionTimeMs={executionTimeMs}
              isDark={isDark}
            />
            <ConfidenceGauge confidence={confidenceScore} isDark={isDark} />
          </section>
        )}

        {(activeTab === 'all' || activeTab === 'timeline') && (
          <ExecutionTimeline
            explanations={explainabilityEngines}
            stageBreakdown={stageBreakdown}
            isDark={isDark}
          />
        )}

        {(activeTab === 'all' || activeTab === 'financial') && (
          <FinancialSummary
            estimatedCost={finance.estimatedCost ?? finance.startupCost ?? 'Unavailable'}
            estimatedRevenue={finance.estimatedRevenue ?? finance.revenue ?? 'Unavailable'}
            roi={finance.netRoi ?? finance.roi ?? 'Unavailable'}
            breakEvenMonths={finance.breakEvenMonths}
            isDark={isDark}
          />
        )}

        {(activeTab === 'all' || activeTab === 'risk') && (
          <RiskMatrix
            identifiedRisks={identifiedRisks}
            mitigations={mitigations}
            riskScore={riskScore}
            overallRiskLevel={overallRiskLevel}
            isDark={isDark}
          />
        )}

        {(activeTab === 'all' || activeTab === 'research') && (
          <ResearchSummary
            assumptions={assumptions.length > 0 ? assumptions : researchFindings.slice(0, 5)}
            limitations={limitations}
            findings={researchFindings}
            isDark={isDark}
          />
        )}

        {(activeTab === 'all' || activeTab === 'tree') && (
          <DecisionTree
            objective={objective}
            verdict={verdict}
            alternatives={alternatives}
            nextSteps={recommendations}
            isDark={isDark}
          />
        )}

        {(activeTab === 'all' || activeTab === 'verdict') && (
          <RecommendationPanel
            summary={recommendationSummary}
            recommendations={recommendations}
            pros={pros}
            cons={cons}
            verdict={verdict}
            isDark={isDark}
          />
        )}
      </div>
      <div aria-hidden="true" style={{ height: 240, flexShrink: 0 }} />
    </div>
  );
}
