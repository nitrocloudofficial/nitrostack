import http from 'http';

const args = process.argv.slice(2);
const incidentId = args[0];
const serviceName = args[1] || 'payment_gateway';

if (!incidentId) {
  console.error('\x1b[31mError: Please specify an Incident ID.\x1b[0m');
  console.log('Usage: npm run approve <incident_id> [service_name]');
  process.exit(1);
}

const data = JSON.stringify({
  incident_id: incidentId,
  service_name: serviceName
});

const req = http.request({
  hostname: 'localhost',
  port: 3100,
  path: '/approve',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    if (res.statusCode === 200) {
      const response = JSON.parse(body);
      console.log('\x1b[32m✔ Success: Rollback approved!\x1b[0m');
      console.log(`Incident ID: ${response.incident_id}`);
      console.log(`JWT Signature Issued: ${response.jwt_preview}`);
      console.log(`Expiration: ${response.token_expires_in}`);
      console.log('\x1b[36mTell the AI to retry the rollback tool now.\x1b[0m');
    } else {
      console.error(`\x1b[31mError (${res.statusCode}): ${body}\x1b[0m`);
    }
  });
});

req.on('error', (error) => {
  console.error('\x1b[31mError: Could not connect to the Zero-Trust-Commander server.\x1b[0m');
  console.error('Make sure the MCP server is running (e.g. connected in your AI client).');
  console.error(error.message);
});

req.write(data);
req.end();
