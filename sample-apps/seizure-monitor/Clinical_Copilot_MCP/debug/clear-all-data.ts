import 'dotenv/config';
import { MongoService } from '../src/services/mongo.service.js';
import { SupabaseService } from '../src/services/supabase.service.js';

/**
 * Data Purge & Reset Utility Script for Clinical Copilot MCP
 *
 * 1. Empties all collections in MongoDB Atlas ('clinical_copilot' database)
 * 2. Purges all files from Supabase Storage buckets ('medical-reports', 'referrals')
 */
async function clearAllData() {
  console.log('==========================================================');
  console.log('CLINICAL COPILOT MCP - SYSTEM DATA PURGE & RESET UTILITY');
  console.log('==========================================================\n');

  // 1. Initialize MongoDB Connection
  const mongoService = new MongoService();
  await mongoService.onModuleInit();
  const db = await mongoService.getDb();

  // 2. Initialize Supabase Service
  const supabaseService = new SupabaseService();
  await supabaseService.onModuleInit();
  const supabaseClient = supabaseService.getClient();

  try {
    // ---------------------------------------------------------------------
    // STEP 1: CLEAR MONGODB ATLAS DATABASE COLLECTIONS
    // ---------------------------------------------------------------------
    console.log('\n----------------------------------------------------------');
    console.log('1. CLEARING MONGODB ATLAS DATABASE COLLECTIONS...');
    console.log('----------------------------------------------------------');

    const collections = await db.listCollections().toArray();
    if (collections.length === 0) {
      console.log('ℹ️ No collections found in MongoDB database.');
    } else {
      for (const colInfo of collections) {
        const collectionName = colInfo.name;
        const collection = db.collection(collectionName);
        const countBefore = await collection.countDocuments();
        const deleteResult = await collection.deleteMany({});
        console.log(`✅ Collection '${collectionName}': Deleted ${deleteResult.deletedCount} of ${countBefore} documents.`);
      }
    }

    // ---------------------------------------------------------------------
    // STEP 2: PURGE SUPABASE STORAGE BUCKETS
    // ---------------------------------------------------------------------
    console.log('\n----------------------------------------------------------');
    console.log('2. PURGING SUPABASE STORAGE BUCKETS...');
    console.log('----------------------------------------------------------');

    if (!supabaseClient) {
      console.log('⚠️ Supabase client not active. Skipping storage purge.');
    } else {
      const bucketsToClear = ['medical-reports', 'referrals'];

      for (const bucketName of bucketsToClear) {
        console.log(`\n🔍 Checking Supabase Storage bucket '${bucketName}'...`);
        try {
          // List top-level items in bucket
          const { data: topLevelItems, error: listErr } = await supabaseClient.storage
            .from(bucketName)
            .list('', { limit: 1000, sortBy: { column: 'name', order: 'asc' } });

          if (listErr) {
            console.warn(`  [WARN] Listing bucket '${bucketName}' error: ${listErr.message}`);
            continue;
          }

          if (!topLevelItems || topLevelItems.length === 0) {
            console.log(`  ℹ️ Bucket '${bucketName}' is empty.`);
            continue;
          }

          const filePathsToRemove: string[] = [];

          for (const item of topLevelItems) {
            if (item.id) {
              // Standard file
              filePathsToRemove.push(item.name);
            } else {
              // Subdirectory: list items within subfolder
              const subfolder = item.name;
              const { data: subItems } = await supabaseClient.storage
                .from(bucketName)
                .list(subfolder, { limit: 1000 });

              if (subItems && subItems.length > 0) {
                for (const subItem of subItems) {
                  filePathsToRemove.push(`${subfolder}/${subItem.name}`);
                }
              }
              filePathsToRemove.push(subfolder);
            }
          }

          if (filePathsToRemove.length > 0) {
            console.log(`  🗑️ Removing ${filePathsToRemove.length} items from bucket '${bucketName}'...`);
            const { data: removeData, error: removeErr } = await supabaseClient.storage
              .from(bucketName)
              .remove(filePathsToRemove);

            if (removeErr) {
              console.error(`  ❌ Failed to remove files from '${bucketName}': ${removeErr.message}`);
            } else {
              console.log(`  ✅ Successfully purged ${removeData?.length || filePathsToRemove.length} objects from '${bucketName}'.`);
            }
          } else {
            console.log(`  ℹ️ No files to remove in '${bucketName}'.`);
          }
        } catch (bucketErr: any) {
          console.error(`  ❌ Error purging bucket '${bucketName}': ${bucketErr.message}`);
        }
      }
    }

    console.log('\n==========================================================');
    console.log('🎉 SYSTEM DATA PURGE AND RESET COMPLETED SUCCESSFULLY!');
    console.log('==========================================================\n');
  } catch (error: any) {
    console.error('\n==========================================================');
    console.error('❌ ERROR DURING DATA PURGE');
    console.error('==========================================================');
    console.error(error.stack || error);
  } finally {
    await mongoService.disconnect();
  }
}

clearAllData();
