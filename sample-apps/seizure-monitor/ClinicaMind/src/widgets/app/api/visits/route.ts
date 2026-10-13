import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { VisitService } from '../../../../services/visit.service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId') || undefined;
    const visits = VisitService.getVisits(patientId);
    return NextResponse.json({ success: true, count: visits.length, data: visits });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch visits' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.patientId) {
      return NextResponse.json({ success: false, error: 'patientId is required to start a visit' }, { status: 400 });
    }
    const visit = VisitService.startVisit(body.patientId, body.chiefComplaint, body.doctorId);
    return NextResponse.json({ success: true, data: visit }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to start visit' }, { status: 500 });
  }
}
