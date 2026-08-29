import { ResourceDecorator as Resource, ControllerDecorator as Controller, ExecutionContext } from '@nitrostack/core';
import { getTicketStore } from './ticket.tools.js';
import { getIdentityStore, getLicenseStore, getNetworkStore } from './access.tools.js';
import type { Ticket } from './ticket.types.js';

@Controller('access')
export class AccessResources {

  // ---------------------------------------------------------------------------
  // tickets://all — full dashboard feed
  // ---------------------------------------------------------------------------
  @Resource({
    uri: 'tickets://all',
    name: 'All Tickets',
    description:
      'Returns every IT access ticket in the system as a JSON array. ' +
      'Intended for the dashboard widget to display ticket status at a glance.',
    mimeType: 'application/json',
  })
  async getAllTicketsResource(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Resource read: tickets://all');

    const tickets: Ticket[] = getTicketStore();

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(tickets, null, 2),
        },
      ],
    };
  }

  // ---------------------------------------------------------------------------
  // tickets://{ticketId} — single ticket detail
  // ---------------------------------------------------------------------------
  @Resource({
    uri: 'tickets://{ticketId}',
    name: 'Ticket Detail',
    description:
      'Returns the full state of a single IT access ticket, including its diagnosis ' +
      'and resolution steps. Use the ticket ID as the URI parameter, e.g. tickets://TKT-002.',
    mimeType: 'application/json',
  })
  async getTicketResource(uri: string, ctx: ExecutionContext) {
    // Extract the ticketId from the URI (e.g. "tickets://TKT-002" → "TKT-002")
    const ticketId = uri.replace('tickets://', '');
    ctx.logger.info(`Resource read: ${uri}`);

    const tickets: Ticket[] = getTicketStore();
    const ticket = tickets.find(t => t.id === ticketId);

    if (!ticket) {
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ found: false, error: `Ticket ${ticketId} not found` }, null, 2),
          },
        ],
      };
    }

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(ticket, null, 2),
        },
      ],
    };
  }

  // ---------------------------------------------------------------------------
  // identities://all — all employee records
  // ---------------------------------------------------------------------------
  @Resource({
    uri: 'identities://all',
    name: 'All Identities',
    description: 'Returns all employee directory records, group memberships, and account statuses as a JSON array.',
    mimeType: 'application/json',
  })
  async getAllIdentitiesResource(uri: string, ctx: ExecutionContext) {
    ctx?.logger?.info('Resource read: identities://all');
    return {
      contents: [
        {
          uri: uri || 'identities://all',
          mimeType: 'application/json',
          text: JSON.stringify(getIdentityStore(), null, 2),
        },
      ],
    };
  }

  // ---------------------------------------------------------------------------
  // licenses://all — all license pool records
  // ------------------------------------------------.--------------------------
  @Resource({
    uri: 'licenses://all',
    name: 'All Licenses',
    description: 'Returns all software license pools, used seat counts, and required directory groups as a JSON array.',
    mimeType: 'application/json',
  })
  async getAllLicensesResource(uri: string, ctx: ExecutionContext) {
    ctx?.logger?.info('Resource read: licenses://all');
    return {
      contents: [
        {
          uri: uri || 'licenses://all',
          mimeType: 'application/json',
          text: JSON.stringify(getLicenseStore(), null, 2),
        },
      ],
    };
  }

  // ---------------------------------------------------------------------------
  // network://all — all employee VPN/network statuses
  // ---------------------------------------------------------------------------
  @Resource({
    uri: 'network://all',
    name: 'All Network Statuses',
    description: 'Returns the network and VPN connection statuses for all employees as a JSON array.',
    mimeType: 'application/json',
  })
  async getAllNetworkResource(uri: string, ctx: ExecutionContext) {
    ctx?.logger?.info('Resource read: network://all');
    return {
      contents: [
        {
          uri: uri || 'network://all',
          mimeType: 'application/json',
          text: JSON.stringify(getNetworkStore(), null, 2),
        },
      ],
    };
  }
}
