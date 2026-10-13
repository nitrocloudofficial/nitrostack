import { NextResponse } from 'next/server';
import { GmailService } from '../../../../../../services/gmail.service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messageId, attachmentId, fileName, mimeType } = body;

    if (!messageId || (!attachmentId && !fileName)) {
      return NextResponse.json(
        { status: 'error', message: 'Missing required parameters (messageId, attachmentId, fileName).' },
        { status: 400 }
      );
    }

    const result = await GmailService.downloadAttachment(messageId, attachmentId, fileName, mimeType);

    if (!result.success) {
      return NextResponse.json({ status: 'error', message: result.message || 'Download failed' }, { status: 500 });
    }

    return NextResponse.json({
      status: 'success',
      attachment: {
        filename: result.filename,
        mimeType: result.mimeType,
        size: result.size,
        localPath: result.localPath,
        downloaded: true
      }
    });
  } catch (error: any) {
    console.error('Error in POST /api/integrations/gmail/download:', error);
    return NextResponse.json({ status: 'error', message: error?.message || 'Server error' }, { status: 500 });
  }
}
