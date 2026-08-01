import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { VisitService } from '../../../../../services/visit.service';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const visitDetails = VisitService.getVisitDetails(params.id);
    if (!visitDetails) {
      return NextResponse.json({ success: false, error: 'Visit not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: visitDetails });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch visit' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const updated = VisitService.updateVisit(params.id, body);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Visit not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to update visit' }, { status: 500 });
  }
}
