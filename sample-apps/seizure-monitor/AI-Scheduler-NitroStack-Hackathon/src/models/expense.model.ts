export interface ExpenseDocument {
  userId: string;
  amount: number;
  category: string;
  description: string;
  date: string;
}

export class ExpenseModel {
  static create(expense: Partial<ExpenseDocument>): ExpenseDocument {
    return {
      userId: expense.userId ?? 'demo-user',
      amount: expense.amount ?? 0,
      category: expense.category ?? 'general',
      description: expense.description ?? 'Expense',
      date: expense.date ?? new Date().toISOString()
    } as ExpenseDocument;
  }
}
