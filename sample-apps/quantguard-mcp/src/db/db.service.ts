import { Injectable, ConfigService } from '@nitrostack/core';
import Database from './sqlite-mock.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * DbService — SQLite database connection and schema management
 */
@Injectable({ deps: [ConfigService] })
export class DbService {
  private db: any;

  constructor(private configService: ConfigService) {
    const dbPath = path.join(__dirname, '../../quantguard.db');
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initializeSchema();
  }

  /**
   * Initialize database schema on boot
   */
  private initializeSchema(): void {
    // Orders table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        symbol TEXT NOT NULL,
        side TEXT NOT NULL,
        quantity REAL NOT NULL,
        price REAL NOT NULL,
        status TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_orders_symbol ON orders(symbol);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    `);

    // Trades table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS trades (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        symbol TEXT NOT NULL,
        quantity REAL NOT NULL,
        price REAL NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id)
      );
      CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
      CREATE INDEX IF NOT EXISTS idx_trades_order_id ON trades(order_id);
    `);

    // Orderbook snapshots
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS orderbook_snapshots (
        id TEXT PRIMARY KEY,
        symbol TEXT NOT NULL,
        bids TEXT NOT NULL,
        asks TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_orderbook_symbol ON orderbook_snapshots(symbol);
    `);

    // Risk metrics
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS risk (
        id TEXT PRIMARY KEY,
        symbol TEXT NOT NULL,
        var_95 REAL,
        cvar_95 REAL,
        sharpe_ratio REAL,
        max_drawdown REAL,
        calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_risk_symbol ON risk(symbol);
    `);

    // Trading signals
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS signals (
        id TEXT PRIMARY KEY,
        symbol TEXT NOT NULL,
        signal_type TEXT NOT NULL,
        confidence REAL NOT NULL,
        generated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_signals_symbol ON signals(symbol);
    `);

    // Strategies
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS strategies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL,
        parameters TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // News
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS news (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT,
        source TEXT,
        url TEXT,
        published_at DATETIME,
        fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_news_published ON news(published_at);
    `);

    // Logs
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS logs (
        id TEXT PRIMARY KEY,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        context TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
    `);

    // Trading memos table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS trading_memos (
        id TEXT PRIMARY KEY,
        ticker TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        liquidity_metrics TEXT,
        toxicity_metrics TEXT,
        spoofing_metrics TEXT,
        volatility_metrics TEXT,
        risk_metrics TEXT,
        news_sentiment TEXT,
        recommendation TEXT NOT NULL,
        confidence REAL NOT NULL,
        reasoning TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_trading_memos_ticker ON trading_memos(ticker);
    `);
  }

  /**
   * Get database instance
   */
  getDb(): any {
    return this.db;
  }

  /**
   * Execute a query
   */
  exec(sql: string, params?: any[]): any {
    const stmt = this.db.prepare(sql);
    if (params) {
      return stmt.all(...params);
    }
    return stmt.all();
  }

  /**
   * Get a single row
   */
  get(sql: string, params?: any[]): any {
    const stmt = this.db.prepare(sql);
    if (params) {
      return stmt.get(...params);
    }
    return stmt.get();
  }

  /**
   * Insert/update/delete
   */
  run(sql: string, params?: any[]): any {
    const stmt = this.db.prepare(sql);
    if (params) {
      return stmt.run(...params);
    }
    return stmt.run();
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}
