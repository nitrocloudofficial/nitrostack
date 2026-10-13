import { CandidateProfile, RawCandidateData, ExperienceRecord, ProjectRecord, PublicationRecord } from '../models/candidate.js';

export class MergeEngine {
  // Source Tier Confidence Weights:
  // Tier A: Resume (0.95) - Highest Authority
  // Tier B: GitHub (0.70)
  // Tier C: Portfolio (0.50)
  // Tier D: Unverified / Third-party (0.30)
  private readonly tierConfidence = {
    'A': 0.95,
    'B': 0.70,
    'C': 0.50,
    'D': 0.30
  };

  /**
   * Aggregates raw candidate records from multiple sources (Resume, Portfolio, GitHub)
   * into a unified candidate payload and detects data conflicts across sources.
   */
  merge(records: RawCandidateData[], candidateId: string): CandidateProfile {
    const profile: CandidateProfile = {
      id: candidateId,
      skills: [],
      links: [],
      experience: [],
      projects: [],
      publications: [],
      bio_narratives: [],
      provenance: [],
      conflicts: []
    };

    if (!records || records.length === 0) return profile;

    const validRecords = records.filter(r => r !== null);

    // Resolve primary contact & identity scalar fields based on source tier priority
    profile.name = this.resolveField('name', validRecords, profile);
    profile.email = this.resolveField('email', validRecords, profile);
    profile.phone = this.resolveField('phone', validRecords, profile);
    profile.location = this.resolveField('location', validRecords, profile);

    // Collect all bio narratives
    for (const r of validRecords) {
      if (r.bio && r.bio.trim().length > 0) {
        profile.bio_narratives.push(r.bio.trim());
      }
    }

    // Aggregate array fields from all sources cleanly
    this.aggregateArrayFields(validRecords, profile);

    return profile;
  }

  private getNormalizedValue(field: string, val: string): string {
    const clean = val.toLowerCase().trim();
    if (field === 'phone') {
      const digits = clean.replace(/[^\d]/g, '');
      return digits.slice(-10);
    }
    return clean;
  }

  private resolveField(field: keyof RawCandidateData, records: RawCandidateData[], profile: CandidateProfile): string | undefined {
    const candidatesValues: Array<{ value: string, record: RawCandidateData }> = [];

    for (const r of records) {
      if (r[field] && typeof r[field] === 'string') {
        const val = (r[field] as string).trim();
        if (val.length > 0) {
          candidatesValues.push({ value: val, record: r });
        }
      }
    }

    if (candidatesValues.length === 0) return undefined;

    // Sort by evidence tier confidence (Tier A Resume > Tier B GitHub > Tier C Portfolio)
    candidatesValues.sort((a, b) => {
      const confA = this.tierConfidence[a.record.tier] || 0.5;
      const confB = this.tierConfidence[b.record.tier] || 0.5;
      return confB - confA;
    });

    const winner = candidatesValues[0];

    // Detect conflicts across different data sources
    const normalizedMap = new Map<string, Array<{ value: string; source: string; tier: string }>>();
    for (const item of candidatesValues) {
      const norm = this.getNormalizedValue(field, item.value);
      if (!normalizedMap.has(norm)) {
        normalizedMap.set(norm, []);
      }
      normalizedMap.get(norm)!.push({ value: item.value, source: item.record.source, tier: item.record.tier });
    }

    // If more than 1 distinct value exists for this field, record a conflict!
    if (normalizedMap.size > 1) {
      const allValuesStr = candidatesValues.map(c => `'${c.value}' from ${c.record.source} (Tier ${c.record.tier})`).join(', ');
      profile.conflicts.push({
        field,
        selected_value: winner.value,
        primary_source: winner.record.source,
        primary_tier: winner.record.tier,
        all_detected_values: candidatesValues.map(c => ({
          value: c.value,
          source: c.record.source,
          tier: c.record.tier
        })),
        message: `Conflict detected for '${field}': Found ${normalizedMap.size} conflicting values: [${allValuesStr}]. Selected '${winner.value}' from ${winner.record.source} due to higher tier priority (Tier ${winner.record.tier}).`
      });
    }

    // Record provenance
    profile.provenance.push({
      source: winner.record.source,
      field,
      rawValue: winner.value,
      normalizedValue: winner.value.trim(),
      evidenceTier: winner.record.tier,
      confidence: this.tierConfidence[winner.record.tier] || 0.5,
      action: 'merged',
      reason: `Primary value selected from Tier ${winner.record.tier} (${winner.record.source})`
    });

    return winner.value.trim();
  }

  private aggregateArrayFields(records: RawCandidateData[], profile: CandidateProfile) {
    const skillsSet = new Set<string>();
    const linksSet = new Set<string>();
    const experienceList: ExperienceRecord[] = [];
    const rawProjectsList: ProjectRecord[] = [];
    const rawPublicationsList: PublicationRecord[] = [];

    for (const r of records) {
      // 1. Collect skills
      if (r.skills) {
        r.skills.forEach(s => {
          if (s && s.trim()) skillsSet.add(s.trim());
        });
      }

      // 2. Collect experience
      if (r.experience) {
        r.experience.forEach(exp => experienceList.push({ ...exp }));
      }

      // 3. Collect projects
      if (r.projects) {
        r.projects.forEach(p => {
          if (p && p.name && p.name.trim()) rawProjectsList.push({ ...p });
        });
      }

      // 4. Collect links
      if (r.links) {
        r.links.forEach(l => {
          if (l && l.trim()) linksSet.add(l.trim());
        });
      }

      // 5. Collect publications
      if (r.publications) {
        r.publications.forEach(pub => {
          if (pub && pub.title && pub.title.trim()) rawPublicationsList.push({ ...pub });
        });
      }
    }

    // Merge projects intelligently to preserve direct live GitHub repository URLs
    const mergedProjects: ProjectRecord[] = [];

    for (const proj of rawProjectsList) {
      const projCleanName = proj.name.trim();
      const projSlug = projCleanName.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Find matching project by exact URL or exact slug match
      const existing = mergedProjects.find(m => {
        if (m.url && proj.url && !isProfileRootUrl(m.url) && !isProfileRootUrl(proj.url)) {
          if (m.url.toLowerCase().trim().replace(/\/$/, '') === proj.url.toLowerCase().trim().replace(/\/$/, '')) {
            return true;
          }
        }
        const mSlug = m.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (mSlug === projSlug) return true;
        return false;
      });

      if (!existing) {
        mergedProjects.push({
          name: projCleanName,
          description: proj.description ? proj.description.trim() : '',
          url: proj.url ? proj.url.trim() : undefined,
          technologies: proj.technologies ? Array.from(new Set(proj.technologies.map(t => t.trim()))) : []
        });
      } else {
        // Merge project properties:
        // 1. Keep direct live working URL if available
        if (proj.url && !existing.url) {
          existing.url = proj.url.trim();
        }
        // 2. Prefer human-readable title over repo_slug_name
        if (projCleanName.length > existing.name.length && !projCleanName.includes('_') && !projCleanName.includes('-')) {
          existing.name = projCleanName;
        }
        // 3. Keep richer description
        if (proj.description && proj.description.trim().length > (existing.description || '').length) {
          existing.description = proj.description.trim();
        }
        // 4. Combine technologies
        if (proj.technologies && proj.technologies.length > 0) {
          const techs = new Set([...(existing.technologies || []), ...proj.technologies.map(t => t.trim())]);
          existing.technologies = Array.from(techs);
        }
      }
    }

    // Merge and deduplicate publications by normalized title
    const mergedPublications: PublicationRecord[] = [];
    for (const pub of rawPublicationsList) {
      const pubTitle = pub.title.trim();
      const pubSlug = pubTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
      const existing = mergedPublications.find(m => m.title.toLowerCase().replace(/[^a-z0-9]/g, '') === pubSlug);

      if (!existing) {
        mergedPublications.push({
          title: pubTitle,
          publisher: pub.publisher ? pub.publisher.trim() : undefined,
          url: pub.url ? pub.url.trim() : undefined,
          date: pub.date ? pub.date.trim() : undefined,
          description: pub.description ? pub.description.trim() : undefined
        });
      } else {
        if (pub.url && !existing.url) existing.url = pub.url.trim();
        if (pub.publisher && !existing.publisher) existing.publisher = pub.publisher.trim();
        if (pub.date && !existing.date) existing.date = pub.date.trim();
        if (pub.description && pub.description.trim().length > (existing.description || '').length) {
          existing.description = pub.description.trim();
        }
      }
    }

    profile.skills = Array.from(skillsSet);
    profile.links = Array.from(linksSet);
    profile.experience = experienceList;
    profile.projects = mergedProjects;
    profile.publications = mergedPublications;
  }
}

function isProfileRootUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    const hostname = url.hostname.toLowerCase();
    
    if (hostname.includes('github.com')) {
      const paths = url.pathname.split('/').filter(Boolean);
      return paths.length <= 1; // e.g. github.com/username (no repo path)
    }
    if (hostname.includes('linkedin.com')) {
      return true;
    }
    if (url.pathname === '/' || url.pathname === '') {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
