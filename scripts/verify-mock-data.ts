import fs from 'fs';
import path from 'path';

interface VerificationResult {
  filename: string;
  validJson: boolean;
  totalRecords: number;
  missingSchemaFields: { index: number; id: string; missing: string[] }[];
  duplicateIds: string[];
  status: 'PASS' | 'FAIL';
}

const MOCKS_DIR = path.join(process.cwd(), 'mocks');

function getMockFiles(): string[] {
  if (!fs.existsSync(MOCKS_DIR)) {
    console.error(`Mocks directory not found at ${MOCKS_DIR}`);
    process.exit(1);
  }
  return fs.readdirSync(MOCKS_DIR).filter(f => 
    (f.startsWith('bank_event') || f.startsWith('telecom_event')) && f.endsWith('.json')
  );
}

function verify() {
  console.log('====================================================');
  console.log('    AEGIS PROTOCOL — MOCK DATA VERIFICATION SCRIPT   ');
  console.log('====================================================\n');

  const files = getMockFiles();
  const allTxIds = new Map<string, string>(); // txId -> filename
  const crossFileDeviceDest = new Map<string, Map<string, { filename: string; rbi_cluster_id: string | null }>>();

  const results: VerificationResult[] = [];
  let overallPass = true;

  for (const file of files) {
    const filePath = path.join(MOCKS_DIR, file);
    const result: VerificationResult = {
      filename: file,
      validJson: true,
      totalRecords: 0,
      missingSchemaFields: [],
      duplicateIds: [],
      status: 'PASS'
    };

    let content: string;
    let data: any[];

    try {
      content = fs.readFileSync(filePath, 'utf-8');
      data = JSON.parse(content);
    } catch (err: any) {
      console.error(`❌ [FAIL] ${file} failed to parse as valid JSON: ${err.message}`);
      result.validJson = false;
      result.status = 'FAIL';
      overallPass = false;
      results.push(result);
      continue;
    }

    if (!Array.isArray(data)) {
      console.error(`❌ [FAIL] ${file} root is not a JSON array.`);
      result.validJson = false;
      result.status = 'FAIL';
      overallPass = false;
      results.push(result);
      continue;
    }

    result.totalRecords = data.length;
    const isBank = file.startsWith('bank_event');

    data.forEach((rec, idx) => {
      // 1 & 2: Schema consistency for bank records
      if (isBank) {
        const txId = rec.transaction_id || `rec[${idx}]`;
        const missing: string[] = [];

        if (!rec.transaction_id) missing.push('transaction_id');
        
        const srcAccId = typeof rec.source_account === 'object' ? rec.source_account?.account_id : rec.source_account;
        if (!srcAccId) missing.push('source_account.account_id');

        const destAccId = typeof rec.destination_account === 'object' ? rec.destination_account?.account_id : rec.destination_account;
        if (!destAccId) missing.push('destination_account.account_id');

        const devId = rec.device_fingerprint?.device_id;
        if (!devId) missing.push('device_fingerprint.device_id');

        if (rec.rbi_cluster_id === undefined) missing.push('rbi_cluster_id');
        if (rec.rbi_flagged_cluster === undefined) missing.push('rbi_flagged_cluster');

        if (rec.geographic_mismatch?.mismatch_severity === undefined) missing.push('geographic_mismatch.mismatch_severity');
        if (rec.velocity_score === undefined) missing.push('velocity_score');

        if (missing.length > 0) {
          result.missingSchemaFields.push({ index: idx, id: txId, missing });
          result.status = 'FAIL';
          overallPass = false;
        }

        // Duplicate TX ID check across all files
        if (rec.transaction_id) {
          if (allTxIds.has(rec.transaction_id)) {
            const firstFile = allTxIds.get(rec.transaction_id)!;
            result.duplicateIds.push(`${rec.transaction_id} (also in ${firstFile})`);
            result.status = 'FAIL';
            overallPass = false;
          } else {
            allTxIds.set(rec.transaction_id, file);
          }
        }

        // Track for Cross-file connectivity check
        if (devId && destAccId) {
          if (!crossFileDeviceDest.has(devId)) {
            crossFileDeviceDest.set(devId, new Map());
          }
          const destMap = crossFileDeviceDest.get(devId)!;
          if (!destMap.has(destAccId)) {
            destMap.set(destAccId, { filename: file, rbi_cluster_id: rec.rbi_cluster_id ?? null });
          }
        }
      } else {
        // Telecom check
        const callId = rec.call_id;
        if (callId) {
          if (allTxIds.has(callId)) {
            const firstFile = allTxIds.get(callId)!;
            result.duplicateIds.push(`${callId} (also in ${firstFile})`);
            result.status = 'FAIL';
            overallPass = false;
          } else {
            allTxIds.set(callId, file);
          }
        }
      }
    });

    results.push(result);
  }

  // 4. Cross-file connectivity check
  console.log('----------------------------------------------------');
  console.log('📊 CROSS-FILE CONNECTIVITY CHECK ("inferred_cluster" condition)');
  console.log('----------------------------------------------------');

  let inferredConditionMet = false;
  const matches: string[] = [];

  for (const [devId, destMap] of crossFileDeviceDest.entries()) {
    if (destMap.size >= 2) {
      // Check if 2+ destination accounts have NO rbi_cluster_id
      const unflaggedDests = Array.from(destMap.entries()).filter(([_, info]) => info.rbi_cluster_id === null);
      if (unflaggedDests.length >= 2) {
        // Check if from different files or same file
        const filenames = new Set(unflaggedDests.map(([_, info]) => info.filename));
        inferredConditionMet = true;
        matches.push(
          `Device '${devId}' spans ${destMap.size} dest accounts (${Array.from(destMap.keys()).join(', ')}) with null rbi_cluster_id across file(s): ${Array.from(filenames).join(', ')}`
        );
      }
    }
  }

  if (inferredConditionMet) {
    console.log('✅ Condition MET: Found device_id spanning 2+ destination accounts with null rbi_cluster_id:');
    matches.forEach(m => console.log(`   - ${m}`));
  } else {
    console.log('⚠️ WARNING: No device_id appears on 2+ different destination_account values where NEITHER record has an rbi_cluster_id.');
    console.log('   The "inferred_cluster: true" demo feature requires this condition.');
  }

  console.log('\n----------------------------------------------------');
  console.log('📋 SUMMARY TABLE');
  console.log('----------------------------------------------------');
  console.log(`| File Name                   | Records | Valid JSON | Schema OK | Dups OK | Status |`);
  console.log(`|-----------------------------|---------|------------|-----------|---------|--------|`);

  for (const res of results) {
    const jsonOk = res.validJson ? 'YES' : 'NO ';
    const schemaOk = res.missingSchemaFields.length === 0 ? 'YES' : 'NO ';
    const dupsOk = res.duplicateIds.length === 0 ? 'YES' : 'NO ';
    const fileNamePadded = res.filename.padEnd(27, ' ');
    const recordsPadded = String(res.totalRecords).padStart(7, ' ');
    console.log(`| ${fileNamePadded} | ${recordsPadded} |    ${jsonOk}    |    ${schemaOk}    |   ${dupsOk}   | ${res.status}   |`);

    if (res.missingSchemaFields.length > 0) {
      console.log(`  └─ Missing schema fields in ${res.missingSchemaFields.length} records:`);
      res.missingSchemaFields.slice(0, 5).forEach(m => {
        console.log(`     - Record ID: ${m.id} missing [${m.missing.join(', ')}]`);
      });
      if (res.missingSchemaFields.length > 5) {
        console.log(`     - ... and ${res.missingSchemaFields.length - 5} more.`);
      }
    }

    if (res.duplicateIds.length > 0) {
      console.log(`  └─ Duplicate IDs: ${res.duplicateIds.join(', ')}`);
    }
  }

  console.log('----------------------------------------------------');
  console.log(`OVERALL VERDICT: ${overallPass ? '✅ PASS' : '❌ FAIL'}`);
  console.log('====================================================\n');
}

verify();
