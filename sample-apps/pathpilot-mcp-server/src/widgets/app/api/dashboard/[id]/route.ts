import { NextRequest, NextResponse } from 'next/server';
import { getAnalysisById, getDashboardById, SKILL_ORDER } from '../../../../lib/pathpilotInline';

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

export async function GET(
  _req: NextRequest,
  segment: { params: { id: string } }
) {
  const id = segment.params.id;
  try {
    const upstream = await fetch(`${REST_ORIGIN.replace(/\/$/, '')}/api/dashboard/${encodeURIComponent(id)}`, {
      headers: { Accept: 'application/json' },
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
    // 1) First: lookup directly in DASHBOARD_CACHE via dashboardId
    const cached = getDashboardById(id);
    if (cached) {
      const response: any = { ...cached };
      response.warnings = [...((cached as any).warnings || []), '[info] Served from widget inline cache (PathPilot MCP REST not reachable).'];
      return NextResponse.json(response, { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
    }
    // 2) Fallback: maybe id is an analysisId, so rebuild from ANALYSIS_CACHE
    const analysis = getAnalysisById(id);
    if (analysis && analysis.skills) {
      const counts = { verified: 0, partial: 0, selfReported: 0, missing: 0 };
      for (const e of analysis.skills) {
        if (e.status === 'Verified') counts.verified++;
        else if (e.status === 'Partial') counts.partial++;
        else if (e.status === 'Self-reported') counts.selfReported++;
        else counts.missing++;
      }
      const strengths = analysis.skills
        .filter((e) => e.status === 'Verified' || e.status === 'Self-reported')
        .sort((a, b) => SKILL_ORDER.indexOf(a.name) - SKILL_ORDER.indexOf(b.name))
        .slice(0, 3)
        .map((e) => e.name);
      const dashboard = {
        id, analysisId: analysis.analysisId || id,
        counts,
        topStrengths: strengths,
        priorityGap: analysis.roadmap?.signal?.priorityGap || analysis.summary?.priorityGaps?.[0] || '',
        priorityGaps: analysis.summary?.priorityGaps || [],
        headline: analysis.summary?.headline || 'Dashboard built from widget inline cache.',
        createdAt: analysis.createdAt || new Date().toISOString(),
        warnings: ['[info] Rebuilt from analysis inline cache (PathPilot MCP REST not reachable).'],
      };
      return NextResponse.json(dashboard, { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
    }
    return NextResponse.json(
      {
        id, analysisId: id,
        counts: { verified: 0, partial: 0, selfReported: 0, missing: 0 },
        topStrengths: [], priorityGap: '', priorityGaps: [], headline: 'Dashboard not found.',
        createdAt: new Date().toISOString(),
        warnings: [
          `Upstream ${REST_ORIGIN} unreachable and dashboard ${id} not found in widget inline cache.`,
          'Run analyze first to create dashboard (TTL 10 minutes).',
        ],
      } as any,
      { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

export const dynamic = 'force-dynamic';
