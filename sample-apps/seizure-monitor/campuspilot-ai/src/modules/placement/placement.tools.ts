import { ToolDecorator as Tool, Widget, Cache, ExecutionContext, z } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';

const RESOURCES_PATH = path.join(process.cwd(), 'src', 'resources');

function loadPlacement() {
  const filePath = path.join(RESOURCES_PATH, 'placement.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

export class PlacementTools {
  @Tool({
    name: 'placement_roadmap',
    description: `Get the placement preparation roadmap and company-specific interview guidance.
      Use this tool when the student asks: "How do I prepare for placements?", "What is the roadmap for TCS?", "How to prepare for Amazon interview?", "DSA roadmap", "Placement tips", "Interview preparation guide", "System design resources".
      Returns phase-wise roadmap, company-specific tips, and resource recommendations.`,
    inputSchema: z.object({
      target: z.string().optional()
        .describe('Optional: target company or company type, e.g. "TCS", "Amazon", "Google", "FAANG", "Service", "Product". Leave empty for the general roadmap.'),
      phase: z.number().min(1).max(4).optional()
        .describe('Optional: specific preparation phase (1=DSA, 2=System Design, 3=Core CS, 4=Resume)'),
    }),
    examples: {
      request: { target: 'Amazon' },
      response: {
        company: 'Amazon',
        rounds: ['Online Assessment', 'Technical Phone Screen', 'Onsite Loop'],
        tips: ['Focus on Leadership Principles', 'Master hash maps and trees'],
        resources: ['LeetCode', 'NeetCode 150']
      }
    }
  })
  @Widget('placement-view')
  @Cache({ ttl: 3600 })
  async placementRoadmap(input: { target?: string; phase?: number }, ctx: ExecutionContext) {
    ctx.logger.info('Fetching placement roadmap', { target: input.target, phase: input.phase });

    const data = loadPlacement();
    const { roadmap } = data;

    // Company-specific response
    if (input.target) {
      const targetLower = input.target.toLowerCase();

      // Check exact company match
      const companyKey = Object.keys(roadmap.companies).find(
        k => k.toLowerCase() === targetLower || roadmap.companies[k]?.name?.toLowerCase().includes(targetLower)
      );

      if (companyKey && roadmap.companies[companyKey].rounds) {
        const company = roadmap.companies[companyKey];
        return {
          type: 'company-specific',
          company: company.name || companyKey,
          companyType: company.type,
          difficulty: company.difficulty,
          rounds: company.rounds,
          tips: company.tips,
          leadershipPrinciples: company.leadershipPrinciples || [],
          recommendedPhases: roadmap.phases.filter(
            (p: any) => p.priority === 'critical' || p.priority === 'high'
          ),
          resources: roadmap.resources,
          message: `Here's your personalized preparation plan for ${company.name || companyKey}!`,
        };
      }

      // Category match (FAANG, Service, Product)
      const categoryKey = Object.keys(roadmap.companies).find(
        k => k.toLowerCase() === targetLower
      );

      if (categoryKey) {
        const category = roadmap.companies[categoryKey];
        return {
          type: 'category',
          category: categoryKey,
          companies: category.companies,
          focus: category.focus,
          codingRounds: category.codingRounds,
          difficulty: category.difficulty,
          tips: category.tips,
          roadmap: roadmap.phases,
          resources: roadmap.resources,
        };
      }
    }

    // Phase-specific response
    if (input.phase !== undefined && input.phase !== null) {
      const phaseNum = input.phase;
      const phaseData = roadmap.phases.find((p: any) => p.phase === phaseNum);
      if (phaseData) {
        return {
          type: 'phase',
          phase: phaseData.phase,
          title: phaseData.title,
          duration: phaseData.duration,
          priority: phaseData.priority,
          topics: phaseData.topics,
          resources: roadmap.resources,
          nextPhase:
            phaseNum < 4
              ? roadmap.phases.find((p: any) => p.phase === phaseNum + 1)?.title
              : 'You\'ve covered all phases! Start applying!',
        };
      }
    }

    // General roadmap
    return {
      type: 'general',
      message: '🎯 Complete Placement Preparation Roadmap for CSE Students',
      totalDuration: '4-6 months',
      phases: roadmap.phases.map((p: any) => ({
        phase: p.phase,
        title: p.title,
        duration: p.duration,
        priority: p.priority,
        topicCount: p.topics.length,
        keyTopics: p.topics.slice(0, 3).map((t: any) => t.topic),
      })),
      companyCategories: {
        FAANG: roadmap.companies.FAANG?.companies || [],
        Service: roadmap.companies.Service?.companies || [],
        Product: roadmap.companies.Product?.companies || [],
      },
      quickTips: [
        '📌 Start with DSA – it\'s the most important filter round.',
        '📌 Aim for 200+ LeetCode problems before applying.',
        '📌 Practice system design for product companies.',
        '📌 Prepare behavioral answers using the STAR method.',
        '📌 Build 2-3 good projects to showcase on your resume.',
      ],
      resources: roadmap.resources,
    };
  }
}
