import { UserRepository } from './user-repository.js';
import { HistoryRepository } from './history-repository.js';

export interface BudgetState {
  daily_cap: number;
  weekly_cap: number;
  spend_to_date: number; // Spend in the last 7 days excluding today
  remaining: number;
  days_left_in_week: number;
  budget_inr_remaining: number; // For compatibility with resolver.tools.ts
}

export class BudgetRepository {
  private userRepo: UserRepository;
  private historyRepo: HistoryRepository;

  constructor(userRepo?: UserRepository, historyRepo?: HistoryRepository) {
    this.userRepo = userRepo || new UserRepository();
    this.historyRepo = historyRepo || new HistoryRepository();
  }

  public getBudgetState(userId: string): BudgetState {
    const user = this.userRepo.getById(userId);
    if (!user) throw new Error(`User not found: ${userId}`);

    const history = this.historyRepo.getByUserId(userId);

    const dailyCap = user.daily_budget_inr || 600;
    const weeklyCap = dailyCap * 7;

    let spendToDate = 0;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setUTCHours(0, 0, 0, 0); // Start of today in UTC
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    // Sum spend from last 7 days (including today) in history
    for (const order of history.orders) {
      const orderDate = new Date(order.timestamp);
      if (orderDate >= sevenDaysAgo) {
        spendToDate += order.price_inr;
      }
    }

    // "days left in week" could be calculated based on some cycle, but we'll use a standard rolling 7 days.
    // In a rolling 7-day window, we've allocated `weeklyCap`, and we spent `spendToDate` in those 7 days.
    // The "remaining" budget for *today* is ideally just `dailyCap`, but if we're under weekly cap, 
    // maybe we have extra? For the resolver, we just need `budget_inr_remaining` which typically represents 
    // what we can spend on THIS meal. If we have a daily cap, the remaining is dailyCap - todaySpend.

    let todaySpend = 0;
    for (const order of history.orders) {
      const orderDate = new Date(order.timestamp);
      if (orderDate >= todayStart) {
        todaySpend += order.price_inr;
      }
    }

    const remaining = weeklyCap - spendToDate;
    const budget_inr_remaining = dailyCap - todaySpend;

    return {
      daily_cap: dailyCap,
      weekly_cap: weeklyCap,
      spend_to_date: spendToDate,
      remaining: remaining,
      days_left_in_week: 7, // It's a rolling window
      budget_inr_remaining: budget_inr_remaining
    };
  }
}
