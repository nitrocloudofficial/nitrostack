import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupDatabase() {
  // Use SUPABASE_DB_URL which should be the Postgres connection string
  // Format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
  const connectionString = process.env.SUPABASE_DB_URL;

  if (!connectionString) {
    console.error('❌ Missing SUPABASE_DB_URL in environment variables.');
    console.error('Please add your Supabase connection string to the .env file.');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔄 Connecting to Supabase database...');
    await client.connect();
    
    const schemaPath = path.resolve(__dirname, '../../../supabase-schema.sql');
    console.log(`📄 Reading SQL schema from ${schemaPath}`);
    const sqlQuery = fs.readFileSync(schemaPath, 'utf8');

    console.log('⚙️ Executing schema script... This might take a few moments.');
    await client.query(sqlQuery);
    
    console.log('✅ Database setup and seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error executing database setup:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupDatabase();
