import { ToolDecorator as Tool, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { FinanceStore, SettlementTransaction } from '../../services/finance-store.service.js';

function simplifyDebts(netBalances: Record<string, number>): SettlementTransaction[] {
  const debtors: { person: string; amount: number }[] = [];
  const creditors: { person: string; amount: number }[] = [];

  for (const [person, balance] of Object.entries(netBalances)) {
    const rounded = Math.round(balance * 100) / 100;
    if (rounded < -0.01) {
      debtors.push({ person, amount: Math.abs(rounded) });
    } else if (rounded > 0.01) {
      creditors.push({ person, amount: rounded });
    }
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements: SettlementTransaction[] = [];

  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const transferAmount = Math.min(debtor.amount, creditor.amount);
    const roundedTransfer = Math.round(transferAmount * 100) / 100;

    if (roundedTransfer > 0) {
      settlements.push({
        from: debtor.person,
        to: creditor.person,
        amount: roundedTransfer,
      });
    }

    debtor.amount -= transferAmount;
    creditor.amount -= transferAmount;

    if (Math.abs(debtor.amount) < 0.01) i++;
    if (Math.abs(creditor.amount) < 0.01) j++;
  }

  return settlements;
}

@Injectable({ deps: [FinanceStore] })
export class GroupExpensesTools {
  constructor(private store: FinanceStore) {}

  @Tool({
    name: 'manage_group_expenses',
    description:
      'Unified Group Expenses Management — Log shared expenses with Splitwise debt simplification (action: split_expense), add group participants (action: add_participant), or check net group balances & settlement plans (action: get_balances).',
    inputSchema: z.object({
      action: z
        .enum(['split_expense', 'add_participant', 'get_balances'])
        .describe('Action to perform'),
      description: z.string().optional().describe('Expense description (for split_expense)'),
      total_amount: z.number().positive().optional().describe('Total amount paid (for split_expense)'),
      paid_by: z.string().optional().describe('Participant who paid upfront (for split_expense)'),
      participants: z.array(z.string()).optional().describe('List of participants (for split_expense)'),
      split_method: z
        .enum(['equal', 'percentage', 'exact', 'shares'])
        .optional()
        .default('equal')
        .describe('Split method (for split_expense)'),
      split_details: z
        .record(z.string(), z.number())
        .optional()
        .describe('Custom split values (for split_expense)'),
      group_name: z.string().optional().default('Default Group').describe('Group name'),
      participant_name: z.string().optional().describe('Participant name (for add_participant)'),
    }),
  })
  async manageGroupExpenses(input: any, ctx: ExecutionContext) {
    const action = input.action;
    const groupName = input.group_name || 'Default Group';

    if (action === 'add_participant') {
      if (!input.participant_name) throw new Error('participant_name is required for action: add_participant');
      const group = this.store.addParticipantToGroup(groupName, input.participant_name);
      ctx.logger.info('Added participant to group', { group: group.name, participant: input.participant_name });
      return { group_name: group.name, participants: Array.from(group.participants) };
    } else if (action === 'get_balances') {
      const group = this.store.getGroup(groupName);
      if (!group || group.expenses.length === 0) {
        return {
          status: 'no_group_data',
          message: `No expenses found for group "${groupName}". Use action: split_expense to log shared expenses.`,
        };
      }
      const netBalances: Record<string, number> = {};
      group.participants.forEach((p) => (netBalances[p] = 0));
      for (const exp of group.expenses) {
        netBalances[exp.paid_by] = (netBalances[exp.paid_by] ?? 0) + exp.total_amount;
        for (const [p, shareAmount] of Object.entries(exp.per_person_shares)) {
          netBalances[p] = (netBalances[p] ?? 0) - shareAmount;
        }
      }
      const settlementPlan = simplifyDebts(netBalances);
      ctx.logger.info('Retrieved group balances', { group_name: groupName, expenses: group.expenses.length });
      return {
        group_name: groupName,
        total_group_expenses_count: group.expenses.length,
        participants: Array.from(group.participants),
        net_balances: netBalances,
        simplified_settlement_plan: settlementPlan,
        expense_history: group.expenses.map((e) => ({
          id: e.id,
          date: e.created_at.slice(0, 10),
          description: e.description,
          total_amount: e.total_amount,
          paid_by: e.paid_by,
        })),
      };
    } else {
      // split_expense
      if (!input.description || !input.total_amount || !input.paid_by || !input.participants) {
        throw new Error('description, total_amount, paid_by, and participants are required for action: split_expense');
      }
      const totalAmount = input.total_amount;
      const paidBy = input.paid_by;
      const participants: string[] = input.participants;
      const splitMethod = input.split_method || 'equal';
      const splitDetails = input.split_details || {};

      if (!participants.includes(paidBy)) {
        participants.push(paidBy);
      }

      const shares: Record<string, number> = {};

      if (splitMethod === 'equal') {
        const perPerson = totalAmount / participants.length;
        participants.forEach((p) => (shares[p] = Math.round(perPerson * 100) / 100));
      } else if (splitMethod === 'percentage') {
        let sumPct = 0;
        participants.forEach((p) => {
          const pct = splitDetails[p] ?? 0;
          sumPct += pct;
          shares[p] = Math.round(((totalAmount * pct) / 100) * 100) / 100;
        });
        if (Math.abs(sumPct - 100) > 0.1) {
          throw new Error(`Percentage split must sum to 100% (got ${sumPct}%).`);
        }
      } else if (splitMethod === 'exact') {
        let sumExact = 0;
        participants.forEach((p) => {
          const exact = splitDetails[p] ?? 0;
          sumExact += exact;
          shares[p] = exact;
        });
        if (Math.abs(sumExact - totalAmount) > 0.5) {
          throw new Error(`Exact amounts must sum to total expense amount (${totalAmount}), got ${sumExact}.`);
        }
      } else if (splitMethod === 'shares') {
        let totalShares = 0;
        participants.forEach((p) => (totalShares += splitDetails[p] ?? 1));
        participants.forEach((p) => {
          const s = splitDetails[p] ?? 1;
          shares[p] = Math.round(((totalAmount * s) / totalShares) * 100) / 100;
        });
      }

      const expense = this.store.addGroupExpense({
        description: input.description,
        total_amount: totalAmount,
        paid_by: paidBy,
        group_name: groupName,
        participants,
        split_method: splitMethod,
        per_person_shares: shares,
      });

      const group = this.store.getGroup(groupName)!;
      const netBalances: Record<string, number> = {};
      group.participants.forEach((p) => (netBalances[p] = 0));

      for (const exp of group.expenses) {
        netBalances[exp.paid_by] = (netBalances[exp.paid_by] ?? 0) + exp.total_amount;
        for (const [p, shareAmount] of Object.entries(exp.per_person_shares)) {
          netBalances[p] = (netBalances[p] ?? 0) - shareAmount;
        }
      }

      const settlementPlan = simplifyDebts(netBalances);

      ctx.logger.info('Split group expense', {
        expense_id: expense.id,
        group_name: groupName,
        settlements: settlementPlan.length,
      });

      return {
        expense_id: expense.id,
        group_name: groupName,
        description: expense.description,
        total_amount: totalAmount,
        paid_by: paidBy,
        per_person_owed_shares: shares,
        net_group_balances: netBalances,
        simplified_settlement_plan: settlementPlan,
      };
    }
  }
}
