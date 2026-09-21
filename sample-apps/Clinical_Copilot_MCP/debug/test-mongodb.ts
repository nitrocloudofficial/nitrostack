import 'dotenv/config';
import { MongoClient } from 'mongodb';

/**
 * Debug Script 1: test-mongodb.ts
 *
 * Verifies MongoDB Atlas connectivity, server info, collection operations, and CRUD validation.
 */
async function testMongoDB() {
  console.log('==========================================================');
  console.log('TESTING MONGODB ATLAS CONNECTIVITY');
  console.log('==========================================================');

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.DATABASE_NAME || 'clinical_copilot';

  if (!uri || uri.includes('<username>')) {
    console.error('❌ MONGODB_URI is missing or contains placeholder credentials in .env!');
    process.exit(1);
  }

  console.log(`Connecting to MongoDB Atlas (Database: ${dbName})...`);

  // Recommended official MongoDB Atlas MongoClient configuration
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  try {
    await client.connect();
    console.log('✅ MongoDB Connected');

    const db = client.db(dbName);

    // Get Server Build Information
    const adminDb = db.admin();
    const buildInfo = await adminDb.buildInfo();
    console.log(`Database Name  : ${dbName}`);
    console.log(`Server Version : ${buildInfo.version}`);

    // List existing collections
    const collections = await db.listCollections().toArray();
    console.log(`Collections    : ${collections.map((c) => c.name).join(', ') || 'None'}`);

    console.log('\n--- Running CRUD Operations on "connection_test" ---');
    const testCollection = db.collection('connection_test');

    // 1. Insert Test Document
    const testDoc = {
      testId: 'test_123',
      message: 'MongoDB Connection Test Document',
      createdAt: new Date().toISOString(),
    };
    console.log('Inserting test document...');
    const insertResult = await testCollection.insertOne(testDoc);
    console.log(`Inserted Document ID: ${insertResult.insertedId}`);

    // 2. Read Test Document
    console.log('Reading document back...');
    const readDoc = await testCollection.findOne({ testId: 'test_123' });
    console.log('Read Result:', JSON.stringify(readDoc, null, 2));

    // 3. Delete Test Document
    console.log('Deleting test document...');
    const deleteResult = await testCollection.deleteOne({ testId: 'test_123' });
    console.log(`Deleted Count: ${deleteResult.deletedCount}`);

    console.log('==========================================================');
    console.log('✅ ALL MONGODB TESTS PASSED SUCCESSFULLY');
    console.log('==========================================================');
  } catch (error: any) {
    console.error('==========================================================');
    console.error('❌ MONGODB CONNECTION TEST FAILED');
    console.error('==========================================================');
    console.error(error.stack || error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

testMongoDB();
