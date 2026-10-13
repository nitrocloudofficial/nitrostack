import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { PatientRepository } from '../../../../db/repositories/patient.repository';
import { VisitRepository } from '../../../../db/repositories/visit.repository';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || searchParams.get('query') || '').trim();

    if (!q) {
      return NextResponse.json({ success: true, data: { patients: [], visits: [] } });
    }

    const patients = PatientRepository.search(q);
    const allVisits = VisitRepository.getAll();
    const visits = allVisits.filter((v) =>
      v.id.toLowerCase().includes(q.toLowerCase()) ||
      (v.chiefComplaint && v.chiefComplaint.toLowerCase().includes(q.toLowerCase())) ||
      (v.doctorId && v.doctorId.toLowerCase().includes(q.toLowerCase()))
    );

    return NextResponse.json({
      success: true,
      query: q,
      data: {
        patients,
        visits
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Search execution failed' }, { status: 500 });
  }
}
