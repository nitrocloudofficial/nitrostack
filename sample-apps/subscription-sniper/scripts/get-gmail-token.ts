import dotenv from 'dotenv';
import { google } from 'googleapis';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

dotenv.config();

const GMAIL_SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
];
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

const clientId = process.env.GMAIL_CLIENT_ID?.trim();
const clientSecret = process.env.GMAIL_CLIENT_SECRET?.trim();

if (!clientId || !clientSecret) {
    throw new Error('Missing GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET');
}

const client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    REDIRECT_URI,
);

console.log('Using Gmail OAuth clientId:', clientId);
console.log('Using Gmail OAuth redirectUri:', REDIRECT_URI);
console.log('When Google asks you to choose an account, select the Gmail inbox you want NitroStack to read.');

const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: GMAIL_SCOPES,
});

console.log('\nOpen this URL in your browser:\n');
console.log(authUrl);
console.log('\nLog in with the target Gmail account, approve read-only Gmail access, then copy the authorization code shown by Google.\n');

const rl = readline.createInterface({ input, output });

try {
    const code = await rl.question('Paste authorization code here: ');
    const { tokens } = await client.getToken(code.trim());

    if (!tokens.refresh_token) {
        console.log('\nNo refresh_token was returned.');
        console.log('Try again after revoking the app grant in your Google Account, or keep prompt=consent/access_type=offline enabled.');
        process.exitCode = 1;
    } else {
        console.log('\nREFRESH TOKEN:');
        console.log(tokens.refresh_token);
        console.log('\nAdd it to .env as GMAIL_REFRESH_TOKEN=<the token above>');
        console.log('Set GMAIL_ACCOUNT_EMAIL to the Gmail address you selected, for example GMAIL_ACCOUNT_EMAIL=generalusermcp@gmail.com');
    }
} finally {
    rl.close();
}
