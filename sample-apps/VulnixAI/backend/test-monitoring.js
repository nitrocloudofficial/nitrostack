// Simple test script to verify monitoring endpoints
// Run with: node backend/test-monitoring.js

const BASE_URL = 'http://localhost:5000';

async function testEndpoints() {
  console.log('Testing monitoring endpoints...\n');

  // Test 1: Health check
  try {
    const healthRes = await fetch(`${BASE_URL}/health`);
    const health = await healthRes.json();
    console.log('✅ Health check:', health);
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return;
  }

  // Test 2: Get monitoring sites (should fail without auth)
  try {
    const sitesRes = await fetch(`${BASE_URL}/api/monitoring`);
    if (sitesRes.status === 401) {
      console.log('✅ Monitoring endpoint exists (401 Unauthorized as expected)');
    } else if (sitesRes.status === 404) {
      console.log('❌ Monitoring endpoint not found (404)');
    } else {
      console.log(`⚠️  Unexpected status: ${sitesRes.status}`);
    }
  } catch (error) {
    console.error('❌ Monitoring endpoint test failed:', error.message);
  }

  console.log('\nIf you see 401 Unauthorized, the endpoint is working correctly!');
  console.log('If you see 404 Not Found, the routes are not registered properly.');
}

testEndpoints();
