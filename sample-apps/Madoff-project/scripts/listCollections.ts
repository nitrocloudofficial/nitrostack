import 'dotenv/config';
import { MongoClient } from 'mongodb';

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://utkarsingh24_db_user:3dosyNDQuIH85DLY@madoff.8kek30o.mongodb.net';
  console.log(`🔌 Connecting to: ${uri}`);
  const client = new MongoClient(uri);
  await client.connect();
  
  const admin = client.db().admin();
  const dbs = await admin.listDatabases();
  console.log('📂 Databases in cluster:');
  for (const dbInfo of dbs.databases) {
    console.log(` - ${dbInfo.name}`);
    const db = client.db(dbInfo.name);
    const collections = await db.listCollections().toArray();
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`    └─ ${col.name} (${count} docs)`);
    }
  }
  
  await client.close();
}

main().catch(console.error);
