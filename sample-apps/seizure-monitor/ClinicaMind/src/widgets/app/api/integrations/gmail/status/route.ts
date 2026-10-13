import { NextResponse } from 'next/server';
import { GmailService } from '../../../../../../services/gmail.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const statusData = GmailService.status();
    return NextResponse.json({
      status: 'success',
      ...statusData
    });
  } catch (error: any) {
    console.error('Error in GET /api/integrations/gmail/status:', error);
    return NextResponse.json({ status: 'error', message: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const result = await GmailService.disconnect();
    return NextResponse.json({
      status: 'success',
      connected: false,
      message: 'Gmail integration disconnected successfully.'
    });
  } catch (error: any) {
    console.error('Error in POST /api/integrations/gmail/status:', error);
    return NextResponse.json({ status: 'error', message: error?.message || 'Server error' }, { status: 500 });
  }
}
