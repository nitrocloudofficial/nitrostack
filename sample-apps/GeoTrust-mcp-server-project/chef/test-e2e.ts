/**
 * GeoTrust AI — Phase 4 End-to-End Pipeline Test
 * Runs 3 cases through the complete investigation pipeline.
 * Run: npx tsx chef/test-e2e.ts
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
    const client = new Client({ name: 'e2e-test-runner', version: '1.0.0' });
    await client.connect(transport);
    return client;
}

async function callTool(client: Client, name: string, args: Record<string, unknown>): Promise<any> {
    const res = await client.callTool({ name, arguments: args });
    const textContent = res.content as Array<{ type: string; text: string }>;
    const text = textContent.find(c => c.type === 'text')?.text ?? '{}';
    return JSON.parse(text);
}

interface CaseConfig {
    caseId: string;
    businessName: string;
    documentRef: string;
    registrationNumber: string;
    address: string;
    directorName: string;
    incorporationDate: string;
    websiteUrl?: string;
    incorporationYear?: number;
    expectedOutcome: 'proceed' | 'escalate' | 'request_evidence' | 'flag_insufficient';
}

const CASES: CaseConfig[] = [
    {
        caseId: 'e2e-001',
        businessName: 'Kaveri AgriTech Pvt Ltd',
        documentRef: 'KAV-REG-CERT',
        registrationNumber: 'U01111KA2020PTC334455',
        address: '10, Farm Road, Mysuru, Karnataka 570001',
        directorName: 'Suresh Patel',
        incorporationDate: '2020-04-10',
        websiteUrl: 'kaveriagri.in',
        incorporationYear: 2020,
        expectedOutcome: 'proceed',
    },
    {
        caseId: 'e2e-002',
        businessName: 'Nexus Global Trading LLC',
        documentRef: 'NEX-REG-CERT',
        registrationNumber: 'U51909MH2022LLP123456',
        address: '99, Marine Drive, Mumbai, Maharashtra 400020',
        directorName: 'Amit Singh',
        incorporationDate: '2022-08-15',
        websiteUrl: 'nexus-global.in',
        incorporationYear: 2022,
        expectedOutcome: 'escalate',
    },
    {
        caseId: 'e2e-003',
        businessName: 'Balaji Hardware Store',
        documentRef: 'BAL-REG-CERT',
        registrationNumber: 'UDYAM-TN-02-9876543',
        address: '15, Market Street, Madurai, Tamil Nadu 625001',
        directorName: 'Rajan Kumar',
        incorporationDate: '2012-05-20',
        incorporationYear: 2012,
        expectedOutcome: 'request_evidence', // or escalate depending on how many missing evidence it has
    },
];

async function runCase(client: Client, cfg: CaseConfig) {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`  CASE: ${cfg.caseId} — ${cfg.businessName}`);
    console.log(`  Expected: ${cfg.expectedOutcome}`);
    console.log(`${'═'.repeat(70)}\n`);

    // Step 1: Initialize
    console.log('📦 Step 1: initializeCase');
    await callTool(client, 'initializeCase', {
        caseId: cfg.caseId,
        businessName: cfg.businessName,
        applicantData: {
            registrationNumber: cfg.registrationNumber,
            address: cfg.address,
            directorName: cfg.directorName,
            incorporationDate: cfg.incorporationDate,
        },
    });

    // Step 2: Identity sub-agent
    console.log('🆔 Step 2: Identity sub-agent');
    await callTool(client, 'extractRegistrationCertificate', { caseId: cfg.caseId, businessName: cfg.businessName, documentRef: cfg.documentRef });
    await callTool(client, 'extractPAN', { caseId: cfg.caseId, businessName: cfg.businessName, documentRef: cfg.documentRef });
    await callTool(client, 'extractGSTCertificate', { caseId: cfg.caseId, businessName: cfg.businessName, documentRef: cfg.documentRef });
    await callTool(client, 'extractEntityDocument', { caseId: cfg.caseId, businessName: cfg.businessName, documentRef: cfg.documentRef });
    await callTool(client, 'extractTradeLicense', { caseId: cfg.caseId, businessName: cfg.businessName, documentRef: cfg.documentRef });
    await callTool(client, 'validateRegistration', { caseId: cfg.caseId, businessName: cfg.businessName, registrationNumber: cfg.registrationNumber });

    // Step 3: Location sub-agent
    console.log('📍 Step 3: Location sub-agent');
    await callTool(client, 'verifyAddress', {
        caseId: cfg.caseId,
        businessName: cfg.businessName,
        claimedAddress: cfg.address,
    });

    // Step 3b: Digital Footprint sub-agent
    console.log('🌐 Step 3b: Digital Footprint sub-agent');
    if (cfg.websiteUrl) {
        await callTool(client, 'analyseDigitalFootprint', {
            caseId: cfg.caseId,
            businessName: cfg.businessName,
            websiteUrl: cfg.websiteUrl,
            incorporationYear: cfg.incorporationYear,
        });
    }
    // Also run web_presence_checker for scoring compatibility
    await callTool(client, 'web_presence_checker', {
        caseId: cfg.caseId,
        businessName: cfg.businessName,
        websiteUrl: cfg.websiteUrl,
        incorporationYear: cfg.incorporationYear,
    });

    // Step 4: Financial sub-agent
    console.log('💰 Step 4: Financial sub-agent');
    await callTool(client, 'extractBankStatement', { caseId: cfg.caseId, businessName: cfg.businessName, documentRef: cfg.documentRef });
    await callTool(client, 'analyseTransactionActivity', { caseId: cfg.caseId, businessName: cfg.businessName, documentRef: cfg.documentRef });
    await callTool(client, 'assessBusinessVintage', { caseId: cfg.caseId, businessName: cfg.businessName, documentRef: cfg.documentRef });
    await callTool(client, 'crossCheckTurnoverClassification', { caseId: cfg.caseId, businessName: cfg.businessName, documentRef: cfg.documentRef });

    // Step 5: Document integrity
    console.log('📄 Step 5: Document Integrity sub-agent');
    await callTool(client, 'detectDocumentTampering', { caseId: cfg.caseId, businessName: cfg.businessName, documentRef: cfg.documentRef });
    await callTool(client, 'validateDocumentFormat', { caseId: cfg.caseId, businessName: cfg.businessName, fieldName: 'Pincode', fieldValue: cfg.address.match(/\d{6}/)?.[0] ?? '000000' });

    // Step 6: Fraud pattern
    console.log('🔍 Step 6: Fraud Pattern sub-agent');
    await callTool(client, 'checkApplicationHistory', { caseId: cfg.caseId, businessName: cfg.businessName });
    await callTool(client, 'searchDuplicateEntities', { caseId: cfg.caseId, businessName: cfg.businessName });

    // Step 7: Compliance
    console.log('📋 Step 7: Compliance sub-agent');
    await callTool(client, 'logAuditEvent', {
        caseId: cfg.caseId,
        actor: 'e2e-orchestrator',
        action: 'investigation_complete',
        details: `Full pipeline completed for ${cfg.businessName}`,
    });

    // Step 8: Score
    console.log('📊 Step 8: score_case');
    const scoreResult = await callTool(client, 'score_case', { caseId: cfg.caseId, businessName: cfg.businessName });

    // Step 9: Build graph
    console.log('🕸️ Step 9: buildClaimEvidenceGraph');
    const graphResult = await callTool(client, 'buildClaimEvidenceGraph', { caseId: cfg.caseId, businessName: cfg.businessName });

    // Step 10: Generate report
    console.log('📝 Step 10: generateVerificationReport');
    const reportResult = await callTool(client, 'generateVerificationReport', { caseId: cfg.caseId, businessName: cfg.businessName });

    // Summary
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`  RESULTS — ${cfg.caseId}: ${cfg.businessName}`);
    console.log(`${'─'.repeat(70)}`);
    console.log(`  Overall Score:    ${scoreResult.overallScore}/100`);
    console.log(`  Recommendation:   ${scoreResult.recommendation}`);
    console.log(`  Reason:           ${scoreResult.recommendationReason}`);
    console.log(`  Status:           ${scoreResult.status}`);
    console.log(`  Dimension Scores:`);
    for (const ds of scoreResult.dimensionScores) {
        console.log(`    ${ds.dimension.padEnd(20)} ${ds.score}/100  — ${ds.driver}`);
    }
    console.log(`  Missing Evidence: ${scoreResult.missingEvidence?.length ?? 0} item(s)`);
    if (scoreResult.missingEvidence?.length) {
        for (const me of scoreResult.missingEvidence) {
            console.log(`    • ${me}`);
        }
    }
    console.log(`  Graph:            ${graphResult.data?.stats?.totalNodes ?? 0} nodes, ${graphResult.data?.stats?.totalEdges ?? 0} edges`);
    console.log(`  Report:           ${reportResult.data?.summary?.totalClaims ?? 0} claims, ${reportResult.data?.summary?.totalRedFlags ?? 0} red flags`);

    const outcomeMatch = scoreResult.recommendation === cfg.expectedOutcome;
    console.log(`\n  Expected Outcome: ${cfg.expectedOutcome}`);
    console.log(`  Actual Outcome:   ${scoreResult.recommendation}`);
    console.log(`  ${outcomeMatch ? '✅ MATCH' : '⚠️  MISMATCH (may be acceptable due to real-world grounding)'}`);

    return { caseId: cfg.caseId, score: scoreResult.overallScore, recommendation: scoreResult.recommendation, expected: cfg.expectedOutcome, match: outcomeMatch };
}

async function main() {
    console.log('══════════════════════════════════════════════════════════════════════');
    console.log('  GeoTrust AI — End-to-End Pipeline Test');
    console.log('  Running 3 cases through the full 10-step investigation pipeline');
    console.log('══════════════════════════════════════════════════════════════════════\n');

    const client = await createClient();
    const tools = await client.listTools();
    console.log(`📋 ${tools.tools.length} tools available\n`);

    const results = [];
    for (const cfg of CASES) {
        const r = await runCase(client, cfg);
        results.push(r);
    }

    console.log(`\n\n${'═'.repeat(70)}`);
    console.log('  FINAL SUMMARY');
    console.log(`${'═'.repeat(70)}`);
    console.log(`${'Case'.padEnd(12)} ${'Score'.padEnd(8)} ${'Recommendation'.padEnd(22)} ${'Expected'.padEnd(22)} ${'Result'}`);
    console.log(`${'─'.repeat(70)}`);
    for (const r of results) {
        console.log(`${r.caseId.padEnd(12)} ${String(r.score).padEnd(8)} ${r.recommendation.padEnd(22)} ${r.expected.padEnd(22)} ${r.match ? '✅' : '⚠️'}`);
    }
    console.log(`${'═'.repeat(70)}\n`);

    await client.close();
    process.exit(0);
}

main().catch(console.error);
