import { NextResponse } from 'next/server';
import { getSyncedEngine } from '@/lib/server/synced-engine';
import { guardRoute } from '@/lib/server/auth';

export async function GET() {
  await guardRoute();
  const engine = await getSyncedEngine();
  const products = engine.getProducts();
  return NextResponse.json({ products });
}
