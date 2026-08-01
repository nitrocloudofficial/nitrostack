import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    console.error(`[Google OAuth Callback] Authorization error received: ${error}`);
    return NextResponse.redirect(new URL(`/?oauth_error=${encodeURIComponent(error)}`, request.url));
  }

  if (code) {
    console.log(`[Google OAuth Callback] Successfully received authorization code from Google OAuth consent screen.`);
    // Code can be exchanged for tokens via token endpoint
    return NextResponse.redirect(new URL('/?oauth_success=true', request.url));
  }

  return NextResponse.redirect(new URL('/', request.url));
}
