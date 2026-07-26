import { NextRequest, NextResponse } from 'next/server';
import { getSyncedEngine } from '@/lib/server/synced-engine';
import { guardRoute } from '@/lib/server/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await guardRoute();
  const { id } = await params;
  const engine = await getSyncedEngine();
  const blueprint = engine.getBlueprintByOpportunityId(id);

  if (!blueprint) {
    return NextResponse.json(
      { error: `No blueprint found for opportunity ID: ${id}` },
      { status: 404 }
    );
  }

  return NextResponse.json({ blueprint });
}
