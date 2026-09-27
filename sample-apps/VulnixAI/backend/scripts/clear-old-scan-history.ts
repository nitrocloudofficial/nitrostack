import mongoose from 'mongoose';
import { config } from 'dotenv';
import { Scan } from '../src/db/models/Scan.model';
import { WebsiteScan } from '../src/db/models/WebsiteScan.model';
import { LoadTest } from '../src/db/models/LoadTest.model';
import { PenetrationTest } from '../src/db/models/PenetrationTest.model';

// Load environment variables
config({ path: '.env' });

const CUTOFF_DATE = new Date('2026-04-09T00:00:00.000Z');

async function clearOldScanHistory() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI not found in environment variables');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    console.log(`🗑️  Deleting scan history before: ${CUTOFF_DATE.toISOString()}\n`);

    // Delete repository scans
    console.log('📦 Deleting repository scans...');
    const repoScansResult = await Scan.deleteMany({
      createdAt: { $lt: CUTOFF_DATE }
    });
    console.log(`   Deleted ${repoScansResult.deletedCount} repository scans`);

    // Delete website scans
    console.log('🌐 Deleting website scans...');
    const websiteScansResult = await WebsiteScan.deleteMany({
      createdAt: { $lt: CUTOFF_DATE }
    });
    console.log(`   Deleted ${websiteScansResult.deletedCount} website scans`);

    // Delete load tests
    console.log('⚡ Deleting load tests...');
    const loadTestsResult = await LoadTest.deleteMany({
      createdAt: { $lt: CUTOFF_DATE }
    });
    console.log(`   Deleted ${loadTestsResult.deletedCount} load tests`);

    // Delete penetration tests
    console.log('🔒 Deleting penetration tests...');
    const penTestsResult = await PenetrationTest.deleteMany({
      createdAt: { $lt: CUTOFF_DATE }
    });
    console.log(`   Deleted ${penTestsResult.deletedCount} penetration tests`);

    // Summary
    const totalDeleted = 
      repoScansResult.deletedCount +
      websiteScansResult.deletedCount +
      loadTestsResult.deletedCount +
      penTestsResult.deletedCount;

    console.log('\n✨ Cleanup complete!');
    console.log(`📊 Total records deleted: ${totalDeleted}`);

  } catch (error) {
    console.error('❌ Error clearing scan history:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
clearOldScanHistory();
