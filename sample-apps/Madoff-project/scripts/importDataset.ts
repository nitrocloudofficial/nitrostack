import * as fs from 'fs/promises';
import * as path from 'path';
import { MongoClient } from 'mongodb';
import { v2 as cloudinary } from 'cloudinary';
import { config } from '../src/config/index.js';

// Parse CSV line taking quotes and commas into account
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result.map(val => val.replace(/^"|"$/g, ''));
}

async function run() {
  const mongoUri = process.env.MONGODB_URI || config.mongo.uri;
  console.log(`🔌 Connecting to MongoDB: ${mongoUri}...`);
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    const db = client.db();
    console.log('✅ Connected to MongoDB Atlas successfully.');

    // 1. Cloudinary setup
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || config.cloudinary.cloudName;
    const apiKey = process.env.CLOUDINARY_API_KEY || config.cloudinary.apiKey;
    const apiSecret = process.env.CLOUDINARY_API_SECRET || config.cloudinary.apiSecret;
    
    let isCloudinaryConfigured = false;
    if (cloudName && apiKey && apiSecret && cloudName !== 'mock' && apiKey !== 'mock') {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret
      });
      isCloudinaryConfigured = true;
      console.log('✅ Cloudinary credentials configured.');
    } else {
      console.warn('⚠️ Cloudinary credentials missing or set to mock. Falling back to public sample URLs.');
    }

    const datasetRoot = path.resolve(process.cwd(), 'dataset');

    // 2. Parse claims.csv
    console.log('📄 Loading claims.csv...');
    const claimsCSVPath = path.join(datasetRoot, 'claims.csv');
    const claimsContent = await fs.readFile(claimsCSVPath, 'utf-8');
    const claimLines = claimsContent.split('\n').filter(l => l.trim().length > 0);
    const claimHeaders = parseCSVLine(claimLines[0]);
    
    const claimsCol = db.collection('claims');
    const investigationsCol = db.collection('investigations');
    
    let importedClaimsCount = 0;

    for (let i = 1; i < claimLines.length; i++) {
      const row = parseCSVLine(claimLines[i]);
      if (row.length < 4) continue;
      
      const userId = row[0];
      const imagePaths = row[1].split(';');
      const userClaim = row[2];
      const claimObject = row[3];
      
      // Generate a claimId
      const claimId = `claim_csv_${String(i).padStart(3, '0')}`;

      // Check if claim exists to prevent duplicate
      const exists = await claimsCol.findOne({ claimId });
      if (exists) {
        console.log(`⏭️ Claim ${claimId} already exists. Skipping.`);
        continue;
      }

      // Upload image to Cloudinary or use placeholder
      let imageUrl = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
      if (isCloudinaryConfigured && imagePaths[0]) {
        const localImagePath = path.resolve(datasetRoot, imagePaths[0]);
        try {
          console.log(`📤 Uploading image ${imagePaths[0]} for claim ${claimId}...`);
          const uploadRes = await cloudinary.uploader.upload(localImagePath, {
            folder: 'fraud_claims'
          });
          imageUrl = uploadRes.secure_url;
        } catch (uploadError) {
          console.error(`❌ Cloudinary upload failed for ${imagePaths[0]}, using default: ${(uploadError as Error).message}`);
        }
      }

      // Insert Claim document
      await claimsCol.insertOne({
        claimId,
        customerId: userId,
        claimText: userClaim,
        imageUrl,
        timestamp: new Date().toISOString(),
        status: 'PENDING',
        riskScore: 0.0,
        confidence: 0.0,
        reviewStatus: 'NONE',
        amount: Math.floor(Math.random() * 1800) + 100, // Random amount for rule validation
        payee: `Payee_${claimObject}`,
        location: { latitude: 37.7749, longitude: -122.4194, country: 'US' }
      });

      // Insert Initial Timeline in investigations
      await investigationsCol.insertOne({
        claimId,
        events: [
          {
            eventName: 'Claim Retrieved',
            description: 'Imported claim from CSV dataset.',
            timestamp: new Date().toISOString()
          },
          {
            eventName: 'Image Loaded',
            description: `Configured Cloudinary image URL: ${imageUrl}`,
            timestamp: new Date().toISOString()
          }
        ]
      });

      importedClaimsCount++;
    }

    // 3. Parse user_history.csv to seed customers and transactions
    console.log('📄 Loading user_history.csv...');
    const historyCSVPath = path.join(datasetRoot, 'user_history.csv');
    const historyContent = await fs.readFile(historyCSVPath, 'utf-8');
    const historyLines = historyContent.split('\n').filter(l => l.trim().length > 0);
    
    const customersCol = db.collection('customers');
    const transactionsCol = db.collection('transactions');
    
    let importedCustomersCount = 0;

    for (let i = 1; i < historyLines.length; i++) {
      const row = parseCSVLine(historyLines[i]);
      if (row.length < 8) continue;
      
      const userId = row[0];
      const pastClaimCount = parseInt(row[1]) || 0;
      const acceptClaim = parseInt(row[2]) || 0;
      const manualReviewClaim = parseInt(row[3]) || 0;
      const rejectedClaim = parseInt(row[4]) || 0;
      const last90DaysCount = parseInt(row[5]) || 0;
      const historyFlags = row[6].split(';');
      const historySummary = row[7];

      // Check duplicate customer
      const custExists = await customersCol.findOne({ customerId: userId });
      if (!custExists) {
        await customersCol.insertOne({
          customerId: userId,
          name: `Customer ${userId}`,
          email: `${userId}@example.com`,
          kycStatus: 'PASSED',
          riskLevel: historyFlags.includes('user_history_risk') ? 'HIGH' : 'LOW',
          pastMetrics: {
            pastClaimCount,
            acceptClaim,
            manualReviewClaim,
            rejectedClaim,
            last90DaysCount,
            historySummary
          }
        });
        
        // Seed historical transactions for this customer to satisfy the Geo/Velocity rules
        const timestampBase = Date.now();
        await transactionsCol.insertMany([
          {
            id: `tx_${userId}_001`,
            accountId: userId,
            amount: 250.0,
            timestamp: new Date(timestampBase - 1800000).toISOString(), // 30 mins ago
            payee: 'Payee_A',
            type: 'DEBIT',
            location: { latitude: 37.7749, longitude: -122.4194, country: 'US' }
          },
          {
            id: `tx_${userId}_002`,
            accountId: userId,
            amount: 150.0,
            timestamp: new Date(timestampBase - 7200000).toISOString(), // 2 hours ago
            payee: 'Payee_B',
            type: 'DEBIT',
            location: { latitude: 37.7749, longitude: -122.4194, country: 'US' }
          }
        ]);

        importedCustomersCount++;
      }
    }

    console.log(`\n🎉 Import Complete!`);
    console.log(`Claims imported: ${importedClaimsCount}`);
    console.log(`Customers imported: ${importedCustomersCount}`);
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await client.close();
  }
}

run();
