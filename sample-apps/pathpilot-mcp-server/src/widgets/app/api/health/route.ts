import { NextRequest, NextResponse } from 'next/server';

const REST_ORIGIN =
  process.env.PATHPILOT_REST_ORIGIN ||
  `http://127.0.0.1:${process.env.REST_PORT || '3002'}`;

export async function GET(_req: NextRequest) {
  const startTime = Date.now();
  try {
    const upstream = await fetch(`${REST_ORIGIN.replace(/\/$/, '')}/api/health`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    const txt = await upstream.text();
    return new NextResponse(txt, {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('Content-Type') || 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (_err) {
    // Graceful fallback: widget server + inline analysis available
    return NextResponse.json(
      {
        status: 'ok',
        service: 'pathpilot-widget-api',
        version: '1.1.0',
        timestamp: new Date().toISOString(),
        uptimeMs: Date.now() - startTime,
        note: 'Next.js widget API + inline analysis engine are alive. The PathPilot MCP REST server (' + REST_ORIGIN + ') is currently not reachable, but widget inline fallback provides LinkedIn demo + public GitHub API analysis (no caching, unauthenticated rate limits apply).',
        checks: {
          widgetServer: 'ready',
          analysisInline: 'ready',
          analysisRestUpstream: 'unreachable',
        },
        inlineCapabilities: [
          'POST /api/evidence/analyze — inline (LinkedIn demo + direct public GitHub API)',
          'GET  /api/analyses/:id — inline cache (TTL 10 min)',
          'GET  /api/dashboard/:id — inline dashboard summary',
          'POST /api/roadmap/signal — inline roadmap signal',
        ],
      },
      { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

export const dynamic = 'force-dynamic';
