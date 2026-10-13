import { IgniteAnalyzerService } from './src/modules/ignite/ignite-analyzer.service.js';

async function testAnalysis() {
  const service = new IgniteAnalyzerService();

  const ideas = [
    {
      name: 'AI Doctor for Hospitals',
      idea: 'AI-powered diagnostic assistant for hospitals that analyzes medical imaging and patient data to assist physicians in diagnosis',
      industry: 'HealthTech',
      audience: 'Hospital administrators and physicians'
    },
    {
      name: 'Luxury Dog Hotel',
      idea: 'Premium pet boarding facility with luxury amenities including spa services, gourmet meals, and 24/7 monitoring',
      industry: 'Pet Services',
      audience: 'High-income pet owners in urban areas'
    },
    {
      name: 'Space Mining Robots',
      idea: 'Autonomous robots for asteroid mining and resource extraction in space',
      industry: 'Space Tech',
      audience: 'Space agencies and commercial space companies'
    }
  ];

  for (const idea of ideas) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`ANALYZING: ${idea.name}`);
    console.log(`${'='.repeat(80)}`);

    try {
      const analysis = await service.analyzeStartupIdea(idea.idea, idea.industry, idea.audience);
      console.log(JSON.stringify(analysis, null, 2));
    } catch (error) {
      console.error(`Error analyzing ${idea.name}:`, error);
    }
  }
}

testAnalysis().catch(console.error);
