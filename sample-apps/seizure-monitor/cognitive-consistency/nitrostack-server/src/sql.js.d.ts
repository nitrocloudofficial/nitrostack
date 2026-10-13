declare module 'sql.js' {
  interface Database {
    run(sql: string, params?: any[]): void;
    prepare(sql: string): Statement;
    export(): Uint8Array;
    close(): void;
  }

  interface Statement {
    bind(params?: any[]): void;
    step(): boolean;
    getAsObject(): Record<string, any>;
    free(): void;
  }

  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number>) => Database;
  }

  export type { Database, Statement };
  export default function initSqlJs(config?: any): Promise<SqlJsStatic>;
}
