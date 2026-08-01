import { ToolDecorator as Tool, ControllerDecorator as Controller, Widget, ExecutionContext, z } from '@nitrostack/core';
import { McpClientsService } from '../../services/mcp-clients.service.js';

/**
 * Supply Chain Agent — Outbound Tools
 *
 * Handles: Stage 4 (SLA Deadlines) and Stage 5 (Shipping & Rate Shopping)
 */
@Controller('supply_chain_outbound')
export class SupplyChainOutboundTools {
  private mcpClients = new McpClientsService();

  // ══════════════════════════════════════════════════════════
  // STAGE 4: Order Picking
  // ══════════════════════════════════════════════════════════

  /**
   * audit_sla_deadlines
   * Monitors outbound orders against carrier cutoff times.
   */
  @Tool({
    name: 'audit_sla_deadlines',
    description:
      'Checks outbound orders against carrier cutoff times to identify orders in jeopardy of missing their shipping SLA.',
    inputSchema: z.object({
      time_horizon_minutes: z.number().describe('Lookahead window in minutes (e.g., 60 for next hour cutoffs)'),
    }),
  })
  async auditSlaDeadlines(
    input: { time_horizon_minutes: number },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Auditing SLA deadlines', input);

    // Mock logic: Flagging a critical order
    await this.mcpClients.sendSlackMessage(
      '#shipping-team',
      `🚨 *SLA JEOPARDY:* Order ORD-TATA-999 for Tata Motors is 45 minutes away from the 16:00 cutoff time. $5,000 penalty at risk! Initiating priority pick.`
    );

    await this.mcpClients.sendGmailEmail(
      'logistics@tatamotors.com',
      'Update: Your order ORD-TATA-999 is being prioritized',
      'Hello Tata Motors,\n\nWe noticed your order ORD-TATA-999 is nearing its shipping cutoff. We have automatically bumped it to priority processing to ensure it makes the truck today.\n\nThank you,\nFlowLogix automated SLA system'
    );

    return {
      hasAtRiskOrders: true,
      atRiskOrders: [
        {
          orderId: 'ORD-TATA-999',
          customer: 'Tata Motors',
          cutoffTime: '16:00',
          minutesRemaining: 45,
          penaltyUsd: 5000,
          status: 'CRITICAL_JEOPARDY',
          recommendedAction: 'Trigger inject_priority_pick immediately to avoid SLA penalty.'
        }
      ]
    };
  }

  // ══════════════════════════════════════════════════════════
  // STAGE 5: Outbound & Shipping
  // ══════════════════════════════════════════════════════════

  /**
   * rate_shop_carriers
   * Compares shipping costs vs. SLA deadlines.
   */
  @Tool({
    name: 'rate_shop_carriers',
    description:
      'Compares live shipping rates across different carriers to find the cheapest way to ship a box while still meeting the delivery deadline.',
    inputSchema: z.object({
      order_id: z.string().describe('The order ID to shop rates for (e.g., "ORD-101")'),
      weight_kg: z.number().describe('Weight of the packaged box'),
      destination_zip: z.string().describe('Destination zip code'),
    }),
  })
  @Widget('carrier-rate-widget')
  async rateShopCarriers(
    input: { order_id: string; weight_kg: number; destination_zip: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Rate shopping carriers', input);

    // Mock logic: Finding cheaper FedEx alternative
    return {
      orderId: input.order_id,
      defaultCarrier: { name: 'UPS Next Day Air', costUsd: 120.00, arrival: 'Tomorrow 10:30 AM' },
      recommendedCarrier: { name: 'FedEx Ground', costUsd: 30.00, arrival: 'Tomorrow 4:00 PM' },
      savingsUsd: 90.00,
      slaMet: true,
      message: 'FedEx Ground saves $90 and still meets the delivery promise.'
    };
  }

  /**
   * generate_shipping_label
   * Finalizes the shipment and generates a tracking number.
   */
  @Tool({
    name: 'generate_shipping_label',
    description:
      'Generates a shipping label for the finalized box and optionally emails the customer their tracking number via Gmail MCP.',
    inputSchema: z.object({
      order_id: z.string().describe('The order ID to ship'),
      carrier: z.string().describe('The selected carrier (e.g., "FedEx Ground")'),
      customer_email: z.string().optional().describe('Email to send tracking link to'),
    }),
  })
  async generateShippingLabel(
    input: { order_id: string; carrier: string; customer_email?: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Generating shipping label', input);

    const trackingNumber = `TRK-${Math.floor(Math.random() * 10000000)}`;

    if (input.customer_email) {
      await this.mcpClients.sendGmailEmail(
        input.customer_email,
        `Your Order ${input.order_id} has shipped!`,
        `Good news! Your order has shipped via ${input.carrier}. Tracking: ${trackingNumber}`
      );
    }

    return {
      orderId: input.order_id,
      carrier: input.carrier,
      trackingNumber,
      status: 'LABEL_PRINTED',
      emailSent: !!input.customer_email
    };
  }
}
