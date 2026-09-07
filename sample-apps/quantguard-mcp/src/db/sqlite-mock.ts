import fs from 'fs';

export default class DatabaseMock {
  private filePath: string;
  private data: any = {
    orders: [],
    trades: [],
    orderbook_snapshots: [],
    risk: [],
    signals: [],
    strategies: [],
    news: [],
    logs: [],
    trading_memos: []
  };

  constructor(filePath: string) {
    this.filePath = filePath;
    this.load();
  }

  private load() {
    try {
      const jsonPath = this.filePath.replace(/\.db$/, '.json');
      if (fs.existsSync(jsonPath)) {
        this.data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      }
    } catch (e) {
      // Fallback if read fails
    }
  }

  private save() {
    try {
      const jsonPath = this.filePath.replace(/\.db$/, '.json');
      fs.writeFileSync(jsonPath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (e) {
      // Fallback if write fails
    }
  }

  pragma(sql: string) {
    return [];
  }

  exec(sql: string) {
    return [];
  }

  close() {
    this.save();
  }

  prepare(sql: string) {
    const self = this;

    // Pragma table info table resolver
    const pragmaMatch = sql.match(/PRAGMA\s+table_info\((\w+)\)/i);
    const indexMatch = sql.match(/SELECT\s+name\s+FROM\s+sqlite_master\s+WHERE\s+type='index'\s+AND\s+tbl_name='(\w+)'/i);

    // Parse insert / select table
    let table = '';
    const insertMatch = sql.match(/INSERT\s+INTO\s+(\w+)/i);
    const selectMatch = sql.match(/FROM\s+(\w+)/i);

    if (insertMatch) {
      table = insertMatch[1].toLowerCase();
    } else if (selectMatch) {
      table = selectMatch[1].toLowerCase();
    }

    // Insert columns mapping
    let columns: string[] = [];
    const colMatch = sql.match(/\(([^)]+)\)\s+VALUES/i);
    if (colMatch) {
      columns = colMatch[1].split(',').map(c => c.trim());
    }

    return {
      run(...params: any[]) {
        if (insertMatch && table) {
          if (!self.data[table]) {
            self.data[table] = [];
          }
          const row: any = {};
          columns.forEach((col, idx) => {
            row[col] = params[idx];
          });
          self.data[table].push(row);
          self.save();
        }
        return { changes: 1, lastInsertRowid: Date.now() };
      },

      all(...params: any[]) {
        // Mock getDbSchema metadata queries
        if (sql.includes("sqlite_master") && sql.includes("type='table'")) {
          return [
            { name: 'orders' },
            { name: 'trades' },
            { name: 'orderbook_snapshots' },
            { name: 'risk' },
            { name: 'signals' },
            { name: 'strategies' },
            { name: 'news' },
            { name: 'logs' },
            { name: 'trading_memos' }
          ];
        }

        if (pragmaMatch) {
          const targetTable = pragmaMatch[1].toLowerCase();
          const schemas: Record<string, any[]> = {
            orders: [
              { name: 'id', type: 'TEXT', notnull: 1, dflt_value: null, pk: 1 },
              { name: 'symbol', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
              { name: 'side', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
              { name: 'quantity', type: 'REAL', notnull: 1, dflt_value: null, pk: 0 },
              { name: 'price', type: 'REAL', notnull: 1, dflt_value: null, pk: 0 },
              { name: 'status', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
              { name: 'created_at', type: 'DATETIME', notnull: 0, dflt_value: 'CURRENT_TIMESTAMP', pk: 0 },
              { name: 'updated_at', type: 'DATETIME', notnull: 0, dflt_value: 'CURRENT_TIMESTAMP', pk: 0 }
            ],
            trades: [
              { name: 'id', type: 'TEXT', notnull: 1, dflt_value: null, pk: 1 },
              { name: 'order_id', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
              { name: 'symbol', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
              { name: 'quantity', type: 'REAL', notnull: 1, dflt_value: null, pk: 0 },
              { name: 'price', type: 'REAL', notnull: 1, dflt_value: null, pk: 0 },
              { name: 'executed_at', type: 'DATETIME', notnull: 0, dflt_value: 'CURRENT_TIMESTAMP', pk: 0 }
            ],
            orderbook_snapshots: [
              { name: 'id', type: 'TEXT', notnull: 1, dflt_value: null, pk: 1 },
              { name: 'symbol', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
              { name: 'bids', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
              { name: 'asks', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
              { name: 'timestamp', type: 'DATETIME', notnull: 0, dflt_value: 'CURRENT_TIMESTAMP', pk: 0 }
            ],
            risk: [
              { name: 'id', type: 'TEXT', notnull: 1, dflt_value: null, pk: 1 },
              { name: 'symbol', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
              { name: 'var_95', type: 'REAL', notnull: 0, dflt_value: null, pk: 0 },
              { name: 'cvar_95', type: 'REAL', notnull: 0, dflt_value: null, pk: 0 },
              { name: 'sharpe_ratio', type: 'REAL', notnull: 0, dflt_value: null, pk: 0 },
              { name: 'max_drawdown', type: 'REAL', notnull: 0, dflt_value: null, pk: 0 },
              { name: 'calculated_at', type: 'DATETIME', notnull: 0, dflt_value: 'CURRENT_TIMESTAMP', pk: 0 }
            ],
            signals: [
              { name: 'id', type: 'TEXT', notnull: 1, dflt_value: null, pk: 1 },
              { name: 'symbol', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
              { name: 'signal_type', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
              { name: 'confidence', type: 'REAL', notnull: 1, dflt_value: null, pk: 0 },
              { name: 'generated_at', type: 'DATETIME', notnull: 0, dflt_value: 'CURRENT_TIMESTAMP', pk: 0 }
            ],
            strategies: [
              { name: 'id', type: 'TEXT', notnull: 1, dflt_value: null, pk: 1 },
              { name: 'name', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
              { name: 'description', type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 },
              { name: 'status', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
              { name: 'parameters', type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 },
              { name: 'created_at', type: 'DATETIME', notnull: 0, dflt_value: 'CURRENT_TIMESTAMP', pk: 0 },
              { name: 'updated_at', type: 'DATETIME', notnull: 0, dflt_value: 'CURRENT_TIMESTAMP', pk: 0 }
            ],
            news: [
              { name: 'id', type: 'TEXT', notnull: 1, dflt_value: null, pk: 1 },
              { name: 'title', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
              { name: 'content', type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 },
              { name: 'source', type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 },
              { name: 'url', type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 },
              { name: 'published_at', type: 'DATETIME', notnull: 0, dflt_value: null, pk: 0 },
              { name: 'fetched_at', type: 'DATETIME', notnull: 0, dflt_value: 'CURRENT_TIMESTAMP', pk: 0 }
            ],
            logs: [
              { name: 'id', type: 'TEXT', notnull: 1, dflt_value: null, pk: 1 },
              { name: 'level', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
              { name: 'message', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
              { name: 'context', type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 },
              { name: 'created_at', type: 'DATETIME', notnull: 0, dflt_value: 'CURRENT_TIMESTAMP', pk: 0 }
            ],
            trading_memos: [
              { name: 'id', type: 'TEXT', notnull: 1, dflt_value: null, pk: 1 },
              { name: 'ticker', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
              { name: 'timestamp', type: 'DATETIME', notnull: 0, dflt_value: 'CURRENT_TIMESTAMP', pk: 0 },
              { name: 'liquidity_metrics', type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 },
              { name: 'toxicity_metrics', type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 },
              { name: 'spoofing_metrics', type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 },
              { name: 'volatility_metrics', type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 },
              { name: 'risk_metrics', type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 },
              { name: 'news_sentiment', type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 },
              { name: 'recommendation', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 },
              { name: 'confidence', type: 'REAL', notnull: 1, dflt_value: null, pk: 0 },
              { name: 'reasoning', type: 'TEXT', notnull: 0, dflt_value: null, pk: 0 }
            ]
          };
          return schemas[targetTable] || [];
        }

        if (indexMatch) {
          const targetTable = indexMatch[1].toLowerCase();
          const indexNames: Record<string, string[]> = {
            orders: ['idx_orders_symbol', 'idx_orders_status'],
            trades: ['idx_trades_symbol', 'idx_trades_order_id'],
            orderbook_snapshots: ['idx_orderbook_symbol'],
            risk: ['idx_risk_symbol'],
            signals: ['idx_signals_symbol'],
            news: ['idx_news_published'],
            logs: ['idx_logs_level'],
            trading_memos: ['idx_trading_memos_ticker']
          };
          return (indexNames[targetTable] || []).map(name => ({ name }));
        }

        // Handle SELECT on trading memos
        if (sql.includes('SELECT * FROM trading_memos')) {
          const ticker = params[0];
          let results = self.data.trading_memos || [];
          if (ticker) {
            results = results.filter((m: any) => m.ticker === ticker);
          }
          // Sort by timestamp desc
          return [...results].sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        }

        return self.data[table] || [];
      },

      get(...params: any[]) {
        const results = this.all(...params);
        return results[0] || null;
      }
    };
  }
}
