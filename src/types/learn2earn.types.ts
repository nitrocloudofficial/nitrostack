// Types ported from the original Learn2Earn AI Studio app (src/types.ts)
export type ConceptStatus = 'locked' | 'unlocked_for_study' | 'mastered';
export type SourceMode = 'topic' | 'pdf' | 'text' | 'jee';
export type QuestionType = 'mcq' | 'theory_mcq' | 'numerical';

export interface ExternalContext {
  source: string;
  title: string;
  summary: string;
  url: string;
  thumbnail?: string;
}

export interface QuizQuestion {
  id: string;
  type?: QuestionType;
  question: string;
  options?: string[];
  correct_index?: number;
  correct_value?: number;
  tolerance?: number;
  unit?: string | null;
  explanation?: string;
}

export interface TopicAnalysis {
  topic: string;
  domain: 'computer_science' | 'physics' | 'chemistry' | 'mathematics' | 'biology' | 'engineering' | 'economics' | 'general';
  subject_area: string;
  core_prerequisites: string[];
  key_terminologies: string[];
  has_formulas: boolean;
  has_code_syntax: boolean;
  standard_formula_or_syntax?: string | null;
  concrete_worked_example?: string;
  common_misconceptions?: string[];
  apt_analogy?: string | null;
  learning_objectives?: string[];
}

export interface LessonContent {
  summary: string;
  explanation: string;
  key_points: string[];
  example: string;
  common_mistakes: string[];
  analogy: string | null;
  formula_or_syntax?: string | null;
  connections?: string;
  examples?: string[];
}

export interface ConceptLessonData {
  quick?: LessonContent;
  deep?: LessonContent;
}

export interface Concept {
  id: string;
  name: string;
  subject?: 'physics' | 'chemistry' | 'maths' | string;
  prerequisites: string[];
  status: ConceptStatus;
  quiz: QuizQuestion[];
  reward_amount: number;
  description?: string;
  external_context?: ExternalContext;
  lessons?: ConceptLessonData;
}

export interface Wallet {
  deposited: number;
  locked: number;
  unlocked: number;
  completed_challenges?: string[];
}

export interface ProgressLogEntry {
  id: string;
  timestamp: string;
  event: 'session_started' | 'quiz_generated' | 'quiz_submitted' | 'concept_mastered' | 'wallet_unlocked' | 'external_context_fetched' | 'map_expanded';
  concept_id?: string;
  concept_name?: string;
  details: string;
}

export interface SessionData {
  session_id: string;
  topic: string;
  source_mode: SourceMode;
  concepts: Concept[];
  wallet: Wallet;
  progress_log: ProgressLogEntry[];
  created_at: string;
  is_free_mode?: boolean;
  selected_subjects?: string[];
  topic_analysis?: TopicAnalysis;
}

export type RoadmapNodeStatus = 'completed' | 'in_progress' | 'unlocked' | 'locked';

export interface RoadmapMilestone {
  id: string;
  title: string;
  description: string;
  status: RoadmapNodeStatus;
  prerequisites: string[];
  estimated_hours?: number;
  concepts?: string[];
}

export interface LearningRoadmap {
  goal: string;
  roadmap: RoadmapMilestone[];
  completed_count?: number;
  total_count?: number;
}
