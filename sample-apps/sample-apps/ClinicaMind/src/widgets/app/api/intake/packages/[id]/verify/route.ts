import { NextResponse } from 'next/server';
import { DatabasePopulationAgent } from '../../../../../../../services/intake/database-population.agent';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { action, doctorNotes, rejectionReason, targetPatientId, editedProfile } = body;

    if (!action || !['APPROVE', 'REJECT', 'MERGE'].includes(action)) {
      return NextResponse.json(
        { status: 'error', message: 'Invalid action. Must be APPROVE, REJECT, or MERGE.' },
        { status: 400 }
      );
    }

    const result = await DatabasePopulationAgent.populateDatabaseOnApproval({
      packageId: params.id,
      action,
      doctorNotes,
      rejectionReason,
      targetPatientId,
      editedProfile
    });

    if (!result.success) {
      return NextResponse.json({ status: 'error', message: result.message }, { status: 400 });
    }

    return NextResponse.json({
      status: 'success',
      message: result.message,
      patientId: result.patientId
    });
  } catch (error: any) {
    console.error(`Error in /api/intake/packages/${params.id}/verify:`, error);
    return NextResponse.json({ status: 'error', message: error?.message || 'Server error' }, { status: 500 });
  }
}
