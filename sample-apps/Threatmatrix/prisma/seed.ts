import { prisma } from '../src/db/prisma.js';

async function main() {
  console.log('🌱 Seeding database...');

  const user = await prisma.user.upsert({
    where: { email: 'secops@threatmatrix.io' },
    update: {},
    create: {
      email: 'secops@threatmatrix.io',
      name: 'Security Admin',
      scans: {
        create: [
          {
            inputType: 'text',
            overallThreatScore: 85,
            riskLevel: 'CRITICAL',
            recommendation: 'DANGER: Do NOT open links. Phishing misdirection detected.',
            structuralFlags: [{ category: 'AUTO_EXEC', flag: 'EMBEDDED_JAVASCRIPT', severity: 'CRITICAL', description: 'PDF embedded script' }],
            linkFlags: [{ url: 'http://malicious-phish.com', flagType: 'ANCHOR_MISMATCH', severity: 'CRITICAL', details: 'Phishing Anchor Mismatch' }],
            aiFraudReport: { isFraudulent: true, confidenceScore: 90, summary: 'Wire fraud scam' },
          },
        ],
      },
    },
  });

  console.log('✅ Seeding completed successfully. User ID:', user.id);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
