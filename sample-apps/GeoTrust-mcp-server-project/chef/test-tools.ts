/**
 * GeoTrust AI — Phase 2 Tool Verification Test
 * Tests every new tool against mock data with real grounding logic.
 * Run: npx tsx chef/test-tools.ts
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { resolve } from 'path';

const PROJECT_ROOT = resolve(import.meta.dirname, '..');

async function createClient(): Promise<Client> {
    const transport = new StdioClientTransport({
        command: 'node',
        args: [resolve(PROJECT_ROOT, 'dist', 'index.js')],
        cwd: PROJECT_ROOT,
    });
    const client = new Client({ name: 'test-runner', version: '1.0.0' });
    await client.connect(transport);
    return client;
}

async function callTool(client: Client, name: string, args: Record<string, unknown>): Promise<any> {
    const res = await client.callTool({ name, arguments: args });
    const textContent = res.content as Array<{ type: string; text: string }>;
    const text = textContent.find(c => c.type === 'text')?.text ?? '{}';
    return JSON.parse(text);
}

function log(tool: string, status: string, data: any) {
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`\n${icon} [${tool}] ${status}`);
    if (data) console.log(JSON.stringify(data, null, 2));
}

async function main() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  GeoTrust AI — Phase 2 Tool Verification Test');
    console.log('═══════════════════════════════════════════════════════════\n');

    const client = await createClient();
    const tools = await client.listTools();
    console.log(`📋 ${tools.tools.length} tools registered:\n  ${tools.tools.map(t => t.name).join('\n  ')}\n`);

    let passed = 0;
    let failed = 0;

    // ── Test 1: extractPAN (valid PAN) ─────────────────────────────────
    try {
        const r = await callTool(client, 'extractPAN', {
            caseId: 'test-001', businessName: 'Priya Textiles Pvt Ltd', documentRef: 'REG-CERT'
        });
        const ok = r.status === 'success' && r.data?.isFormatValid === true;
        log('extractPAN (valid)', ok ? 'PASS' : 'FAIL', { pan: r.data?.pan, isFormatValid: r.data?.isFormatValid, entityMismatch: r.data?.entityMismatch });
        ok ? passed++ : failed++;
    } catch (e: any) { log('extractPAN (valid)', 'FAIL', e.message); failed++; }

    // ── Test 2: extractPAN (invalid PAN) ──────────────────────────────
    try {
        const r = await callTool(client, 'extractPAN', {
            caseId: 'test-002', businessName: 'Coimbatore Steels & Alloys Pvt Ltd', documentRef: 'STEEL-REG-CERT'
        });
        const ok = r.status === 'success' && r.data?.isFormatValid === false;
        log('extractPAN (invalid)', ok ? 'PASS' : 'FAIL', { pan: r.data?.pan, isFormatValid: r.data?.isFormatValid });
        ok ? passed++ : failed++;
    } catch (e: any) { log('extractPAN (invalid)', 'FAIL', e.message); failed++; }

    // ── Test 3: extractGSTCertificate ─────────────────────────────────
    try {
        const r = await callTool(client, 'extractGSTCertificate', {
            caseId: 'test-001', businessName: 'Priya Textiles Pvt Ltd', documentRef: 'REG-CERT'
        });
        const ok = r.status === 'success' && r.data?.isFormatValid !== undefined;
        log('extractGSTCertificate', ok ? 'PASS' : 'FAIL', { gstin: r.data?.gstin, isFormatValid: r.data?.isFormatValid, checksumValid: r.data?.checksumValid, embeddedPAN: r.data?.embeddedPAN });
        ok ? passed++ : failed++;
    } catch (e: any) { log('extractGSTCertificate', 'FAIL', e.message); failed++; }

    // ── Test 4: extractUdyamCertificate (valid Udyam) ─────────────────
    try {
        const r = await callTool(client, 'extractUdyamCertificate', {
            caseId: 'test-003', businessName: 'Apex Micro Enterprises', documentRef: 'APEX-REG-CERT'
        });
        const ok = r.status === 'success' && r.data?.isFormatValid === true;
        log('extractUdyamCertificate (valid)', ok ? 'PASS' : 'FAIL', { udyam: r.data?.udyamNumber, isFormatValid: r.data?.isFormatValid, stateCode: r.data?.stateCode });
        ok ? passed++ : failed++;
    } catch (e: any) { log('extractUdyamCertificate (valid)', 'FAIL', e.message); failed++; }

    // ── Test 5: extractRegistrationCertificate ────────────────────────
    try {
        const r = await callTool(client, 'extractRegistrationCertificate', {
            caseId: 'test-001', businessName: 'Priya Textiles Pvt Ltd', documentRef: 'REG-CERT', documentType: 'registration_certificate'
        });
        const ok = r.status === 'success' && r.data?.extractedClaims?.length > 0;
        log('extractRegistrationCertificate', ok ? 'PASS' : 'FAIL', { claimsCount: r.data?.extractedClaims?.length, quality: r.data?.documentQuality });
        ok ? passed++ : failed++;
    } catch (e: any) { log('extractRegistrationCertificate', 'FAIL', e.message); failed++; }

    // ── Test 6: validateRegistration ──────────────────────────────────
    try {
        const r = await callTool(client, 'validateRegistration', {
            caseId: 'test-001', businessName: 'Priya Textiles Pvt Ltd', registrationNumber: 'U17111KA2018PTC112345'
        });
        const ok = r.status === 'success' && r.data?.found === true && r.data?.nameMatch === true;
        log('validateRegistration', ok ? 'PASS' : 'FAIL', { found: r.data?.found, similarity: r.data?.similarityScore, nameMatch: r.data?.nameMatch });
        ok ? passed++ : failed++;
    } catch (e: any) { log('validateRegistration', 'FAIL', e.message); failed++; }

    // ── Test 7: extractTradeLicense ───────────────────────────────────
    try {
        // First extract reg cert to populate claims
        await callTool(client, 'extractRegistrationCertificate', {
            caseId: 'test-trade', businessName: 'Priya Textiles Pvt Ltd', documentRef: 'REG-CERT', documentType: 'registration_certificate'
        });
        const r = await callTool(client, 'extractTradeLicense', {
            caseId: 'test-trade', businessName: 'Priya Textiles Pvt Ltd', documentRef: 'REG-CERT'
        });
        const ok = r.status === 'success' && r.data?.nameSimilarity !== undefined;
        log('extractTradeLicense', ok ? 'PASS' : 'FAIL', { license: r.data?.tradeLicenseNumber, nameSimilarity: r.data?.nameSimilarity, addressSimilarity: r.data?.addressSimilarity });
        ok ? passed++ : failed++;
    } catch (e: any) { log('extractTradeLicense', 'FAIL', e.message); failed++; }

    // ── Test 8: extractEntityDocument ─────────────────────────────────
    try {
        const r = await callTool(client, 'extractEntityDocument', {
            caseId: 'test-001', businessName: 'Priya Textiles Pvt Ltd', documentRef: 'REG-CERT'
        });
        const ok = r.status === 'success' && r.data?.entityType !== undefined;
        log('extractEntityDocument', ok ? 'PASS' : 'FAIL', { entityType: r.data?.entityType, expectedDoc: r.data?.expectedDocType, nameSimilarity: r.data?.nameSimilarity });
        ok ? passed++ : failed++;
    } catch (e: any) { log('extractEntityDocument', 'FAIL', e.message); failed++; }

    // ── Test 9: extractBankStatement (name mismatch) ──────────────────
    try {
        const r = await callTool(client, 'extractBankStatement', {
            caseId: 'test-002', businessName: 'Coimbatore Steels & Alloys Pvt Ltd', documentRef: 'STEEL-REG-CERT'
        });
        const ok = r.status === 'success' && r.data?.nameSimilarity < 0.9; // Should flag mismatch
        log('extractBankStatement (mismatch)', ok ? 'PASS' : 'FAIL', { accountName: r.data?.bankAccountName, nameSimilarity: r.data?.nameSimilarity, flags: r.data?.flags });
        ok ? passed++ : failed++;
    } catch (e: any) { log('extractBankStatement (mismatch)', 'FAIL', e.message); failed++; }

    // ── Test 10: analyseTransactionActivity (low activity) ────────────
    try {
        const r = await callTool(client, 'analyseTransactionActivity', {
            caseId: 'test-002', businessName: 'Coimbatore Steels & Alloys Pvt Ltd', documentRef: 'STEEL-REG-CERT'
        });
        const ok = r.status === 'success' && r.data?.frequencyRating === 'low';
        log('analyseTransactionActivity (suspicious)', ok ? 'PASS' : 'FAIL', { frequency: r.data?.frequencyRating, recency: r.data?.recencyRating, balance: r.data?.balanceRating, score: r.data?.activityScore });
        ok ? passed++ : failed++;
    } catch (e: any) { log('analyseTransactionActivity (suspicious)', 'FAIL', e.message); failed++; }

    // ── Test 11: assessBusinessVintage ─────────────────────────────────
    try {
        const r = await callTool(client, 'assessBusinessVintage', {
            caseId: 'test-001', businessName: 'Priya Textiles Pvt Ltd', documentRef: 'REG-CERT'
        });
        const ok = r.status === 'success' && r.data?.ageYears > 5;
        log('assessBusinessVintage', ok ? 'PASS' : 'FAIL', { incorpDate: r.data?.incorporationDate, ageYears: r.data?.ageYears, rating: r.data?.vintageRating });
        ok ? passed++ : failed++;
    } catch (e: any) { log('assessBusinessVintage', 'FAIL', e.message); failed++; }

    // ── Test 12: crossCheckTurnoverClassification ──────────────────────
    try {
        const r = await callTool(client, 'crossCheckTurnoverClassification', {
            caseId: 'test-001', businessName: 'Priya Textiles Pvt Ltd', documentRef: 'REG-CERT'
        });
        const ok = r.status === 'success' && r.data?.classification?.includes('Micro');
        log('crossCheckTurnoverClassification', ok ? 'PASS' : 'FAIL', { turnover: r.data?.annualTurnover, classification: r.data?.classification });
        ok ? passed++ : failed++;
    } catch (e: any) { log('crossCheckTurnoverClassification', 'FAIL', e.message); failed++; }

    // ── Test 13: detectDocumentTampering ───────────────────────────────
    try {
        const r = await callTool(client, 'detectDocumentTampering', {
            caseId: 'test-001', businessName: 'Priya Textiles Pvt Ltd', documentRef: 'REG-CERT'
        });
        const ok = r.status === 'success' && r.data?.tamperingScore !== undefined;
        log('detectDocumentTampering', ok ? 'PASS' : 'FAIL', { score: r.data?.tamperingScore, flags: r.data?.flags });
        ok ? passed++ : failed++;
    } catch (e: any) { log('detectDocumentTampering', 'FAIL', e.message); failed++; }

    // ── Test 14: checkDuplicateDocument ────────────────────────────────
    try {
        const content = 'This is a test registration certificate for Priya Textiles';
        // Submit once
        await callTool(client, 'checkDuplicateDocument', {
            caseId: 'test-dup1', businessName: 'Company A', documentContent: content, documentLabel: 'Reg Cert'
        });
        // Submit same content under different case — should detect duplicate
        const r = await callTool(client, 'checkDuplicateDocument', {
            caseId: 'test-dup2', businessName: 'Company B', documentContent: content, documentLabel: 'Reg Cert'
        });
        const ok = r.status === 'success' && r.data?.isDuplicate === true;
        log('checkDuplicateDocument', ok ? 'PASS' : 'FAIL', { isDuplicate: r.data?.isDuplicate, hash: r.data?.hash?.substring(0, 16) });
        ok ? passed++ : failed++;
    } catch (e: any) { log('checkDuplicateDocument', 'FAIL', e.message); failed++; }

    // ── Test 15: validateDocumentFormat ────────────────────────────────
    try {
        const r = await callTool(client, 'validateDocumentFormat', {
            caseId: 'test-001', businessName: 'Priya Textiles Pvt Ltd', fieldName: 'PAN', fieldValue: 'AACPP1234F'
        });
        const ok = r.status === 'success' && r.data?.isValid === true;
        log('validateDocumentFormat (valid PAN)', ok ? 'PASS' : 'FAIL', { isValid: r.data?.isValid, expected: r.data?.expectedFormat });
        ok ? passed++ : failed++;

        const r2 = await callTool(client, 'validateDocumentFormat', {
            caseId: 'test-002', businessName: 'Test', fieldName: 'PAN', fieldValue: 'INVALID123'
        });
        const ok2 = r2.status === 'success' && r2.data?.isValid === false;
        log('validateDocumentFormat (invalid PAN)', ok2 ? 'PASS' : 'FAIL', { isValid: r2.data?.isValid });
        ok2 ? passed++ : failed++;
    } catch (e: any) { log('validateDocumentFormat', 'FAIL', e.message); failed++; }

    // ── Test 16: checkApplicationHistory ───────────────────────────────
    try {
        const r = await callTool(client, 'checkApplicationHistory', {
            caseId: 'test-001', businessName: 'Priya Textiles Pvt Ltd'
        });
        const ok = r.status === 'success';
        log('checkApplicationHistory', ok ? 'PASS' : 'FAIL', { casesScanned: r.data?.totalCasesScanned, matches: r.data?.matches?.length });
        ok ? passed++ : failed++;
    } catch (e: any) { log('checkApplicationHistory', 'FAIL', e.message); failed++; }

    // ── Test 17: searchDuplicateEntities ───────────────────────────────
    try {
        const r = await callTool(client, 'searchDuplicateEntities', {
            caseId: 'test-001', businessName: 'Priya Textiles Pvt Ltd'
        });
        const ok = r.status === 'success' && r.data?.registryRecordsScanned > 0;
        log('searchDuplicateEntities', ok ? 'PASS' : 'FAIL', { scanned: r.data?.registryRecordsScanned, duplicates: r.data?.duplicates?.length });
        ok ? passed++ : failed++;
    } catch (e: any) { log('searchDuplicateEntities', 'FAIL', e.message); failed++; }

    // ── Test 18: logAuditEvent + getAuditTrail ────────────────────────
    try {
        await callTool(client, 'logAuditEvent', {
            caseId: 'test-001', actor: 'test-runner', action: 'tool_invoked', details: 'Testing audit logging', toolName: 'logAuditEvent'
        });
        const r = await callTool(client, 'getAuditTrail', { caseId: 'test-001' });
        const ok = r.status === 'success' && r.data?.totalEvents > 0;
        log('logAuditEvent + getAuditTrail', ok ? 'PASS' : 'FAIL', { events: r.data?.totalEvents });
        ok ? passed++ : failed++;
    } catch (e: any) { log('logAuditEvent + getAuditTrail', 'FAIL', e.message); failed++; }

    // ── Test 19: maskSensitiveField ───────────────────────────────────
    try {
        const r = await callTool(client, 'maskSensitiveField', { value: 'AACPP1234F', fieldType: 'pan' });
        const ok = r.status === 'success' && r.data?.masked === 'AACPP****F';
        log('maskSensitiveField (PAN)', ok ? 'PASS' : 'FAIL', { masked: r.data?.masked });
        ok ? passed++ : failed++;

        const r2 = await callTool(client, 'maskSensitiveField', { value: '123456789012', fieldType: 'aadhaar' });
        const ok2 = r2.status === 'success' && r2.data?.masked === 'XXXX-XXXX-9012';
        log('maskSensitiveField (Aadhaar)', ok2 ? 'PASS' : 'FAIL', { masked: r2.data?.masked });
        ok2 ? passed++ : failed++;
    } catch (e: any) { log('maskSensitiveField', 'FAIL', e.message); failed++; }

    // ── Summary ───────────────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`  RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
    console.log('═══════════════════════════════════════════════════════════\n');

    await client.close();
    process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
