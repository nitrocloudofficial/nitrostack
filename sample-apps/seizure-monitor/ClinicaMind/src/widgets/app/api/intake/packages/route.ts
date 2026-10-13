import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { IntakeRepository } from '../../../../../db/repositories/intake.repository';
import { NotificationAgent } from '../../../../../services/intake/notification.agent';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const packages = IntakeRepository.getPackages(status || undefined);
    const pendingCount = NotificationAgent.getPendingNotificationCount();

    const formattedPackages = packages.map(p => {
      let extracted = null;
      if (p.extractedPatient) {
        try {
          extracted = JSON.parse(p.extractedPatient);
        } catch (e) {}
      }
      const attachments = IntakeRepository.getAttachmentsByPackageId(p.id);
      return {
        ...p,
        extractedPatient: extracted,
        attachmentsCount: attachments.length,
        attachments: attachments.map(a => ({
          id: a.id,
          fileName: a.fileName,
          documentType: a.documentType,
          fileSize: a.fileSize,
          mimeType: a.mimeType,
          uploadedAt: a.uploadedAt
        }))
      };
    });

    return NextResponse.json({
      status: 'success',
      pendingCount,
      totalCount: formattedPackages.length,
      packages: formattedPackages
    });
  } catch (error: any) {
    console.error('Error in /api/intake/packages:', error);
    return NextResponse.json({ status: 'error', message: error?.message || 'Server error' }, { status: 500 });
  }
}
