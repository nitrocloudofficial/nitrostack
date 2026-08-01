import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { IntakeOrchestratorService } from '../../../../../services/intake/intake-orchestrator.service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { senderEmail, subject, attachments } = body;

    if (!senderEmail || !attachments || !Array.isArray(attachments) || attachments.length === 0) {
      return NextResponse.json(
        { status: 'error', message: 'Invalid intake payload. Requires senderEmail and attachments array.' },
        { status: 400 }
      );
    }

    const result = await IntakeOrchestratorService.processAutonomousIntake({
      senderEmail,
      subject: subject || 'FWD: Patient Registration & Medical Records',
      attachments
    });

    return NextResponse.json({
      status: 'success',
      message: `Intake package ${result.packageEntity.packageNumber} ingested successfully. Awaiting Doctor verification.`,
      package: result.packageEntity,
      extractedPatient: result.extractedProfile
    });
  } catch (error: any) {
    console.error('Error in /api/intake/ingest:', error);
    return NextResponse.json({ status: 'error', message: error?.message || 'Server error' }, { status: 500 });
  }
}
