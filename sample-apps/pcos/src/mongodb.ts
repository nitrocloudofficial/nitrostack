import { MongoClient, Db, Collection, Document } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'femmon';

let client: MongoClient | null = null;
let db: Db | null = null;

if (!uri) {
  console.warn('MONGODB_URI not set — MongoDB connections will be disabled.');
} else {
  client = new MongoClient(uri);
}

export async function getDb(): Promise<Db> {
  if (!client) {
    throw new Error('Missing MONGODB_URI environment variable — cannot connect to MongoDB');
  }
  if (!db) {
    await client.connect();
    db = client.db(dbName);
  }
  return db;
}

export async function getCollection<T extends Document>(name: string): Promise<Collection<T>> {
  return (await getDb()).collection<T>(name);
}

export async function closeMongo(): Promise<void> {
  if (!client) return;
  await client.close();
  db = null;
  client = null;
}
