import { NextRequest, NextResponse } from 'next/server';
import { reconcileCase } from '@/lib/mcp-client';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get('patientId') || 'PAT-01';
  const procedureCode = searchParams.get('procedureCode') || 'CGHS-CARD-001';
  const city = searchParams.get('city') || 'Chennai';
  const hospitalBilledAmount = Number(searchParams.get('hospitalBilledAmount')) || 65000;

  try {
    const data = await reconcileCase({
      patientId,
      procedureCode,
      city,
      hospitalBilledAmount,
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reconcile case';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await reconcileCase({
      patientId: body.patientId || 'PAT-01',
      procedureCode: body.procedureCode || 'CGHS-CARD-001',
      city: body.city || 'Chennai',
      hospitalBilledAmount: Number(body.hospitalBilledAmount) || 65000,
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reconcile case';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
