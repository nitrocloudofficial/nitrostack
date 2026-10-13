import { Injectable } from '@nitrostack/core';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../database/prisma.service.js';

export type DebtType = 'owe_me' | 'i_owe';
export type DebtStatus = 'pending' | 'paid';

export interface Debt {
  id: string;
  person: string;
  amount: number;
  type: DebtType;
  dateIncurred: string;
  status: DebtStatus;
}

@Injectable({ deps: [PrismaService] })
export class DebtsService {
  private debts: Debt[] = [];

  constructor(private readonly prismaService?: PrismaService) {
    this.syncFromDb();
  }

  private async syncFromDb() {
    if (!this.prismaService?.client) return;

    try {
      const dbDebts = await this.prismaService.client.debt.findMany({
        orderBy: { createdAt: 'desc' }
      });
      this.debts = dbDebts.map((d: any) => ({
        id: d.id,
        person: d.debtorName === 'me' ? d.creditorName : d.debtorName,
        amount: d.amount,
        type: (d.creditorName === 'me' ? 'owe_me' : 'i_owe') as DebtType,
        dateIncurred: d.createdAt.toISOString(),
        status: (d.status === 'paid' ? 'paid' : 'pending') as DebtStatus
      }));
    } catch (err) {
      // Graceful fallback
    }
  }

  getDebts(): Debt[] {
    return this.debts;
  }

  addDebt(person: string, amount: number, type: DebtType): Debt {
    const debt: Debt = {
      id: uuidv4(),
      person,
      amount,
      type,
      dateIncurred: new Date().toISOString(),
      status: 'pending'
    };
    this.debts.push(debt);

    if (this.prismaService?.client) {
      this.prismaService.client.debt.create({
        data: {
          id: debt.id,
          debtorName: type === 'owe_me' ? person : 'me',
          creditorName: type === 'i_owe' ? person : 'me',
          amount,
          status: 'unpaid'
        }
      }).catch(() => {});
    }

    return debt;
  }

  markAsPaid(id: string): Debt | undefined {
    const debt = this.debts.find(d => d.id === id);
    if (debt) {
      debt.status = 'paid';

      if (this.prismaService?.client) {
        this.prismaService.client.debt.update({
          where: { id },
          data: { status: 'paid' }
        }).catch(() => {});
      }
    }
    return debt;
  }
}
