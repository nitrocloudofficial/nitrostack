import { NextResponse } from 'next/server';
import { IntakeRepository } from '../../../../../../db/repositories/intake.repository';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const pkg = IntakeRepository.getPackageById(params.id);
    if (!pkg) {
      return NextResponse.json({ status: 'error', message: 'Package not found' }, { status: 404 });
    }

    let extracted = null;
    if (pkg.extractedPatient) {
      try {
        extracted = JSON.parse(pkg.extractedPatient);
      } catch (e) {}
    }

    const attachments = IntakeRepository.getAttachmentsByPackageId(pkg.id);

    return NextResponse.json({
      status: 'success',
      package: {
        ...pkg,
        extractedPatient: extracted,
        attachments
      }
    });
  } catch (error: any) {
    console.error(`Error in /api/intake/packages/${params.id}:`, error);
    return NextResponse.json({ status: 'error', message: error?.message || 'Server error' }, { status: 500 });
  }
}
