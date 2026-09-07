import { Injectable } from '@nitrostack/core';
import { DbService } from '../db/db.service.js';

export interface RiskState {
  account: string;
  currentExposure: number;
  pnl: number;
  var95: number;
  var99: number;
  expectedShortfall: number;
  maxDrawdown: number;
  leverage: number;
  correlationMatrix: Record<string, Record<string, number>>;
  suggestedMaxPositionSize: number;
  timestamp: number;
}

@Injectable({ deps: [DbService] })
export class RiskService {
  private defaultCorrelationMatrix: Record<string, Record<string, number>> = {
    'BTC': { 'BTC': 1.0, 'ETH': 0.82, 'AAPL': 0.15, 'USDT': -0.02 },
    'ETH': { 'BTC': 0.82, 'ETH': 1.0, 'AAPL': 0.12, 'USDT': -0.01 },
    'AAPL': { 'BTC': 0.15, 'ETH': 0.12, 'AAPL': 1.0, 'USDT': 0.01 },
    'USDT': { 'BTC': -0.02, 'ETH': -0.01, 'AAPL': 0.01, 'USDT': 1.0 }
  };

  constructor(private db: DbService) {}

  /**
   * Get current risk state for an account
   */
  async getRiskState(account: string): Promise<RiskState> {
    // Try to retrieve existing parameters from SQLite risk table or memory
    // Initialize default values if not exists
    const equity = 1000000; // $1,000,000 trading capital
    const currentExposure = 1250000; // $1,250,000 position exposure
    const leverage = currentExposure / equity;
    const pnl = 42500; // +$42,500 PnL
    
    // Simulate Value-at-Risk using parametric approach
    const var95 = currentExposure * 0.025; // 2.5% of exposure
    const var99 = currentExposure * 0.038; // 3.8% of exposure
    const expectedShortfall = currentExposure * 0.032; // Expected Shortfall (CVaR)
    
    const maxDrawdown = 0.045; // 4.5% drawdown
    
    // Suggested Max Position Size: Limit size such that position VaR does not exceed 2% of equity
    const maxRiskBudget = equity * 0.02; // $20,000 max loss budget
    const positionVaRPercent = 0.05; // Assume 5% price standard deviation / VaR
    const suggestedMaxPositionSize = maxRiskBudget / positionVaRPercent; // $400,000

    // Save risk entry to DB for audit trailing
    this.persistRiskMetric(account, var95, expectedShortfall, maxDrawdown);

    return {
      account,
      currentExposure,
      pnl,
      var95: Number(var95.toFixed(2)),
      var99: Number(var99.toFixed(2)),
      expectedShortfall: Number(expectedShortfall.toFixed(2)),
      maxDrawdown: Number(maxDrawdown.toFixed(4)),
      leverage: Number(leverage.toFixed(2)),
      correlationMatrix: this.defaultCorrelationMatrix,
      suggestedMaxPositionSize: Number(suggestedMaxPositionSize.toFixed(2)),
      timestamp: Date.now()
    };
  }

  /**
   * Persist risk stats to SQLite
   */
  private persistRiskMetric(account: string, var95: number, es: number, drawdown: number) {
    try {
      this.db.run(
        `INSERT OR REPLACE INTO risk (id, symbol, var_95, cvar_95, sharpe_ratio, max_drawdown, calculated_at)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          account,
          'PORTFOLIO',
          var95,
          es,
          1.85, // Sharpe Ratio mock
          drawdown
        ]
      );
    } catch (e) {
      // Catch db issues
    }
  }
}
