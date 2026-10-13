import { ResourceDecorator as Resource } from '@nitrostack/core';
import { query } from '../db/client.js';

export class DataResources {
  
  @Resource({
    uri: 'ngos://registered',
    name: 'Registered NGOs',
    description: 'Get a list of all registered NGOs',
    mimeType: 'application/json'
  })
  async get_all_ngos() {
    const res = await query('SELECT * FROM ngos');
    return {
      mimeType: 'application/json',
      text: JSON.stringify(res.rows, null, 2)
    };
  }

  @Resource({
    uri: 'donations://active',
    name: 'Active Donations',
    description: 'Get a list of active unmatched or partially matched donations',
    mimeType: 'application/json'
  })
  async get_active_donations() {
    const res = await query(`
      SELECT * FROM donations 
      WHERE status IN ('pending', 'matching', 'partially_allocated')
    `);
    return {
      mimeType: 'application/json',
      text: JSON.stringify(res.rows, null, 2)
    };
  }

  @Resource({
    uri: 'donations://{id}',
    name: 'Donation Details',
    description: 'Get full details of a specific donation including allocations and deliveries',
    mimeType: 'application/json'
  })
  async get_donation_by_id(id: string) {
    const donationRes = await query(`SELECT * FROM donations WHERE id = $1`, [id]);
    const callsRes = await query(`SELECT * FROM calls WHERE donation_id = $1`, [id]);
    const allocsRes = await query(`SELECT * FROM allocations WHERE donation_id = $1`, [id]);
    
    if (donationRes.rows.length === 0) {
      throw new Error(`Donation ${id} not found`);
    }

    return {
      mimeType: 'application/json',
      text: JSON.stringify({
        donation: donationRes.rows[0],
        calls: callsRes.rows,
        allocations: allocsRes.rows
      }, null, 2)
    };
  }

  @Resource({
    uri: 'logs://donation/{id}',
    name: 'Donation Logs',
    description: 'Get all event logs for a specific donation for auditing',
    mimeType: 'application/json'
  })
  async get_donation_logs(id: string) {
    const res = await query(`SELECT * FROM logs WHERE donation_id = $1 ORDER BY created_at ASC`, [id]);
    return {
      mimeType: 'application/json',
      text: JSON.stringify(res.rows, null, 2)
    };
  }
}
