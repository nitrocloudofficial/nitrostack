import { Injectable } from '@nitrostack/core';
import { StoreService } from '../store/store.service.js';
import { Ticket, CreateTicketInput } from '../../common/types.js';
import { LinearProvider } from '../../providers/linear.js';

@Injectable({ deps: [StoreService] })
export class LinearService {
  private provider = new LinearProvider();

  constructor(private store: StoreService) {}

  get enabled(): boolean {
    return this.provider.enabled;
  }

  async createTicket(input: CreateTicketInput): Promise<Ticket> {
    if (this.provider.enabled) {
      return this.provider.createTicket(input);
    }
    return this.store.createTicket(input);
  }

  async getTicket(ticketId: string): Promise<Ticket | null> {
    if (this.provider.enabled) {
      return this.provider.getTicket(ticketId);
    }
    return this.store.getTicket(ticketId) ?? null;
  }

  async getStatus(ticketId: string): Promise<string | null> {
    const ticket = await this.getTicket(ticketId);
    return ticket ? ticket.status : null;
  }

  async updateStatus(ticketId: string, status: string): Promise<Ticket | null> {
    if (this.provider.enabled) {
      return this.provider.updateStatus(ticketId, status);
    }
    return this.store.updateTicketStatus(ticketId, status) ?? null;
  }

  async escalate(ticketId: string, managerEmail: string, contextComment: string): Promise<Ticket | null> {
    if (this.provider.enabled) {
      return this.provider.escalate(ticketId, managerEmail, contextComment);
    }
    return this.store.escalateTicket(ticketId, managerEmail, contextComment) ?? null;
  }

  async listTickets(): Promise<Ticket[]> {
    if (this.provider.enabled) {
      return this.provider.listTickets();
    }
    return this.store.listTickets();
  }
}
