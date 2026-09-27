import { ToolDecorator as Tool, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { erpStore } from '../lib/erp-store.js';

export const CreatePartySchema = z.object({
  name: z.string().describe('Customer or Supplier Business Name (e.g. Apex Fabrics Ltd.)'),
  gstin: z.string().optional().describe('15-digit GSTIN (e.g. 33BBBBB1111B2Z2)'),
  phone: z.string().optional().describe('Contact Phone Number'),
  email: z.string().optional().describe('Contact Email Address'),
  address: z.string().optional().describe('Billing / Business Address'),
  state: z.string().optional().default('Tamil Nadu').describe('State Name'),
  stateCode: z.string().optional().default('33').describe('State Code (33 for TN, 03 for Punjab, etc.)'),
  openingBalance: z.number().optional().default(0).describe('Opening balance amount in INR'),
  balanceType: z.enum(['Receivable', 'Payable']).optional().default('Receivable').describe('Receivable if customer owes you, Payable if you owe supplier'),
});

export const ListPartiesSchema = z.object({
  searchQuery: z.string().optional().describe('Filter party by name, phone, or GSTIN'),
});

export const GetPartySchema = z.object({
  partyName: z.string().describe('Party Name or GSTIN to look up'),
});

@Injectable()
export class PartyTools {
  @Tool({
    name: 'create_party',
    description: 'Add a new customer or supplier business record with GSTIN, contact details, and opening balance.',
    inputSchema: CreatePartySchema,
  })
  async createParty(args: z.infer<typeof CreatePartySchema>, ctx: ExecutionContext) {
    ctx.logger.info('Creating party record', { name: args.name });

    const newParty = erpStore.addParty({
      name: args.name,
      gstin: args.gstin || 'UNREGISTERED',
      phone: args.phone || '',
      email: args.email || '',
      address: args.address || 'N/A',
      state: args.state || 'Tamil Nadu',
      stateCode: args.stateCode || '33',
      openingBalance: args.openingBalance ?? 0,
      balanceType: args.balanceType || 'Receivable',
    });

    return {
      message: `Party '${newParty.name}' added successfully!`,
      party: newParty,
    };
  }

  @Tool({
    name: 'list_parties',
    description: 'List registered customers and suppliers with current balance, GSTIN, and contact details.',
    inputSchema: ListPartiesSchema,
  })
  async listParties(args: z.infer<typeof ListPartiesSchema>, ctx: ExecutionContext) {
    let parties = erpStore.getParties();

    if (args.searchQuery) {
      const q = args.searchQuery.toLowerCase();
      parties = parties.filter(
        p => p.name.toLowerCase().includes(q) || p.gstin.toLowerCase().includes(q) || p.phone.includes(q)
      );
    }

    return {
      totalParties: parties.length,
      parties,
    };
  }

  @Tool({
    name: 'get_party_details',
    description: 'Get complete profile, GSTIN, address, and current account balance for a specific customer/supplier.',
    inputSchema: GetPartySchema,
  })
  async getPartyDetails(args: z.infer<typeof GetPartySchema>, ctx: ExecutionContext) {
    const party = erpStore.getPartyByName(args.partyName);

    if (!party) {
      return { error: `No customer or supplier matching '${args.partyName}' was found.` };
    }

    return { party };
  }
}
