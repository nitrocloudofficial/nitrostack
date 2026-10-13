import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { PatientService } from '../../../../../services/patient.service';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const profile = PatientService.getPatientProfile(params.id);
    if (!profile) {
      return NextResponse.json({ success: false, error: 'Patient not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: profile });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch patient' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const updated = PatientService.updatePatient(params.id, body);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Patient not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to update patient' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const deleted = PatientService.deletePatient(params.id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Patient not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Patient deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to delete patient' }, { status: 500 });
  }
}
