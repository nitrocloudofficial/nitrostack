import { SkillEvidence } from "../domain/models.js";

export interface PersonalizedRoadmapSkill {
  name: string;
  status: string;
  confidence?: number;
  estimatedWeeks?: number;
}

export interface PersonalizedRoadmap {
  title: string;
  completed: PersonalizedRoadmapSkill[];
  inProgress: PersonalizedRoadmapSkill[];
  next: PersonalizedRoadmapSkill[];
}

export class RoadmapFusionService {
  build(generalRoadmap: any, evidence: SkillEvidence[]): PersonalizedRoadmap {

    const completed: PersonalizedRoadmapSkill[] = [];
    const inProgress: PersonalizedRoadmapSkill[] = [];
    const next: PersonalizedRoadmapSkill[] = [];

    for (const skill of generalRoadmap.skills) {

      const found = evidence.find(
        e => e.skill.toLowerCase() === skill.name.toLowerCase()
      );

      if (!found) {
        next.push({
          name: skill.name,
          status: "Missing",
          estimatedWeeks: skill.estimatedWeeks
        });
        continue;
      }

      if (found.status === "Verified") {
        completed.push({
          name: skill.name,
          status: found.status,
          confidence: found.confidence,
          estimatedWeeks: skill.estimatedWeeks
        });
      } else if (found.status === "Partial") {
        inProgress.push({
          name: skill.name,
          status: found.status,
          confidence: found.confidence,
          estimatedWeeks: skill.estimatedWeeks
        });
      } else {
        next.push({
          name: skill.name,
          status: found.status,
          confidence: found.confidence,
          estimatedWeeks: skill.estimatedWeeks
        });
      }
    }

    return {
      title: generalRoadmap.title,
      completed,
      inProgress,
      next
    };
  }
}

export const roadmapFusionService = new RoadmapFusionService();