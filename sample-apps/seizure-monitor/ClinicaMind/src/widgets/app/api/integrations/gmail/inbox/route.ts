import { NextResponse } from 'next/server';
import { GmailService } from '../../../../../../services/gmail.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await GmailService.listIntakeEmails();
    return NextResponse.json({
      status: 'success',
      ...result
    });
  } catch (error: any) {
    console.error('Error in GET /api/integrations/gmail/inbox:', error);
    return NextResponse.json({ status: 'error', message: error?.message || 'Server error' }, { status: 500 });
  }
}
