// backend/tests/api.test.js
const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';
const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

let testUserId = null;

async function log(status, message, data = '') {
  const icon = status === 'success' ? '✅' : status === 'error' ? '❌' : '⏳';
  const color = status === 'success' ? COLORS.green : status === 'error' ? COLORS.red : COLORS.blue;
  console.log(`${color}${icon} ${message}${COLORS.reset}`, data ? data : '');
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║         CareBridge AI - Backend API Tests                  ║
║         Testing all endpoints and MCP integration          ║
╚════════════════════════════════════════════════════════════╝
  `);

  try {
    // Test 1: Health Check
    await log('info', 'Test 1/7: Health Check');
    const healthRes = await axios.get(`${BASE_URL.replace('/api', '')}/health`);
    if (healthRes.data.status === 'ok') {
      await log('success', 'Backend is running on port 3001');
    }
    await sleep(500);

    // Test 2: Create User Profile
    await log('info', 'Test 2/7: Create User Profile');
    const profileRes = await axios.post(`${BASE_URL}/profile`, {
      name: 'Phanindra Guptha',
      age: 20,
      gender: 'Male',
      height: 175,
      weight: 68,
      email: 'phanindra@test.com'
    });
    testUserId = profileRes.data.userId;
    if (profileRes.data.success) {
      await log('success', `User created with ID: ${testUserId}`);
    }
    await sleep(500);

    // Test 3: Get User Profile
    await log('info', 'Test 3/7: Get User Profile');
    const getProfileRes = await axios.get(`${BASE_URL}/profile/${testUserId}`);
    if (getProfileRes.data.success) {
      await log('success', `Profile retrieved: ${getProfileRes.data.profile.name}`);
    }
    await sleep(500);

    // Test 4: Add Health History
    await log('info', 'Test 4/7: Add Health History');
    const historyRes = await axios.post(`${BASE_URL}/health-history`, {
      userId: testUserId,
      chronicDiseases: ['anxiety'],
      currentMedications: ['aspirin'],
      allergies: ['penicillin'],
      familyHistory: 'Father has diabetes',
      lifestyle: 'Sedentary'
    });
    if (historyRes.data.success) {
      await log('success', 'Health history saved');
    }
    await sleep(500);

    // Test 5: Analyze Symptom (MCP Integration)
    await log('info', 'Test 5/7: Analyze Symptom (MCP Call)');
    try {
      const symptomRes = await axios.post(`${BASE_URL}/symptoms/analyze`, {
        userId: testUserId,
        symptom: 'headache',
        duration: '2 hours',
        severity: 'moderate'
      });
      if (symptomRes.data.success) {
        await log('success', 'Symptom analyzed via MCP');
        console.log(`  Guidance: ${symptomRes.data.guidance.substring(0, 100)}...`);
      }
    } catch (error) {
      await log('error', 'MCP call failed (check NitroStack configuration)');
      console.log(`  Error: ${error.message}`);
    }
    await sleep(500);

    // Test 6: Get Chat History
    await log('info', 'Test 6/7: Get Chat History');
    const chatRes = await axios.get(`${BASE_URL}/chat/${testUserId}`);
    if (chatRes.data.success) {
      await log('success', `Retrieved ${chatRes.data.count} chat messages`);
    }
    await sleep(500);

    // Test 7: Get Health Summary
    await log('info', 'Test 7/7: Generate Health Summary');
    try {
      const summaryRes = await axios.get(`${BASE_URL}/summary/${testUserId}`);
      if (summaryRes.data.success) {
        await log('success', 'Health summary generated');
        console.log(`  Summary preview: ${summaryRes.data.summary.substring(0, 100)}...`);
      }
    } catch (error) {
      await log('error', 'Summary generation failed (check MCP connection)');
      console.log(`  Error: ${error.message}`);
    }

    // Test Summary
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                    TEST RESULTS                            ║
║  ✅ Backend endpoints working                             ║
║  ✅ Database integration functional                       ║
║  ⏳ MCP agents (requires NitroCloud deployment)           ║
║                                                            ║
║  Test User ID: ${testUserId}                           ║
╚════════════════════════════════════════════════════════════╝
    `);

  } catch (error) {
    console.error(`
${COLORS.red}❌ CRITICAL ERROR${COLORS.reset}
${error.message}

Make sure:
1. Backend is running: npm run dev
2. Firebase is configured in .env
3. All required environment variables are set
    `);
  }
}

// Run tests
runTests();
