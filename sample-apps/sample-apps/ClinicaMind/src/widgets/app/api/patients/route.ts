import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { PatientService } from '../../../../services/patient.service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || searchParams.get('query') || searchParams.get('mrn') || searchParams.get('phone') || '';
    const patients = PatientService.getPatients(query);
    return NextResponse.json({ success: true, count: patients.length, data: patients });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch patients' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.firstName || !body.lastName || !body.phone) {
      return NextResponse.json({ success: false, error: 'firstName, lastName, and phone are required fields' }, { status: 400 });
    }
    const patient = PatientService.createPatient(body);
    return NextResponse.json({ success: true, data: patient }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to create patient' }, { status: 500 });
  }
}
