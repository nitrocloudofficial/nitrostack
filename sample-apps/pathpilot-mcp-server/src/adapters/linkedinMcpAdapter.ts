import {
  ProfileSnapshot,
  ProfileRole,
  ProfileEducation,
  ProfileCertification,
  ProfileProject,
  ErrorCode,
} from '../domain/models.js';
import { CONFIG, redactSecrets } from '../infrastructure/config.js';

export interface LinkedInAdapterError {
  code: ErrorCode;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

export interface LinkedInRawProfile {
  profileRef?: string;
  skills?: string[];
  headline?: string;
  summary?: string;
  positions?: Array<Partial<ProfileRole> & { companyName?: string; title?: string }>;
  education?: Array<Partial<ProfileEducation> & { schoolName?: string; degreeName?: string; fieldOfStudy?: string }>;
  certifications?: Array<Partial<ProfileCertification> & { authority?: string; certName?: string }>;
  projects?: Array<Partial<ProfileProject> & { title?: string }>;
}

export const SKILL_NORMALIZATION: Record<string, string[]> = {
  HTML: ['html', 'html5'],
  CSS: ['css', 'css3', 'sass', 'scss', 'less'],
  JavaScript: ['javascript', 'js', 'es6', 'ecmascript'],
  TypeScript: ['typescript', 'ts'],
  React: ['react', 'react.js', 'reactjs', 'react hooks', 'react.jsx'],
  'Node.js': ['node.js', 'nodejs', 'node', 'node js'],
  Express: ['express', 'express.js', 'expressjs'],
  'REST API Integration': ['rest', 'rest api', 'restful api', 'restful', 'apis', 'api development'],
  Database: ['databases', 'database design', 'sql', 'nosql'],
  MongoDB: ['mongodb'],
  PostgreSQL: ['postgresql', 'postgres', 'pg'],
  Git: ['git', 'version control', 'github'],
  Deployment: ['deployment', 'devops', 'ci/cd', 'cicd', 'docker', 'vercel', 'netlify'],
};

export function normalizeSkill(raw: string): string | undefined {
  const lower = raw.trim().toLowerCase();
  for (const [canonical, variants] of Object.entries(SKILL_NORMALIZATION)) {
    if (lower === canonical.toLowerCase() || variants.includes(lower)) return canonical;
    if (variants.some((v) => lower.includes(v))) return canonical;
  }
  return undefined;
}

export function mapAllSkills(rawSkills: string[]): string[] {
  const seen = new Set<string>();
  for (const s of rawSkills) {
    const canonical = normalizeSkill(s);
    if (canonical) seen.add(canonical);
  }
  return Array.from(seen);
}

export class LinkedInMcpAdapter {
  private token?: string;

  constructor(token?: string) {
    this.token = token || CONFIG.linkedinToken;
  }

  async fetchAuthorizedProfile(profileRef?: string): Promise<{ snapshot?: ProfileSnapshot; error?: LinkedInAdapterError }> {
    if (!this.token && !profileRef) {
      return {
        error: {
          code: 'PROFILE_NOT_CONNECTED',
          message: 'Connect LinkedIn to include self-reported profile evidence.',
          retryable: false,
        },
      };
    }
      const snapshot = this.normalizeRawProfile(DEMO_LINKEDIN_PROFILE);

      snapshot.profileRef = profileRef || snapshot.profileRef;

       return { snapshot };
  }

  fetchAuthorizedProfileSync(profileRef?: string): { snapshot?: ProfileSnapshot; error?: LinkedInAdapterError } {
    if (!this.token && !profileRef) {
      return {
        error: {
          code: 'PROFILE_NOT_CONNECTED',
          message: 'Connect LinkedIn to include self-reported profile evidence.',
          retryable: false,
        },
      };
    }
    const snapshot = this.normalizeRawProfile(DEMO_LINKEDIN_PROFILE);

    snapshot.profileRef = profileRef || snapshot.profileRef;

    return { snapshot };
  }

  normalizeRawProfile(raw: LinkedInRawProfile): ProfileSnapshot {
    const declaredSkills = mapAllSkills(raw.skills || []);
    console.log("Raw LinkedIn skills:", raw.skills);
    console.log("Normalized skills:", declaredSkills);

    const roles: ProfileRole[] = (raw.positions || []).map((p) => ({
      title: p.title || '',
      company: p.company || p.companyName,
      startDate: p.startDate,
      endDate: p.endDate,
      description: p.description ? redactSecrets(p.description) : undefined,
    })).filter((r) => r.title);

    const education: ProfileEducation[] = (raw.education || []).map((e) => ({
      school: e.school || e.schoolName || '',
      degree: e.degree || e.degreeName,
      field: e.field || e.fieldOfStudy,
      startDate: e.startDate,
      endDate: e.endDate,
    })).filter((e) => e.school);

    const certifications: ProfileCertification[] = (raw.certifications || []).map((c) => ({
      name: c.name || c.certName || '',
      issuer: c.issuer || c.authority,
      date: c.date,
      credentialId: c.credentialId,
    })).filter((c) => c.name);

    const projects: ProfileProject[] = (raw.projects || []).map((p) => ({
      name: p.name || p.title || '',
      description: p.description ? redactSecrets(p.description) : undefined,
      url: p.url,
      dates: p.dates,
    })).filter((p) => p.name);

    return {
      provider: 'linkedin',
      profileRef: raw.profileRef || 'linkedin:user:normalized',
      connected: true,
      declaredSkills,
      roles,
      education,
      certifications,
      projects,
      collectedAt: new Date().toISOString(),
    };
  }
}

export const DEMO_LINKEDIN_PROFILE: LinkedInRawProfile = {
  profileRef: 'linkedin:demo:learner',
  skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'HTML', 'CSS', 'Git', 'SQL', 'Express'],
  headline: 'Full-Stack Developer in Training',
  positions: [
    { title: 'Junior Web Developer', companyName: 'Acme Studio', startDate: '2025-06', endDate: 'Present' },
  ],
  education: [
    { schoolName: 'State University', degreeName: 'B.Sc.', fieldOfStudy: 'Computer Science' },
  ],
  projects: [
    { title: 'Personal Portfolio Site', description: 'Portfolio website using HTML, CSS, and JS.', url: 'https://example.com' },
  ],
};
