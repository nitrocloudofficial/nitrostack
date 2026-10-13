export interface ProvenanceRecord {
  source: string;
  field: string;
  rawValue: any;
  normalizedValue: any;
  evidenceTier: 'A' | 'B' | 'C' | 'D';
  confidence: number;
  action: 'normalized' | 'merged' | 'tied' | 'discarded';
  reason?: string;
}

export interface ExperienceRecord {
  company: string;
  title: string;
  duration: string;
  description: string;
}

export interface ProjectRecord {
  name: string;
  description?: string;
  url?: string;
  technologies?: string[];
}
export interface PublicationRecord {
  title: string;
  publisher?: string;
  url?: string;
  date?: string;
  description?: string;
}

export interface CandidateProfile {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  bio_narratives: string[];
  skills: string[];
  links: string[];
  experience: ExperienceRecord[];
  projects: ProjectRecord[];
  publications: PublicationRecord[];
  provenance: ProvenanceRecord[];
  conflicts: any[];
}

export interface RawCandidateData {
  source: string;
  tier: 'A' | 'B' | 'C' | 'D';
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  bio?: string;
  skills?: string[];
  links?: string[];
  experience?: ExperienceRecord[];
  projects?: ProjectRecord[];
  publications?: PublicationRecord[];
}
