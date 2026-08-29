import { NextRequest, NextResponse } from 'next/server';
import { getAnalysisById } from '../../../../lib/pathpilotInline';

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
    const upstream = await fetch(`${REST_ORIGIN.replace(/\/$/, '')}/api/analyses/${encodeURIComponent(id)}`, {
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
    const inline = getAnalysisById(id);
    if (inline) {
      inline.warnings = inline.warnings || [];
      inline.warnings.push('[info] Served from widget inline cache (PathPilot MCP REST not reachable).');
      return NextResponse.json(inline, { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
    }
    return NextResponse.json(
      {
        analysisId: id, dashboardId: id,
        skills: [], skillOrder: [], evidenceCards: [],
        summary: { headline: 'Analysis not found', topStrengths: [], priorityGaps: [], counts: { verified: 0, partial: 0, selfReported: 0, missing: 0 }, nSkills: 0, profileLabel: '', repoLabel: '', repoEvidenceCount: 0, liSkillCount: 0 },
        roadmap: { groups: [], signal: { verified: [], selfReported: [], partial: [], missing: [], priorityGap: '', rationale: '' } },
        warnings: [
          `Upstream ${REST_ORIGIN} unreachable and analysis ${id} not found in widget inline cache. Run POST /api/evidence/analyze first.`,
          'Analysis not found in cache (TTL 10 minutes). Run analyze first.',
        ],
      } as any,
      { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

export const dynamic = 'force-dynamic';
