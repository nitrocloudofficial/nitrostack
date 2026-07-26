const { chromium } = require('playwright');
const path = require('path');

async function saveSession() {

  const browser = await chromium.launch({
    headless: false
  });

  const context = await browser.newContext();

  await context.newPage();

  console.log('\n🔐 Login Session Creator');
  console.log('Navigate to your application and log in.');
  console.log('After login, return here and press ENTER.\n');

  await new Promise(resolve =>
    process.stdin.once('data', resolve)
  );
  const pages = context.pages();
await pages[0].waitForURL('**/dashboard**', { timeout: 30000 }).catch(() => {});

  await context.storageState({
    path: path.join(__dirname, 'session.json')
  });

  console.log('✅ Session saved as session.json');

  await browser.close();
}

saveSession();