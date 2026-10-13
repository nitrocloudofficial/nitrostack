require('dotenv').config();
const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:3000/oauth2callback'
);

const code = '4/0AXEQxIDAuOzc8U2aOxI4AmdyUfIuxcU4U7M0iZn1WC7ZReaeRRYMgkMWoaaUtk4uibKQCA';

oauth2Client.getToken(code)
  .then(({ tokens }) => {
    console.log('\n\n✅ === YOUR PERMANENT REFRESH TOKEN === ✅\n');
    console.log(tokens.refresh_token);
    console.log('\n=========================================\n\n');
  })
  .catch(err => {
    console.error('\n❌ Error getting token (if it says invalid_grant, the code was already used or expired. Generate a new one!).\n', err.message);
  });
