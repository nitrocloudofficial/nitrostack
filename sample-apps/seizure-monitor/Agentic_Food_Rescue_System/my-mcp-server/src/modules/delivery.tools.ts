import { ToolDecorator as Tool, z } from '@nitrostack/core';
import { query } from '../db/client.js';

export class DeliveryTools {
  
  @Tool({
    name: 'assign_executive',
    description: 'Assign the nearest available executive to a delivery',
    inputSchema: z.object({
      allocationId: z.string()
    })
  })
  async assign_executive(input: { allocationId: string }) {
    const { allocationId } = input;
    // 1. Get pickup location (restaurant lat/lng)
    const allocRes = await query(`
      SELECT r.lat, r.lng
      FROM allocations a
      JOIN donations d ON a.donation_id = d.id
      JOIN restaurants r ON d.restaurant_id = r.id
      WHERE a.id = $1
    `, [allocationId]);
    
    if (allocRes.rows.length === 0) throw new Error('Allocation not found');
    const { lat, lng } = allocRes.rows[0];
    
    // 2. Rank available executives by distance
    const execsRes = await query(`
      SELECT *, 
        (6371 * acos(
          cos(radians($1)) * cos(radians(lat)) * cos(radians(lng) - radians($2)) + 
          sin(radians($1)) * sin(radians(lat))
        )) AS distance
      FROM executives
      WHERE available = true
      ORDER BY distance ASC
      LIMIT 1
    `, [lat, lng]);
    
    if (execsRes.rows.length === 0) {
      return { success: false, reason: 'No available executives found' };
    }
    
    const executive = execsRes.rows[0];
    
    // 3. Insert delivery row and mark executive as unavailable
    await query('BEGIN');
    try {
      const deliveryRes = await query(`
        INSERT INTO deliveries (allocation_id, executive_id, status)
        VALUES ($1, $2, 'requested')
        RETURNING id
      `, [allocationId, executive.id]);
      
      // Update allocation status to assigned
      await query(`UPDATE allocations SET status = 'assigned' WHERE id = $1`, [allocationId]);
      
      // Mark executive as unavailable
      await query(`UPDATE executives SET available = false WHERE id = $1`, [executive.id]);
      
      await query('COMMIT');
      
      return {
        success: true,
        deliveryId: deliveryRes.rows[0].id,
        executive
      };
    } catch (e) {
      await query('ROLLBACK');
      throw e;
    }
  }
  
  @Tool({
    name: 'share_contact_info',
    description: 'Share contact info with the NGO, Executive, and Restaurant',
    inputSchema: z.object({
      deliveryId: z.string()
    })
  })
  async share_contact_info(input: { deliveryId: string }) {
    const { deliveryId } = input;
    // In a real scenario, this might trigger SMS or WhatsApp messages.
    // For this tool, we just gather the info and log it.
    const detailsRes = await query(`
      SELECT 
        e.name as exec_name, e.phone as exec_phone,
        r.name as rest_name, r.phone as rest_phone,
        n.name as ngo_name, n.phone as ngo_phone,
        a.id as allocation_id
      FROM deliveries d
      JOIN allocations a ON d.allocation_id = a.id
      JOIN donations dn ON a.donation_id = dn.id
      JOIN restaurants r ON dn.restaurant_id = r.id
      JOIN ngos n ON a.ngo_id = n.id
      JOIN executives e ON d.executive_id = e.id
      WHERE d.id = $1
    `, [deliveryId]);
    
    if (detailsRes.rows.length === 0) throw new Error('Delivery not found');
    const details = detailsRes.rows[0];
    
    // Log the contact sharing event
    await query(`
      INSERT INTO logs (event_type, details)
      VALUES ('CONTACT_INFO_SHARED', $1)
    `, [JSON.stringify(details)]);
    
    return {
      success: true,
      sharedWith: {
        restaurant: details.rest_name,
        ngo: details.ngo_name,
        executive: details.exec_name
      }
    };
  }
  
  @Tool({
    name: 'complete_delivery',
    description: 'Mark a delivery as completed',
    inputSchema: z.object({
      deliveryId: z.string(),
      ngoConfirms: z.boolean(),
      mismatchNote: z.string().optional()
    })
  })
  async complete_delivery(input: { deliveryId: string, ngoConfirms: boolean, mismatchNote?: string }) {
    const { deliveryId, ngoConfirms, mismatchNote } = input;
    await query('BEGIN');
    try {
      // 1. Update delivery status
      await query(`
        UPDATE deliveries 
        SET status = 'delivered', delivered_at = NOW() 
        WHERE id = $1
      `, [deliveryId]);
      
      // 2. Get allocation and executive
      const deliveryRes = await query(`
        SELECT allocation_id, executive_id 
        FROM deliveries 
        WHERE id = $1
      `, [deliveryId]);
      
      if (deliveryRes.rows.length === 0) throw new Error('Delivery not found');
      const { allocation_id, executive_id } = deliveryRes.rows[0];
      
      // 3. Update allocation status based on NGO confirmation
      const newStatus = ngoConfirms ? 'confirmed' : 'disputed';
      await query(`
        UPDATE allocations 
        SET status = $1 
        WHERE id = $2
      `, [newStatus, allocation_id]);
      
      // 4. Free the executive
      if (executive_id) {
        await query(`
          UPDATE executives 
          SET available = true 
          WHERE id = $1
        `, [executive_id]);
      }
      
      // 5. Log the completion
      await query(`
        INSERT INTO logs (event_type, details)
        VALUES ('DELIVERY_COMPLETED', $1)
      `, [JSON.stringify({ deliveryId, ngoConfirms, mismatchNote })]);
      
      await query('COMMIT');
      
      return { success: true, finalStatus: newStatus };
    } catch (e) {
      await query('ROLLBACK');
      throw e;
    }
  }
}
