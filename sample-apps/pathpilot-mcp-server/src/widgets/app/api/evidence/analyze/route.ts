import { NextRequest, NextResponse } from 'next/server';
import { analyze } from '../../../../lib/pathpilotInline';

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
  try {
    const bodyText = await req.text();
    let input: any = {};
    try {
      input = JSON.parse(bodyText || '{}');
    } catch {
      input = {};
    }

    try {
      const url = `${REST_ORIGIN.replace(/\/$/, '')}/api/evidence/analyze`;
      const upstream = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: bodyText && bodyText.length > 0 ? bodyText : undefined,
        cache: 'no-store',
      });
      const txt = await upstream.text();
      let upstreamJSON: any;
      try { upstreamJSON = JSON.parse(txt); } catch { upstreamJSON = null; }
      if (upstream.ok && upstreamJSON) {
        const unwrapped = unwrapEnvelope(upstreamJSON);
        if (!unwrapped.isError && unwrapped.data) {
          const plain = { ...unwrapped.data, warnings: unwrapped.warnings };
          return NextResponse.json(plain, { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' } });
        }
      }
      return new NextResponse(txt, {
        status: upstream.status,
        headers: {
          'Content-Type': upstream.headers.get('Content-Type') || 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (_err) {
      const result = await analyze({
        repo: input.repo,
        includeLinkedIn: input.includeLinkedIn !== false,
        useDemoLinkedIn: input.options?.useDemoLinkedIn !== false,
      });
      if (!result.repository && input.repo) {
        result.warnings.push(
          'GitHub evidence collected directly via public GitHub API (unauthenticated: 60 req/hr). PathPilot MCP REST server (' + REST_ORIGIN + ') not reachable — set GITHUB_TOKEN or boot REST server for higher rate limit + shared cache.'
        );
      } else if (!input.repo) {
        result.warnings.push(
          '[info] LinkedIn-only demo analysis. Paste a GitHub repo above or start PathPilot MCP REST server (' + REST_ORIGIN + ') for the full evidence fusion pipeline with shared cache.'
        );
      }
      return NextResponse.json(result, { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
    }
  } catch (err: any) {
    const requestId = `req_${Date.now()}`;
    return NextResponse.json(
      {
        analysisId: `error-${requestId}`,
        dashboardId: `error-${requestId}`,
        skills: [], skillOrder: [], evidenceCards: [], summary: { headline: 'Error running analysis', topStrengths: [], priorityGaps: [], counts: { verified: 0, partial: 0, selfReported: 0, missing: 0 }, nSkills: 0, profileLabel: '', repoLabel: '', repoEvidenceCount: 0, liSkillCount: 0 },
        roadmap: { groups: [], signal: { verified: [], selfReported: [], partial: [], missing: [], priorityGap: '', rationale: String(err?.message || String(err)) } },
        warnings: [`Analyze route error: ${err?.message || String(err)}`],
      } as any,
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

export async function GET(_req: NextRequest) {
  return NextResponse.json(
    {
      message: 'POST to this endpoint: { repo?, pathway?, includeLinkedIn?, options? }',
      docs: 'See PathPilot PRD page 12 — analyze_evidence_profile tool contract.',
    },
    { status: 405, headers: { 'Access-Control-Allow-Origin': '*', Allow: 'POST' } }
  );
}

export const dynamic = 'force-dynamic';
