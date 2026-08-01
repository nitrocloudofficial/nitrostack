import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { ClinicalRecordsRepository } from '../../../../../../db/repositories/clinical-records.repository';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const patientId = params.id;
    const allergies = ClinicalRecordsRepository.getAllergies(patientId);
    const medicalHistory = ClinicalRecordsRepository.getMedicalHistory(patientId);
    const currentMedications = ClinicalRecordsRepository.getCurrentMedications(patientId);
    const vitals = ClinicalRecordsRepository.getVitals(patientId);
    const labReports = ClinicalRecordsRepository.getLabReports(patientId);
    const documents = ClinicalRecordsRepository.getDocuments(patientId);

    return NextResponse.json({
      success: true,
      data: {
        patientId,
        allergies,
        medicalHistory,
        currentMedications,
        vitals,
        labReports,
        documents
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch clinical records' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const patientId = params.id;
    const body = await request.json();
    const { type, data } = body;

    let created: any = null;
    const itemData = { ...data, patientId, id: data.id || `rec-${Date.now()}` };

    switch (type) {
      case 'allergy':
        created = ClinicalRecordsRepository.addAllergy(itemData);
        break;
      case 'medicalHistory':
        created = ClinicalRecordsRepository.addMedicalHistory(itemData);
        break;
      case 'medication':
        created = ClinicalRecordsRepository.addCurrentMedication(itemData);
        break;
      case 'vitals':
        created = ClinicalRecordsRepository.addVitals(itemData);
        break;
      case 'labReport':
        created = ClinicalRecordsRepository.addLabReport(itemData);
        break;
      case 'document':
        created = ClinicalRecordsRepository.addDocument(itemData);
        break;
      default:
        return NextResponse.json({ success: false, error: 'Invalid clinical record type specified' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to add clinical record' }, { status: 500 });
  }
}
