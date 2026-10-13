import duckdb from 'duckdb';

export class DbService {
  private static db: duckdb.Database | null = null;
  private static connection: duckdb.Connection | null = null;
  private static initialized = false;

  private versionCounter = 1;

  public async getConnection(): Promise<duckdb.Connection> {
    if (!DbService.connection) {
      DbService.db = new duckdb.Database('ai_ceo.duckdb');
      DbService.connection = DbService.db.connect();
    }

    if (!DbService.initialized) {
      await this.initializeTables();
      DbService.initialized = true;
    }

    return DbService.connection;
  }

  private async initializeTables(): Promise<void> {
    const conn = DbService.connection!;

    await new Promise<void>((resolve, reject) => {
      conn.run(
        `
        CREATE TABLE IF NOT EXISTS git_intelligence (
          version INTEGER,
          name VARCHAR,
          work_importance DOUBLE,
          pr_involvement DOUBLE,
          comment_quality DOUBLE,
          activity DOUBLE,
          collaboration_health DOUBLE,
          git_score DOUBLE,
          git_behavior VARCHAR,
          generated_at TIMESTAMP
        )
        `,
        (err) => (err ? reject(err) : resolve())
      );
    });

    // Create the other tables too so your remaining tools won't fail later.

    await new Promise<void>((resolve, reject) => {
      conn.run(
        `
        CREATE TABLE IF NOT EXISTS meeting_intelligence (
          version INTEGER,
          name VARCHAR,
          involvement_score DOUBLE,
          time_spoken_seconds INTEGER,
          lines_spoken INTEGER,
          behavior_type VARCHAR,
          important_topics VARCHAR,
          summary VARCHAR,
          overall_meeting_summary VARCHAR,
          meeting_topics VARCHAR,
          generated_at TIMESTAMP
        )
        `,
        (err) => (err ? reject(err) : resolve())
      );
    });

    await new Promise<void>((resolve, reject) => {
      conn.run(
        `
        CREATE TABLE IF NOT EXISTS final_team_intelligence (
        version INTEGER,
        name VARCHAR,
        merged_score DOUBLE,
        final_behavior VARCHAR,
        git_score DOUBLE,
        meeting_score DOUBLE,
        generated_at TIMESTAMP
        )
        `,
        (err) => (err ? reject(err) : resolve())
      );
    });
  }

  public async getNextVersion(context?: any): Promise<number> {
    return this.versionCounter++;
  }

  public async exec(query: string, params?: any[]): Promise<any> {
    const conn = await this.getConnection();

    return new Promise((resolve, reject) => {
      const handler = (err: Error | null, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows);
      };

      if (params && params.length > 0) {
        conn.all(query, ...params, handler);
      } else {
        conn.all(query, handler);
      }
    });
  }
}