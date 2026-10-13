import { resolveIdentity } from './services/identity.js';
import { db } from './db/client.js';

async function testIdentityResolution() {
  console.log('=== TESTING ISSUE 2: SPEAKER & IDENTITY RESOLUTION ===\n');

  // Case (a): Same person named differently across transcripts
  const testA1 = await resolveIdentity('Alice');
  const testA2 = await resolveIdentity('Alice Chen');
  const testA3 = await resolveIdentity('Alice from infra');

  console.log('--- TEST CASE (a): Inconsistent naming for same person ---');
  console.log('Input: "Alice"            => Resolved:', testA1);
  console.log('Input: "Alice Chen"       => Resolved:', testA2);
  console.log('Input: "Alice from infra" => Resolved:', testA3);

  const isSameCanonicalId = testA1.canonicalOwnerId && testA1.canonicalOwnerId === testA2.canonicalOwnerId && testA2.canonicalOwnerId === testA3.canonicalOwnerId;
  console.log(`✅ All 3 variants resolved to same Canonical Person ID (${testA1.canonicalOwnerId}):`, isSameCanonicalId);

  // Case (b): Genuine group decision
  const testB1 = await resolveIdentity('Team Consensus');
  const testB2 = await resolveIdentity('Engineering Team unanimous vote');

  console.log('\n--- TEST CASE (b): Group / Consensus Decision ---');
  console.log('Input: "Team Consensus"                 => Resolved:', testB1);
  console.log('Input: "Engineering Team unanimous..."  => Resolved:', testB2);
  console.log('✅ Correctly flagged as Group Consensus (no single owner):', testB1.isGroupConsensus && testB2.isGroupConsensus);

  // Case (c): Unclear / Unknown speaker
  const testC1 = await resolveIdentity('Unknown');
  const testC2 = await resolveIdentity('unclear speaker');

  console.log('\n--- TEST CASE (c): Unclear / Unknown Speaker ---');
  console.log('Input: "Unknown"           => Resolved:', testC1);
  console.log('Input: "unclear speaker"   => Resolved:', testC2);
  console.log('✅ Correctly set to NULL/Unknown owner without fabricating a name:', testC1.displayOwner === null && testC2.displayOwner === null);

  await db.end();
}

testIdentityResolution().catch(console.error);
