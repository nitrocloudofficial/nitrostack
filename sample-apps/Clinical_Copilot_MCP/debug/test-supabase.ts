import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

/**
 * Debug Script 2: test-supabase.ts
 *
 * Verifies Supabase URL, Service Role Key authentication, Bucket listing,
 * File upload, download, and deletion lifecycle.
 */
async function testSupabase() {
  console.log('==========================================================');
  console.log('TESTING SUPABASE STORAGE & AUTHENTICATION');
  console.log('==========================================================');

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'medical-reports';

  console.log(`SUPABASE_URL            : ${supabaseUrl ? 'FOUND' : 'MISSING'}`);
  console.log(`SUPABASE_SERVICE_ROLE_KEY: ${serviceRoleKey ? 'FOUND' : 'MISSING'}`);
  console.log(`SUPABASE_STORAGE_BUCKET  : ${bucketName ? 'FOUND' : 'MISSING'}`);
  console.log('----------------------------------------------------------');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Supabase URL or Service Role Key is missing in .env!');
    process.exit(1);
  }

  try {
    console.log('Initializing Supabase client...');
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // 1. List Buckets
    console.log('Step 1: Listing Storage Buckets...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      throw new Error(`Failed to list buckets: ${listError.message}`);
    }

    console.log(`Buckets Found (${buckets.length}):`, buckets.map((b) => b.name).join(', ') || 'None');

    // 2. Verify Configured Bucket Exists
    const bucketExists = buckets.some((b) => b.name === bucketName);
    if (!bucketExists) {
      console.warn(`⚠️ Configured bucket '${bucketName}' not found in list. Attempting direct access...`);
    } else {
      console.log(`✅ Configured bucket '${bucketName}' exists.`);
    }

    // 3. Upload Temporary Test File
    const testFileName = `debug_test_${Date.now()}.txt`;
    const testContent = Buffer.from(`Clinical Copilot Supabase Debug Test File created at ${new Date().toISOString()}`);

    console.log(`Step 2: Uploading temporary test file '${testFileName}' to bucket '${bucketName}'...`);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(testFileName, testContent, {
        contentType: 'text/plain',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload file to Supabase Storage: ${uploadError.message}`);
    }

    console.log(`✅ Upload Successful. Path: ${uploadData.path}`);

    // 4. Download Test File
    console.log(`Step 3: Downloading file '${testFileName}' back from storage...`);
    const { data: downloadedBlob, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(testFileName);

    if (downloadError) {
      throw new Error(`Failed to download file from Supabase Storage: ${downloadError.message}`);
    }

    const downloadedText = await downloadedBlob.text();
    console.log(`✅ Download Successful. Content: "${downloadedText}"`);

    // 5. Get Public URL
    const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(testFileName);
    console.log(`Public URL: ${publicUrlData.publicUrl}`);

    // 6. Delete Test File
    console.log(`Step 4: Deleting test file '${testFileName}' from bucket...`);
    const { error: deleteError } = await supabase.storage.from(bucketName).remove([testFileName]);

    if (deleteError) {
      throw new Error(`Failed to delete test file from Supabase Storage: ${deleteError.message}`);
    }

    console.log('✅ File Deletion Successful.');
    console.log('==========================================================');
    console.log('✅ ALL SUPABASE TESTS PASSED SUCCESSFULLY');
    console.log('==========================================================');
  } catch (error: any) {
    console.error('==========================================================');
    console.error('❌ SUPABASE TEST FAILED');
    console.error('==========================================================');
    console.error(error.stack || error);
    process.exit(1);
  }
}

testSupabase();
