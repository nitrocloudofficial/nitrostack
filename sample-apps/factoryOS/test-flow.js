import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';

const DB_PATH = path.join(process.cwd(), 'factory.db');

async function runTest() {
  console.log('--- STARTING FACTORYOS END-TO-END INTEGRATION TEST ---');
  
  // 1. Reset/Seed the database
  console.log('\n[1] Seeding database...');
  await new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) reject(err);
    });

    db.serialize(() => {
      // Seed default machine values
      db.run(`UPDATE machines SET status = 'Operational', health = 'green', temperature_c = 68.0, vibration_mm_s = 0.04 WHERE id = 'M12'`);
      db.run(`UPDATE inventory SET on_hand = 0 WHERE part_number = 'bearing_X52'`);
      db.run(`DELETE FROM purchase_orders`);
      db.run(`DELETE FROM safety_incidents`);
      db.run(`UPDATE production_lines SET status = 'Operational', active_job = 'JOB-8821' WHERE id = 'Line1'`);
      resolve();
    });
  });
  console.log('Database seeded.');

  // Helper for fetch
  const apiFetch = async (url, options = {}) => {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`HTTP Error: ${res.status} ${await res.text()}`);
    return await res.json();
  };

  // 2. Query initial M12 Machine state via Express API
  console.log('\n[2] Checking initial M12 state...');
  const m12Init = await apiFetch('http://localhost:4000/api/machines/M12');
  console.log('M12 Status:', m12Init.data.status, '| Health:', m12Init.data.health, '| Temp:', m12Init.data.temperature_c, 'C');

  // 3. Apply scenario patch manually (emulates applyScenario tool)
  console.log('\n[3] Applying bearing_failure scenario patch to DB...');
  let scenarioPath = path.join(process.cwd(), 'scenarios', 'bearing_failure.json');
  if (!fs.existsSync(scenarioPath)) {
    scenarioPath = path.join(process.cwd(), 'factoryos-data', 'scenarios', 'bearing_failure.json');
  }
  const scenario = JSON.parse(fs.readFileSync(scenarioPath, 'utf8'));
  
  const db = new sqlite3.Database(DB_PATH);
  await new Promise((resolve) => {
    db.serialize(() => {
      db.run(`UPDATE machines SET temperature_c = 92.0, vibration_mm_s = 8.1, status = 'Fault', health = 'red' WHERE id = 'M12'`);
      db.run(`INSERT INTO safety_incidents (incident_id, location, severity, description, status, reported_at, osha_compliance_flagged, timeline) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ['INC-2001', 'Machine M12 area', 'HIGH', scenario.description, 'REPORTED', new Date().toISOString(), 1, '[]']
      );
      resolve();
    });
  });
  db.close();
  console.log('Scenario patch applied.');

  // 4. Query M12 Machine state again (should be in Fault state)
  console.log('\n[4] Querying M12 state after scenario application...');
  const m12Post = await apiFetch('http://localhost:4000/api/machines/M12');
  console.log('M12 Status:', m12Post.data.status, '| Health:', m12Post.data.health, '| Temp:', m12Post.data.temperature_c, 'C | Vibration:', m12Post.data.vibration_mm_s, 'mm/s');

  // 5. Query Inventory for bearing_X52 (should be 0)
  console.log('\n[5] Querying inventory stock level...');
  const inv = await apiFetch('http://localhost:4000/api/inventory?partNumber=bearing_X52');
  console.log('Part:', inv.data.part_number, '| On Hand:', inv.data.on_hand, '| Location:', inv.data.location);

  // 6. Create Purchase Order with Garcia-James (SUP-A) for 1 unit at $126
  console.log('\n[6] Creating Purchase Order...');
  const po = await apiFetch('http://localhost:4000/api/purchase-orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      supplierId: 'SUP-A',
      partNumber: 'bearing_X52',
      quantity: 1,
      agreedPrice: 126.00
    })
  });
  console.log('Created PO:', po.data.poNumber, '| Status:', po.data.status, '| Cost:', po.data.totalAmount, 'USD | ETA:', po.data.etaHours, 'hours');

  // 7. Reroute Line1 to Line2
  console.log('\n[7] Rerouting production lines...');
  const reroute = await apiFetch('http://localhost:4000/api/production-lines/reroute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      affectedLineId: 'Line1',
      alternativeLineId: 'Line2',
      shiftId: 'SHIFT-A'
    })
  });
  console.log('Reroute Status:', reroute.data.status, '| Transferred Job:', reroute.data.transferredJob);

  // 8. Verify Production Line Statuses
  console.log('\n[8] Querying active production lines status...');
  const lines = await apiFetch('http://localhost:4000/api/production-lines');
  lines.data.forEach(line => {
    console.log('Line:', line.id, '| Status:', line.status, '| Active Job:', line.active_job, '| Output Rate:', line.output_rate);
  });

  // 9. Verify Safety Incident Log
  console.log('\n[9] Querying safety incidents...');
  const safety = await apiFetch('http://localhost:4000/api/safety/incidents');
  safety.data.forEach(incident => {
    console.log('Incident ID:', incident.incident_id, '| Location:', incident.location, '| Severity:', incident.severity, '| Status:', incident.status);
  });

  console.log('\n--- INTEGRATION TEST COMPLETED SUCCESSFULLY ---');
}

runTest().catch(console.error);
