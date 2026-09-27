import { z } from 'zod';

export const SdlcModelEnum = z.enum([
  'Agile-Scrum',
  'Waterfall',
  'RAD',
  'Kanban',
  'Spiral',
]);
export type SdlcModel = z.infer<typeof SdlcModelEnum>;

export const RequirementSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  type: z.enum(['functional', 'non_functional', 'constraint']),
  priority: z.enum(['high', 'medium', 'low']),
});
export type Requirement = z.infer<typeof RequirementSchema>;

export const TeamMemberSchema = z.object({
  name: z.string().describe('Full name of the team member'),
  skills: z.array(z.string()).min(1).describe('List of technical/functional skills'),
  experience_years: z.number().min(0).describe('Years of professional experience'),
  preferred_role: z.string().optional().describe('Role the member prefers, e.g. Backend Developer'),
  working_hours_per_day: z.number().gt(0).lte(24).default(8).describe('Available working hours per day'),
});
export type TeamMember = z.infer<typeof TeamMemberSchema>;

export const SrdInputSchema = z.object({
  file_name: z.string().optional().describe('Original SRD file name, if uploaded as a file'),
  file_type: z.string().optional().describe('MIME type of uploaded SRD (application/pdf, text/plain, text/csv)'),
  file_content: z.string().optional().describe('Base64-encoded SRD file content'),
  srd_text: z.string().optional().describe('Raw SRD text, if pasted directly instead of uploaded'),
  project_duration_weeks: z.number().gt(0).describe('Total available project duration in weeks'),
  deadline: z.string().describe('ISO 8601 target deadline date'),
});
export type SrdInput = z.infer<typeof SrdInputSchema>;

export const TeamInputSchema = z.object({
  project_context_id: z.string().describe('ID returned by parse_srd'),
  members: z.array(TeamMemberSchema).optional().describe('Team roster as structured JSON'),
  file_name: z.string().optional().describe('Original roster file name, if uploaded as a CSV file'),
  file_type: z.string().optional().describe('MIME type of the uploaded roster file (text/csv)'),
  file_content: z.string().optional().describe('Base64-encoded CSV roster content'),
});
export type TeamInput = z.infer<typeof TeamInputSchema>;

export const ProjectContextIdInputSchema = z.object({
  project_context_id: z.string().describe('ID returned by parse_srd'),
});
export type ProjectContextIdInput = z.infer<typeof ProjectContextIdInputSchema>;

export interface SdlcCandidate {
  model: SdlcModel;
  fit_score: number;
  justification: string;
  pros: string[];
  cons: string[];
}

export interface RoadmapPhase {
  phase_number: number;
  name: string;
  duration_weeks: number;
  objectives: string[];
}

export interface RoadmapMilestone {
  id: string;
  title: string;
  target_week: number;
  deliverables: string[];
}

export interface ProjectRisk {
  id: string;
  category: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  mitigation: string;
}

export interface RoleAllocation {
  member_name: string;
  assigned_role: string;
  match_score: number;
  match_reasons: string[];
  daily_hours: number;
}

export interface ScheduledTask {
  task_id: string;
  title: string;
  assigned_to: string;
  timeframe: 'daily' | 'weekly' | 'monthly';
  unit_name: string;
  estimated_hours: number;
}

export interface ProjectContext {
  project_context_id: string;
  created_at: string;
  srd_summary?: {
    raw_text: string;
    parsed_requirements: Requirement[];
    project_duration_weeks: number;
    deadline: string;
  };
  team_members?: TeamMember[];
  sdlc_candidates?: SdlcCandidate[];
  selected_sdlc_model?: SdlcModel;
  roadmap?: {
    phases: RoadmapPhase[];
    milestones: RoadmapMilestone[];
    risks: ProjectRisk[];
  };
  allocations?: RoleAllocation[];
  task_schedule?: ScheduledTask[];
}
