import { NextResponse } from 'next/server';

export interface KnowledgeCardResponse {
  id: string;
  problem: string;
  errorType: string;
  stacktrace: string;
  environment: {
    language: string;
    version?: string;
    framework?: string;
    packageVersions?: Record<string, string>;
  };
  patch: string;
  verification: {
    status: string;
    score: number;
    lastVerified: string;
    sandbox: string;
    exitCode: number;
    durationMs: number;
    stdout: string;
    stderr: string;
  };
  metrics: {
    reuseCount: number;
  };
  provenance?: {
    source: string;
    category: string;
    addedAt: string;
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase().trim() || '';
    const language = searchParams.get('language')?.toLowerCase().trim() || '';
    const errorType = searchParams.get('errorType')?.toLowerCase().trim() || '';

    const esUrl = process.env.ELASTICSEARCH_URL;

    if (!esUrl) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'ELASTICSEARCH_UNCONFIGURED',
            message:
              'ELASTICSEARCH_URL is not set. Set ELASTICSEARCH_URL in your environment variables to connect to your Elasticsearch cluster.',
          },
        },
        { status: 500 }
      );
    }

    const authHeader = process.env.ELASTICSEARCH_API_KEY
      ? `ApiKey ${process.env.ELASTICSEARCH_API_KEY}`
      : undefined;

    const esResponse = await fetch(`${esUrl}/hacksmymachine-fixes/_search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify({
        size: 100,
        query: { match_all: {} },
      }),
      cache: 'no-store',
    });

    if (!esResponse.ok) {
      const errText = await esResponse.text();
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'ELASTICSEARCH_QUERY_FAILED',
            message: `Elasticsearch returned status ${esResponse.status}: ${errText}`,
          },
        },
        { status: esResponse.status }
      );
    }

    const esData = await esResponse.json();
    const cards: KnowledgeCardResponse[] =
      esData.hits?.hits?.map((hit: { _source: KnowledgeCardResponse }) => hit._source) || [];

    let filtered = cards;

    if (query) {
      filtered = filtered.filter(
        (card) =>
          card.problem?.toLowerCase().includes(query) ||
          card.id?.toLowerCase().includes(query) ||
          card.errorType?.toLowerCase().includes(query) ||
          card.stacktrace?.toLowerCase().includes(query) ||
          card.patch?.toLowerCase().includes(query)
      );
    }

    if (language) {
      filtered = filtered.filter((card) => card.environment?.language?.toLowerCase() === language);
    }

    if (errorType) {
      filtered = filtered.filter((card) => card.errorType?.toLowerCase() === errorType);
    }

    return NextResponse.json({
      ok: true,
      total: filtered.length,
      isLiveElastic: true,
      cards: filtered,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'FETCH_ERROR',
          message: `Failed to query Elasticsearch: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}
