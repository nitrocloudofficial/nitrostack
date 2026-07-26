import { google } from 'googleapis';
import readline from 'readline';
import 'dotenv/config';

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost'
);

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/calendar'
  ]
});

console.log('Open this URL in your browser:');
console.log(authUrl);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('\nPaste the full redirect URL (or just the code) here: ', async (input) => {
  let code = input.trim();

  // If a full URL was pasted, extract just the code param
  if (code.includes('code=')) {
    const match = code.match(/[?&]code=([^&]+)/);
    if (match) {
      code = decodeURIComponent(match[1]);
    }
  }

  console.log('\nUsing code:', code);

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    console.log('\nYour refresh token:');
    console.log(tokens.refresh_token);
  } catch (err) {
    console.error('\nToken exchange failed:', err.message);
  }

  rl.close();
});