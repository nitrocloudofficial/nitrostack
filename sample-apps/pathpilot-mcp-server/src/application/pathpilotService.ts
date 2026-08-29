import {
  GitHubMcpAdapter,
  collectRepositorySnapshot,
  parseRepositoryReference,
} from '../adapters/githubMcpAdapter.js';
import { roadmapFusionService } from "./roadmapFusionService.js";
import {
  LinkedInMcpAdapter,
  DEMO_LINKEDIN_PROFILE,
} from '../adapters/linkedinMcpAdapter.js';
import { roadmapService } from "./generalRoadmapService.js";
import { ShortId, analysisCache } from '../infrastructure/cache.js';
import {
  PathwayId,
  ProfileSnapshot,
  RepositorySnapshot, 
  UnifiedAnalysisResult,
  SkillEvidence,
} from '../domain/models.js';
import { buildSkillEvidenceMatrix } from './evidenceFusion.js';
import { buildRoadmapSignal } from './roadmapSignal.js';
import {
  compareProfileAndRepository,
  fuseAnalysis,
  generateEvidenceCards,
  buildDashboardSummary,
  ComparisonRow,
} from './evidenceCards.js';

export interface AnalyzeRequest {
  repo?: string;
  githubUser?: string;
  pathway?: PathwayId;
  includeLinkedIn?: boolean;
  profileRef?: string;
  options?: {
    includeReadme?: boolean;
    maxFiles?: number;
    maxContentReads?: number;
    maxTextKb?: number;
    useDemoLinkedIn?: boolean;
  };
}

export interface AnalyzeEnvelope<T = unknown> {
  requestId: string;
  status: 'success' | 'partial' | 'error';
  data?: T;
  warnings: string[];
  error?: {
    code: string;
    message: string;
    retryable: boolean;
    details?: unknown;
  };
}

export type AnalyzeData = {
  analysisId: string;
  repository?: { fullName: string; branch: string; commits?: number; fileCount?: number; readme?: string };
  profile?: { connected: boolean; source: string; profileRef: string };
  skills: Array<{
    name: string;
    status: SkillEvidence['status'];
    confidence: number;
    sources: SkillEvidence['sources'];
    summary: string;
    evidence: SkillEvidence['evidence'];
    inspected: SkillEvidence['inspected'];
    nextEvidence: SkillEvidence['nextEvidence'];
  }>;
  roadmapSignal: ReturnType<typeof buildRoadmapSignal>;

  personalizedRoadmap: any;

  skillEvidence: SkillEvidence[];
};

export interface EvidenceCardsData {
  analysisId: string;
  cards: ReturnType<typeof generateEvidenceCards>;
}

export interface RoadmapSignalData {
  analysisId: string;
  roadmapSignal: ReturnType<typeof buildRoadmapSignal>;
  dashboard: ReturnType<typeof buildDashboardSummary>;
}

export class PathPilotAnalysisService {
  private github = new GitHubMcpAdapter();
  private linkedin = new LinkedInMcpAdapter();

  private errorEnvelope(requestId: string, code: string, message: string, retryable = false, warnings: string[] = [], details?: unknown): AnalyzeEnvelope<any> {
    return {
      requestId,
      status: 'error',
      data: undefined,
      warnings,
      error: { code, message, retryable, details },
    };
  }

  async analyze(input: AnalyzeRequest, logger?: { info: (m: string, meta?: any) => void }): Promise<AnalyzeEnvelope<AnalyzeData>> {
    console.log("=== analyze() started ===");
    const requestId = ShortId.create('req');
    const pathway: PathwayId = input.pathway || 'full-stack-developer';
    const generalRoadmap = roadmapService.getRoadmap(pathway);
    console.log("General roadmap loaded");
    const warnings: string[] = [];

    try {
      logger?.info('Starting evidence profile analysis', { requestId, repo: input.repo, pathway });

      let repository: RepositorySnapshot | undefined;
      let commitCount: number | undefined;
      let githubProfile: any;

if (input.repo) {

  const isProfileUrl =
    /^https?:\/\/github\.com\/[^/]+\/?$/.test(input.repo);

  if (isProfileUrl) {
    const username = input.repo.replace(/\/$/, "").split("/").pop()!;

    githubProfile = await this.github.getUser(username);
    const repos = await this.github.getUserRepositories(username);
    console.log("Username:", username);
console.log("Repo count:", repos.data?.length);

repos.data?.forEach((r: any) => {
  console.log(r.full_name);
});

console.log(
  "Repositories:",
  repos.data?.map((r: any) => r.full_name)
);
  const bestRepo =
  repos.data?.find((r: any) => !r.fork) ??
  repos.data?.[0];

if (bestRepo) {
  input.repo = bestRepo.full_name;
  console.log("Selected repo:", input.repo);
}

  } else {

    try {
      parseRepositoryReference(input.repo);
    } catch (e: any) {
      return this.errorEnvelope(
        requestId,
        e.code || "INVALID_REPOSITORY",
        e.message || "Invalid repository reference.",
        !!e.retryable
      );
    }

    const collected = await collectRepositorySnapshot(this.github, input.repo, {
      includeReadme: input.options?.includeReadme,
      maxFiles: input.options?.maxFiles,
      maxContentReads: input.options?.maxContentReads,
      maxTextKb: input.options?.maxTextKb,
    });

    if (collected.error && !collected.snapshot) {
      return {
        requestId,
        status: "error",
        data: undefined,
        warnings: collected.warnings || [],
        error: {
          code: collected.error.code,
          message: collected.error.message,
          retryable: collected.error.retryable,
          details: collected.error.details,
        },
      };
    }

    if (collected.error) warnings.push(collected.error.message);
    warnings.push(...(collected.warnings || []));

    repository = collected.snapshot;
    commitCount = collected.commitCount;

    githubProfile = await this.github.getUser(
      input.repo.split("/")[0]
    );
  }

} else if (!input.includeLinkedIn) {
  return this.errorEnvelope(
    requestId,
    "INVALID_REPOSITORY",
    "Either repo or includeLinkedIn=true must be provided."
  );
} else if (!input.includeLinkedIn) {
        return this.errorEnvelope(requestId, 'INVALID_REPOSITORY', 'Either repo or includeLinkedIn=true must be provided.');
      }

let profile: ProfileSnapshot | undefined;

if (githubProfile?.data) {
  profile = {
    source: "github",
    name: githubProfile.data.name ?? githubProfile.data.login,
    headline: githubProfile.data.bio ?? "",
    skills: [],
    experience: [],
    education: [],
  } as any;
}

if (input.includeLinkedIn) {
  try {
    const useDemo = input.options?.useDemoLinkedIn !== false;

    if (useDemo) {
  const linkedInProfile =
    this.linkedin.normalizeRawProfile(DEMO_LINKEDIN_PROFILE);

  profile = {
    ...profile,
    ...linkedInProfile,
    declaredSkills: linkedInProfile.declaredSkills,
    provider: "linkedin",
    connected: true,
  };

  console.log("LinkedIn Skills:", profile.declaredSkills);
} else {
      const { snapshot, error } =
        await this.linkedin.fetchAuthorizedProfile(input.profileRef);

      if (!profile && snapshot) {
        profile = snapshot;
      }

      if (error) {
        warnings.push(error.message);
      }
    }
  } catch (err: any) {
    warnings.push(
      `LinkedIn profile normalization failed: ${err?.message || String(err)}`
    );
  }
}

      const skillEvidence = buildSkillEvidenceMatrix(pathway, repository, profile, commitCount);
      console.log("Skill evidence built");
      const roadmapSignal = buildRoadmapSignal({ skillEvidence, pathway, profile });
      const generalRoadmap = roadmapService.getRoadmap(pathway);

console.log("General roadmap loaded");

const personalizedRoadmap = generalRoadmap
  ? roadmapFusionService.build(generalRoadmap, skillEvidence)
  : null;

console.log("Personalized roadmap built");

      const analysis = fuseAnalysis({
        requestId,
        pathway,
        repository,
        profile,
        skillEvidence,
        roadmapSignal,
        warnings,
      });

      analysisCache.set(`analysis:${analysis.id}`, analysis, 600);

      logger?.info('Evidence profile analysis complete', {
        requestId,
        analysisId: analysis.id,
        verifiedCount: skillEvidence.filter((s) => s.status === 'Verified').length,
        missingCount: skillEvidence.filter((s) => s.status === 'Missing').length,
        priorityGap: roadmapSignal.priorityGap,
        
      });

      const slimSkills = skillEvidence.map((s) => ({
        name: s.skill,
        status: s.status,
        confidence: typeof s.confidence === 'number' ? s.confidence : 0,
        sources: s.sources,
        summary: s.summary,
        evidence: s.evidence,
        inspected: s.inspected,
        nextEvidence: s.nextEvidence,
      }));

      return {
        requestId,
        status: warnings.length > 0 && !repository && profile ? 'partial' : 'success',
        data: {
  analysisId: analysis.id,
  repository: repository
    ? {
        fullName: `${repository.repository.owner}/${repository.repository.repo}`,
        branch: repository.branch,
        commits: commitCount,
        fileCount: repository.files.length,
        readme: repository.readme,
      }
    : undefined,

  profile: profile
    ? {
        connected: profile.connected,
        source: profile.provider,
        profileRef: profile.profileRef,
      }
    : undefined,

  skills: slimSkills,
  roadmapSignal,
  personalizedRoadmap,
  skillEvidence,
},
        warnings,
      };
    } catch (err: any) {
      const message = err instanceof Error ? err.message : String(err);
      logger?.info?.('Unhandled error during analysis', { requestId, message });
      return this.errorEnvelope(
        requestId,
        'PROVIDER_UNAVAILABLE',
        `Analysis failed unexpectedly: ${message}`,
        true,
        warnings,
        { cause: message }
      );
    }
  }

  async getRepositorySnapshot(
    repo: string,
    options?: { includeReadme?: boolean; maxFiles?: number; maxContentReads?: number; maxTextKb?: number }
  ): Promise<AnalyzeEnvelope<RepositorySnapshot>> {
    const requestId = ShortId.create('req');
    try {
      parseRepositoryReference(repo);
    } catch (e: any) {
      return this.errorEnvelope(requestId, e.code || 'INVALID_REPOSITORY', e.message);
    }
    const result = await collectRepositorySnapshot(this.github, repo, options);
    if (result.error && !result.snapshot) {
      return { requestId, status: 'error', warnings: result.warnings, error: result.error };
    }
    return {
      requestId,
      status: result.warnings.length > 0 ? 'partial' : 'success',
      data: result.snapshot,
      warnings: result.warnings,
    };
  }

  getLinkedInProfile(profileRef?: string, useDemo = true): AnalyzeEnvelope<ProfileSnapshot> {
    const requestId = ShortId.create('req');
    if (useDemo === false) {
      const { snapshot, error } = this.linkedin.fetchAuthorizedProfileSync(profileRef);
      if (error) {
        return { requestId, status: 'error', warnings: [], error };
      }
      return { requestId, status: 'success', data: snapshot, warnings: [] };
    }
    const profile = this.linkedin.normalizeRawProfile(DEMO_LINKEDIN_PROFILE);
    return {
      requestId,
      status: 'success',
      data: profile,
      warnings: ['Returning demo LinkedIn profile. Connect LinkedIn account for real user data.'],
    };
  }

  async compareProfileAndRepository(
    input: { repo: string; pathway?: PathwayId; profileRef?: string; useDemoLinkedIn?: boolean }
  ): Promise<AnalyzeEnvelope<ReturnType<typeof compareProfileAndRepository>>> {
    const requestId = ShortId.create('req');
    try {
      const pathway: PathwayId = input.pathway || 'full-stack-developer';
      parseRepositoryReference(input.repo);
      const collected = await collectRepositorySnapshot(this.github, input.repo);
      if (collected.error && !collected.snapshot) {
        return { requestId, status: 'error', warnings: collected.warnings, error: collected.error };
      }
      let profile: ProfileSnapshot;
      if (input.useDemoLinkedIn !== false) {
        profile = this.linkedin.normalizeRawProfile(DEMO_LINKEDIN_PROFILE);
      } else {
        const fetched = await this.linkedin.fetchAuthorizedProfile(input.profileRef);
        if (!fetched.snapshot || fetched.error) {
          return this.errorEnvelope(requestId, fetched.error?.code || 'PROFILE_NOT_CONNECTED', fetched.error?.message || 'No LinkedIn profile available.');
        }
        profile = fetched.snapshot;
      }
      const evidence = buildSkillEvidenceMatrix(pathway, collected.snapshot, profile, collected.commitCount);
      const comparison = compareProfileAndRepository(pathway, evidence);
      return {
        requestId,
        status: collected.warnings.length > 0 ? 'partial' : 'success',
        data: comparison,
        warnings: collected.warnings,
      };
    } catch (err: any) {
      return this.errorEnvelope(requestId, 'PROVIDER_UNAVAILABLE', err?.message || String(err), true);
    }
  }

  generateEvidenceCards(input: { analysisId?: string; analysis?: UnifiedAnalysisResult }): AnalyzeEnvelope<EvidenceCardsData> {
    const requestId = ShortId.create('req');
    let analysis: UnifiedAnalysisResult | undefined;
    if (input.analysis) {
      analysis = input.analysis as UnifiedAnalysisResult;
    } else if (input.analysisId) {
      analysis = analysisCache.get<UnifiedAnalysisResult>(`analysis:${input.analysisId}`);
    }
    if (!analysis) {
      return this.errorEnvelope(
        requestId,
        'ANALYSIS_LIMIT_EXCEEDED',
        'Analysis not found. Run analyze_evidence_profile first or provide an analysis object.',
        true
      );
    }
    const cards = generateEvidenceCards(analysis.skillEvidence);
    return {
      requestId,
      status: 'success',
      data: { analysisId: analysis.id, cards },
      warnings: analysis.warnings || [],
    };
  }

  getRoadmapSignal(input: { analysisId?: string; analysis?: UnifiedAnalysisResult }): AnalyzeEnvelope<RoadmapSignalData> {
    const requestId = ShortId.create('req');
    let analysis: UnifiedAnalysisResult | undefined;
    if (input.analysis) {
      analysis = input.analysis as UnifiedAnalysisResult;
    } else if (input.analysisId) {
      analysis = analysisCache.get<UnifiedAnalysisResult>(`analysis:${input.analysisId}`);
    }
    if (!analysis) {
      return this.errorEnvelope(
        requestId,
        'ANALYSIS_LIMIT_EXCEEDED',
        'Analysis not found. Run analyze_evidence_profile first or provide an analysis object.',
        true
      );
    }
    const dashboard = buildDashboardSummary(analysis, analysis.pathway);
    return {
      requestId,
      status: 'success',
      data: { analysisId: analysis.id, roadmapSignal: analysis.roadmapSignal, dashboard },
      warnings: analysis.warnings || [],
    };
  }

  getAnalysisById(analysisId: string): UnifiedAnalysisResult | undefined {
    return analysisCache.get<UnifiedAnalysisResult>(`analysis:${analysisId}`);
  }
}

export const analysisService = new PathPilotAnalysisService();
