import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { analysisService } from '../../application/pathpilotService.js';

const analyzeInputSchema = z.object({
  repo: z.string().optional().describe('HTTPS GitHub URL or owner/repo identifier (e.g. https://github.com/vercel/next.js or vercel/next.js). Optional if using profile-only mode.'),
  pathway: z.enum(['full-stack-developer']).default('full-stack-developer').describe('Career pathway for the skill evidence matrix.'),
  includeLinkedIn: z.boolean().default(false).describe('If true, include user-authorized LinkedIn profile as self-reported context.'),
  profileRef: z.string().optional().describe('Optional LinkedIn profile reference (if includeLinkedIn true, uses demo profile when no token is present).'),
  options: z.object({
    includeReadme: z.boolean().optional(),
    maxFiles: z.number().int().min(1).max(500).optional(),
    maxContentReads: z.number().int().min(1).max(200).optional(),
    maxTextKb: z.number().int().min(1).max(1024).optional(),
    useDemoLinkedIn: z.boolean().optional(),
  }).optional(),
});

export class PathPilotTools {
  @Tool({
    name: 'analyze_evidence_profile',
    description: 'Analyze a GitHub repository OR a GitHub user profile URL and generate a learning roadmap. If a GitHub profile URL is provided, automatically inspect the user\'s public repositories to infer skills.',
    inputSchema: analyzeInputSchema,
    examples: {
      request: {
        repo: 'https://github.com/owner/project',
        pathway: 'full-stack-developer',
        includeLinkedIn: true,
        options: { includeReadme: true, maxFiles: 80 },
      },
      response: {
        requestId: 'req_abc123',
        status: 'success',
        data: {
          repository: { fullName: 'owner/project', branch: 'main' },
          profile: { connected: true, source: 'linkedin' },
          skills: [{ name: 'React', status: 'Verified', sources: [{ provider: 'github' }, { provider: 'linkedin', field: 'skills' }] }],
          roadmapSignal: {
            verified: ['HTML', 'CSS'],
            selfReported: ['Node.js'],
            missing: ['REST API Integration'],
            priorityGap: 'REST API Integration',
          },
        },
        warnings: [],
      },
    },
  })
  async analyzeEvidenceProfile(input: any, ctx: ExecutionContext) {
    return analysisService.analyze(input, ctx.logger);
  }

  @Tool({
    name: 'get_repository_snapshot',
    description: 'Return a bounded, normalized repository snapshot (file tree, manifest, README, selected source content) without running the full analysis pipeline.',
    inputSchema: z.object({
      repo: z.string().describe('HTTPS GitHub URL or owner/repo identifier.'),
      branch: z.string().optional().describe('Optional branch/ref. Defaults to repository default branch.'),
      options: z.object({
        includeReadme: z.boolean().optional(),
        maxFiles: z.number().int().min(1).max(500).optional(),
      }).optional(),
    }),
  })
  async getRepositorySnapshot(input: any, _ctx: ExecutionContext) {
    return analysisService.getRepositorySnapshot(input.repo, input.options || {});
  }

  @Tool({
    name: 'get_linkedin_profile',
    description: 'Return user-authorized, normalized LinkedIn profile snapshot with declared skills, roles, education, certifications, and projects.',
    inputSchema: z.object({
      profileRef: z.string().optional().describe('Optional profile reference; uses demo profile by default in MVP.'),
      useDemo: z.boolean().default(true).describe('If true, returns a normalized demo profile. Set false to attempt real LinkedIn connection.'),
    }),
  })
  getLinkedinProfile(input: any, _ctx: ExecutionContext) {
    return analysisService.getLinkedInProfile(input.profileRef, input.useDemo !== false);
  }

  @Tool({
    name: 'compare_profile_and_repository_skills',
    description: 'Identify self-reported LinkedIn skills that do / do not have matching GitHub evidence in the selected repository.',
    inputSchema: z.object({
      repo: z.string().describe('HTTPS GitHub URL or owner/repo identifier.'),
      pathway: z.enum(['full-stack-developer']).default('full-stack-developer').describe('Target pathway skill matrix.'),
      profileRef: z.string().optional(),
      useDemoLinkedIn: z.boolean().default(true),
    }),
  })
  async compareProfileAndRepositorySkills(input: any, _ctx: ExecutionContext) {
    return analysisService.compareProfileAndRepository({
      repo: input.repo,
      pathway: input.pathway,
      profileRef: input.profileRef,
      useDemoLinkedIn: input.useDemoLinkedIn !== false,
    });
  }

  @Tool({
    name: 'generate_evidence_cards',
    description: 'Return UI-ready evidence cards with highlights, summaries, sources, and next-step suggestions. Accepts an analysisId from a prior run, or an analysis object.',
    inputSchema: z.object({
      analysisId: z.string().optional().describe('Cached analysis id returned from analyze_evidence_profile.'),
      analysis: z.any().optional().describe('Optional inline unified analysis result object.'),
    }),
  })
  generateEvidenceCards(input: any, _ctx: ExecutionContext) {
    return analysisService.generateEvidenceCards({ analysisId: input.analysisId, analysis: input.analysis });
  }

  @Tool({
    name: 'get_roadmap_signal',
    description: 'Return verified/self-reported/partial/missing skill arrays plus the priority gap and a suggested next task from a prior analysisId or analysis object.',
    inputSchema: z.object({
      analysisId: z.string().optional().describe('Cached analysis id returned from analyze_evidence_profile.'),
      analysis: z.any().optional().describe('Optional inline unified analysis result object.'),
    }),
  })
  getRoadmapSignal(input: any, _ctx: ExecutionContext) {
    return analysisService.getRoadmapSignal({ analysisId: input.analysisId, analysis: input.analysis });
  }
}
