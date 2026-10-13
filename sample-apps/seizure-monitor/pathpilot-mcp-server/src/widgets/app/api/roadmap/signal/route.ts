import { NextRequest, NextResponse } from 'next/server';
import { analyze, getAnalysisById, SKILL_ORDER } from '../../../../lib/pathpilotInline';

const REST_ORIGIN =
  process.env.PATHPILOT_REST_ORIGIN ||
  `http://127.0.0.1:${process.env.REST_PORT || '3002'}`;

function unwrapEnvelope<T = any>(envelopeOrPlain: any): { data: T; warnings: string[]; isError: boolean; errorCode?: string } {
  if (envelopeOrPlain && typeof envelopeOrPlain === 'object' && ('requestId' in envelopeOrPlain) && ('status' in envelopeOrPlain)) {
    const env = envelopeOrPlain as any;
    return {
      data: env.data as T,
      warnings: Array.isArray(env.warnings) ? env.warnings : [],
      isError: env.status === 'error',
      errorCode: env.error?.code,
    };
  }
  return { data: envelopeOrPlain as T, warnings: [], isError: false };
}

export async function POST(req: NextRequest) {
  const url = `${REST_ORIGIN.replace(/\/$/, '')}/api/roadmap/signal`;
  let bodyText: string | undefined;
  try { bodyText = await req.text(); } catch { bodyText = undefined; }
  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': req.headers.get('Content-Type') || 'application/json',
        Accept: 'application/json',
      },
      body: (bodyText && bodyText.length > 0) ? bodyText : undefined,
      cache: 'no-store',
    });
    const txt = await upstream.text();
    if (upstream.ok) {
      let upstreamJSON: any;
      try { upstreamJSON = JSON.parse(txt); } catch { upstreamJSON = null; }
      if (upstreamJSON) {
        const unwrapped = unwrapEnvelope(upstreamJSON);
        if (!unwrapped.isError && unwrapped.data) {
          const plain = { ...unwrapped.data, warnings: unwrapped.warnings };
          return NextResponse.json(plain, { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' } });
        }
      }
    }
    return new NextResponse(txt, {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('Content-Type') || 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (_err) {
    let input: any = {};
    try { input = JSON.parse(bodyText || '{}'); } catch { input = {}; }
    let analysis = input.analysis;
    if (!analysis && input.analysisId) analysis = getAnalysisById(input.analysisId);
    if (analysis && analysis.skills && analysis.roadmap) {
      const counts = { verified: 0, partial: 0, selfReported: 0, missing: 0 };
      for (const e of analysis.skills) {
        if (e.status === 'Verified') counts.verified++;
        else if (e.status === 'Partial') counts.partial++;
        else if (e.status === 'Self-reported') counts.selfReported++;
        else counts.missing++;
      }
      const strengths = analysis.skills
        .filter((e: any) => e.status === 'Verified' || e.status === 'Self-reported')
        .sort((a: any, b: any) => SKILL_ORDER.indexOf(a.name) - SKILL_ORDER.indexOf(b.name))
        .slice(0, 3)
        .map((e: any) => e.name);
      const roadmapSignal = analysis.roadmap.signal;
      const dashboard = {
        id: `dash_${input.analysisId || 'inline'}`, analysisId: analysis.analysisId || input.analysisId,
        counts,
        topStrengths: strengths,
        priorityGap: roadmapSignal?.priorityGap || '',
        priorityGaps: analysis.summary?.priorityGaps || [],
        headline: analysis.summary?.headline || 'Roadmap built from widget inline cache.',
        createdAt: analysis.createdAt || new Date().toISOString(),
      };
      const result: any = {
        analysisId: analysis.analysisId || input.analysisId,
        dashboard,
        signal: roadmapSignal,
        priorityGap: roadmapSignal?.priorityGap,
        suggestedTask: roadmapSignal?.suggestedTask,
        rationale: roadmapSignal?.rationale,
        groups: analysis.roadmap.groups || [],
        warnings: ['Served from widget inline cache (PathPilot MCP REST not reachable).'],
      };
      return NextResponse.json(result, { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
    }
    if (!analysis && !input.analysisId && !input.repo) {
      const demo = await analyze({ includeLinkedIn: true, useDemoLinkedIn: true });
      return NextResponse.json({
        analysisId: demo.analysisId,
        dashboard: {
          id: demo.dashboardId, analysisId: demo.analysisId,
          counts: demo.summary.counts,
          topStrengths: demo.summary.topStrengths,
          priorityGap: demo.roadmap.signal.priorityGap,
          priorityGaps: demo.summary.priorityGaps,
          headline: demo.summary.headline,
          createdAt: demo.createdAt || new Date().toISOString(),
        },
        signal: demo.roadmap.signal,
        priorityGap: demo.roadmap.signal.priorityGap,
        suggestedTask: demo.roadmap.signal.suggestedTask,
        rationale: demo.roadmap.signal.rationale,
        groups: demo.roadmap.groups,
        warnings: [...demo.warnings, 'Ran inline demo fallback for roadmap signal (no upstream REST).'],
      }, { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
    }
    return NextResponse.json(
      {
        analysisId: input.analysisId || 'req_' + Date.now(),
        signal: { verified: [], selfReported: [], partial: [], missing: [], priorityGap: '', rationale: 'No analysis available to build roadmap signal.' },
        groups: [],
        warnings: [`Upstream ${REST_ORIGIN} unreachable and no inline analysis available. Run analyze first.`],
      } as any,
      { status: 503, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

export const dynamic = 'force-dynamic';
