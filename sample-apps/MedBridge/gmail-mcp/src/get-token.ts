import { google } from 'googleapis';

async function run() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const redirectUri = process.env.GMAIL_REDIRECT_URI || 'urn:ietf:wg:oauth:2.0:oob';
  const authCode = process.env.GMAIL_AUTH_CODE; // optional: set to exchange automatically

  if (!clientId || !clientSecret) {
    console.error('Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in the environment.');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const scopes = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly',
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });

  console.log('\n1) Open this URL in your browser and authorize the application:\n');
  console.log(authUrl);
  console.log('\n2) If you set GMAIL_AUTH_CODE in the environment, this script will exchange it and print tokens.');
  console.log('   Otherwise, after authorizing, copy the code and run:');
  console.log('   GMAIL_AUTH_CODE=<code> node --loader ts-node/esm src/get-token.ts\n');

  if (authCode) {
    try {
      const { tokens } = await oauth2Client.getToken(authCode);
      console.log('\nTokens received:');
      console.log(JSON.stringify(tokens, null, 2));
      console.log('\nStore the refresh_token (tokens.refresh_token) in GMAIL_REFRESH_TOKEN environment variable for long-lived access.');
    } catch (err: any) {
      console.error('Token exchange failed:', err?.message ?? err);
    }
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
