import { NextResponse } from 'next/server';
import { GmailService } from '../../../../../../services/gmail.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const redirectUri = `${protocol}://${host}/api/integrations/gmail/callback`;
    const settingsUrl = `${protocol}://${host}/settings/integrations/gmail`;

    if (error || !code) {
      console.error('[Gmail OAuth Callback] Authorization failed or denied by user:', error);
      return NextResponse.redirect(`${settingsUrl}?error=${encodeURIComponent(error || 'Authorization denied')}`);
    }

    const result = await GmailService.connect(code, redirectUri);

    if (!result.success) {
      return NextResponse.redirect(`${settingsUrl}?error=${encodeURIComponent(result.message || 'Token exchange failed')}`);
    }

    return NextResponse.redirect(`${settingsUrl}?status=connected`);
  } catch (error: any) {
    console.error('Error in /api/integrations/gmail/callback:', error);
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    return NextResponse.redirect(`${protocol}://${host}/settings/integrations/gmail?error=server_error`);
  }
}
