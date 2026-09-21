import { PromptDecorator as Prompt } from '@nitrostack/core';
import { query } from '../db/client.js';

export class SummaryPrompts {
  
  @Prompt({
    name: 'donation_status_summary',
    description: 'Summarizes the state of a rescue by injecting data from donations resource'
  })
  async get_donation_status_summary(args: { donationId: string }) {
    // In NitroStack, a Prompt can format context for the LLM to read.
    const { donationId } = args;
    const res = await query('SELECT * FROM donations WHERE id = $1', [donationId]);
    if (res.rows.length === 0) return { messages: [{ role: 'user', content: 'Donation not found' }] };
    
    return {
      messages: [
        {
          role: 'user',
          content: `Please summarize the current status of this food donation:\n${JSON.stringify(res.rows[0], null, 2)}\nFocus on remaining servings and whether we need to find more NGOs.`
        }
      ]
    };
  }

  @Prompt({
    name: 'daily_impact_report',
    description: 'Summarizes the day\'s rescued servings'
  })
  async get_daily_impact_report() {
    // Fetch today's delivered allocations
    const res = await query(`
      SELECT SUM(a.servings_accepted) as total_servings, COUNT(d.id) as total_deliveries
      FROM deliveries d
      JOIN allocations a ON d.allocation_id = a.id
      WHERE d.status = 'delivered' AND d.delivered_at >= current_date
    `);
    
    return {
      messages: [
        {
          role: 'user',
          content: `Generate a daily impact report. Today we have rescued ${res.rows[0].total_servings || 0} servings across ${res.rows[0].total_deliveries || 0} successful deliveries. Make it encouraging and suitable for social media.`
        }
      ]
    };
  }

  @Prompt({
    name: 'unfulfilled_followup',
    description: 'Drafts an apology/next-steps message to restaurants for unfulfilled food'
  })
  async get_unfulfilled_followup(args: { donationId: string }) {
    const res = await query(`
      SELECT d.remaining_servings, r.name as restaurant_name 
      FROM donations d
      JOIN restaurants r ON d.restaurant_id = r.id
      WHERE d.id = $1
    `, [args.donationId]);
    
    if (res.rows.length === 0) return { messages: [] };
    
    return {
      messages: [
        {
          role: 'user',
          content: `Draft a polite and empathetic apology message to ${res.rows[0].restaurant_name}. Unfortunately, we could not find NGOs to take ${res.rows[0].remaining_servings} servings of their donation today. Provide some next steps or encouragement for future donations.`
        }
      ]
    };
  }
}
