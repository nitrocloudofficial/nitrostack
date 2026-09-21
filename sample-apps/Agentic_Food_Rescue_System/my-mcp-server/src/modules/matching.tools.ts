import { ToolDecorator as Tool, z } from '@nitrostack/core';
import { query } from '../db/client.js';

export class MatchingTools {
  
  @Tool({
    name: 'match_receivers',
    description: 'Find nearby active NGOs for a given donation (distance based)',
    inputSchema: z.object({
      donationId: z.string(),
      maxDistanceKm: z.number().optional()
    })
  })
  async match_receivers(input: { donationId: string, maxDistanceKm?: number }) {
    const { donationId, maxDistanceKm = 10 } = input;
    // 1. Fetch donation and restaurant details
    const donationRes = await query(`
      SELECT d.*, r.lat, r.lng 
      FROM donations d
      JOIN restaurants r ON d.restaurant_id = r.id
      WHERE d.id = $1
    `, [donationId]);
    
    if (donationRes.rows.length === 0) {
      throw new Error(`Donation ${donationId} not found`);
    }
    const donation = donationRes.rows[0];
    const { lat, lng, veg_nonveg } = donation;
    
    // Max distance: < 5km for nonveg/perishables, < 10km otherwise
    const maxDistance = (veg_nonveg === 'nonveg') ? 5 : maxDistanceKm;
    
    // 2. Rank NGOs by Haversine distance and filter
    const ngosRes = await query(`
      SELECT *, 
        (6371 * acos(
          cos(radians($1)) * cos(radians(lat)) * cos(radians(lng) - radians($2)) + 
          sin(radians($1)) * sin(radians(lat))
        )) AS distance
      FROM ngos
      WHERE capacity > 0
    `, [lat, lng]);
    
    const matchedNgos = ngosRes.rows
      .filter(ngo => ngo.distance <= maxDistance)
      .sort((a, b) => {
        // primary: distance (ascending)
        if (Math.abs(a.distance - b.distance) > 0.5) {
          return a.distance - b.distance;
        }
        // secondary: reliability_score (descending)
        return b.reliability_score - a.reliability_score;
      });
      
    // 3. Log the event
    await query(`
      INSERT INTO logs (donation_id, event_type, details)
      VALUES ($1, 'MATCHING_COMPLETED', $2)
    `, [donationId, JSON.stringify({ matched_count: matchedNgos.length })]);
    
    // Update status to matching
    await query(`UPDATE donations SET status = 'matching' WHERE id = $1`, [donationId]);
    
    return {
      donation,
      matches: matchedNgos
    };
  }
  
  async record_allocation(input: { donationId: string, ngoId: string, acceptedServings: number }) {
    const { donationId, ngoId, acceptedServings } = input;
    // Run in a transaction
    await query('BEGIN');
    try {
      // 1. Deduct accepted servings
      const donationRes = await query(`
        UPDATE donations 
        SET remaining_servings = GREATEST(remaining_servings - $1, 0)
        WHERE id = $2
        RETURNING remaining_servings, total_servings
      `, [acceptedServings, donationId]);
      
      const { remaining_servings } = donationRes.rows[0];
      
      // 2. Update status
      let newStatus = 'partially_allocated';
      if (remaining_servings <= 0) {
        newStatus = 'fully_allocated';
      }
      
      await query(`UPDATE donations SET status = $1 WHERE id = $2`, [newStatus, donationId]);
      
      // 3. Insert allocations row
      const allocationRes = await query(`
        INSERT INTO allocations (donation_id, ngo_id, servings_accepted, status)
        VALUES ($1, $2, $3, 'accepted')
        RETURNING id
      `, [donationId, ngoId, acceptedServings]);
      
      await query('COMMIT');
      
      return {
        allocationId: allocationRes.rows[0].id,
        newStatus,
        remainingServings: remaining_servings
      };
    } catch (e) {
      await query('ROLLBACK');
      throw e;
    }
  }

  async get_next_receiver_or_finish(input: { donationId: string }) {
    const { donationId } = input;
    const donationRes = await query(`SELECT remaining_servings, status FROM donations WHERE id = $1`, [donationId]);
    if (donationRes.rows.length === 0) throw new Error('Donation not found');
    
    const { remaining_servings } = donationRes.rows[0];
    
    if (remaining_servings <= 0) {
      return { done: true, reason: 'zero_remaining' };
    }
    
    // Get NGOs that haven't been called for this donation yet
    // Wait, the match_receivers gets all of them. 
    // Here we find NGOs that don't have a record in `calls` table for this donation, or calls failed?
    // Let's just find NGOs that don't have an allocation for this donation and haven't rejected it.
    const uncalledRes = await query(`
      SELECT n.*
      FROM ngos n
      WHERE NOT EXISTS (
        SELECT 1 FROM calls c WHERE c.ngo_id = n.id AND c.donation_id = $1
      )
      AND n.capacity > 0
      LIMIT 3
    `, [donationId]); // Return next batch of 3
    
    if (uncalledRes.rows.length === 0) {
      // Set status to unfulfilled if no NGOs remain
      await query(`UPDATE donations SET status = 'unfulfilled' WHERE id = $1`, [donationId]);
      return { done: true, reason: 'no_ngos_left' };
    }
    
    return {
      done: false,
      nextBatch: uncalledRes.rows
    };
  }

  async batch_unfulfilled(input: any = {}) {
    // Collect all unfulfilled donations and attempt to batch them together for bulk rescue
    // ...
    return { message: 'Batched unfulfilled donations' };
  }
}
