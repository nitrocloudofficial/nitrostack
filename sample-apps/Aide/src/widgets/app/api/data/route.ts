import { NextRequest, NextResponse } from 'next/server';

// In-memory store for latest router output
let latestData: Record<string, any> | null = null;
let lastUpdated: string | null = null;

export async function GET() {
  if (!latestData) {
    return NextResponse.json({ data: null, lastUpdated: null });
  }
  return NextResponse.json({ data: latestData, lastUpdated });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    latestData = body;
    lastUpdated = new Date().toISOString();
    return NextResponse.json({ ok: true, lastUpdated });
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
}
