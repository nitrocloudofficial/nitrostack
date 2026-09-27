import { Transaction } from '../domain/Transaction.js';
import { Injectable } from '@nitrostack/core';

export interface RuleResult {
  ruleName: string;
  triggered: boolean;
  score: number; // 0 to 1
  reason?: string;
}

export type FraudRule = (transaction: Transaction, history: Transaction[]) => RuleResult;

// 1. VelocityRule: Checks if there are too many transactions in a short time frame
export const VelocityRule: FraudRule = (transaction: Transaction, history: Transaction[]): RuleResult => {
  const ONE_HOUR = 60 * 60 * 1000;
  const recentTransactions = history.filter(
    t => transaction.timestamp.getTime() - t.timestamp.getTime() <= ONE_HOUR && t.id !== transaction.id
  );
  
  if (recentTransactions.length > 5) {
    return { ruleName: 'VelocityRule', triggered: true, score: 0.8, reason: 'More than 5 transactions in the last hour' };
  }
  return { ruleName: 'VelocityRule', triggered: false, score: 0 };
};

// 2. GeoImpossibilityRule: Checks if consecutive transactions are physically impossible
export const GeoImpossibilityRule: FraudRule = (transaction: Transaction, history: Transaction[]): RuleResult => {
  if (!transaction.location) return { ruleName: 'GeoImpossibilityRule', triggered: false, score: 0 };

  const lastTx = history.length > 0 ? history[0] : null;
  if (!lastTx || !lastTx.location) return { ruleName: 'GeoImpossibilityRule', triggered: false, score: 0 };

  if (transaction.location.country !== lastTx.location.country) {
    const timeDiffHours = (transaction.timestamp.getTime() - lastTx.timestamp.getTime()) / (1000 * 60 * 60);
    // Assuming simple heuristic: if country changed in less than 4 hours, flag it
    if (timeDiffHours < 4) {
      return { 
        ruleName: 'GeoImpossibilityRule', 
        triggered: true, 
        score: 0.9, 
        reason: 'Country changed in less than 4 hours' 
      };
    }
  }
  return { ruleName: 'GeoImpossibilityRule', triggered: false, score: 0 };
};

// 3. AmountAnomalyRule: Checks if the transaction amount is unusually high compared to history
export const AmountAnomalyRule: FraudRule = (transaction: Transaction, history: Transaction[]): RuleResult => {
  if (history.length < 5) return { ruleName: 'AmountAnomalyRule', triggered: false, score: 0 }; // Not enough history

  const avgAmount = history.reduce((sum, t) => sum + t.amount, 0) / history.length;
  if (transaction.amount > avgAmount * 5) {
    return { 
      ruleName: 'AmountAnomalyRule', 
      triggered: true, 
      score: 0.7, 
      reason: `Amount is 5x higher than average (${avgAmount.toFixed(2)})` 
    };
  }
  return { ruleName: 'AmountAnomalyRule', triggered: false, score: 0 };
};

// 4. NewPayeeHighValueRule: Checks if the payee is new and the amount is high
export const NewPayeeHighValueRule: FraudRule = (transaction: Transaction, history: Transaction[]): RuleResult => {
  const isNewPayee = !history.some(t => t.payee === transaction.payee && t.id !== transaction.id);
  if (isNewPayee && transaction.amount > 1000) {
    return { 
      ruleName: 'NewPayeeHighValueRule', 
      triggered: true, 
      score: 0.75, 
      reason: 'First time transaction with payee for amount > 1000' 
    };
  }
  return { ruleName: 'NewPayeeHighValueRule', triggered: false, score: 0 };
};

// 5. DuplicateRule: Checks if transaction is a duplicate of a recent transaction (same amount and payee within 5 mins)
export const DuplicateRule: FraudRule = (transaction: Transaction, history: Transaction[]): RuleResult => {
  const FIVE_MINUTES = 5 * 60 * 1000;
  const duplicate = history.find(
    t => t.id !== transaction.id &&
         t.amount === transaction.amount &&
         t.payee === transaction.payee &&
         Math.abs(transaction.timestamp.getTime() - t.timestamp.getTime()) <= FIVE_MINUTES
  );
  if (duplicate) {
    return {
      ruleName: 'DuplicateRule',
      triggered: true,
      score: 0.85,
      reason: `Duplicate transaction of ${transaction.amount} to ${transaction.payee} within 5 minutes`
    };
  }
  return { ruleName: 'DuplicateRule', triggered: false, score: 0 };
};

@Injectable({ deps: [] })
export class RuleEngine {
  private rules: FraudRule[];

  constructor(rules: FraudRule[] = [VelocityRule, GeoImpossibilityRule, AmountAnomalyRule, NewPayeeHighValueRule, DuplicateRule]) {
    this.rules = rules;
  }

  /**
   * Evaluates all rules and returns the aggregated result without side-effects.
   */
  public evaluate(transaction: Transaction, history: Transaction[]): { triggeredRules: RuleResult[], riskScore: number } {
    const results = this.rules.map(rule => rule(transaction, history));
    const triggeredRules = results.filter(r => r.triggered);
    
    // Simple max score aggregation
    const maxScore = triggeredRules.reduce((max, r) => Math.max(max, r.score), 0);

    return {
      triggeredRules,
      riskScore: maxScore
    };
  }
}
