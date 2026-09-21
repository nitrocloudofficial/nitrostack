import { DatabaseService } from './src/database/database.service.js';
import { ConfigService } from '@nitrostack/core';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  console.log('Starting seed process...');
  const config = new ConfigService();
  const db = new DatabaseService(config);
  
  await db.onModuleInit();
  console.log('Seed process complete.');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
