import fs from "fs";
import path from "path";

export interface RoadmapSkill {
  name: string;
  level: number;
  estimatedWeeks: number;
}

export interface CareerRoadmap {
  id: string;
  title: string;
  description: string;
  estimatedDuration: string;
  skills: RoadmapSkill[];
}

export class GeneralRoadmapService {
  private roadmapDir = path.join(process.cwd(), "src", "roadmap");

  getRoadmap(pathway: string): CareerRoadmap | null {
  const filePath = path.join(this.roadmapDir, `${pathway}.json`);

  console.log("Looking for roadmap:", filePath);

  if (!fs.existsSync(filePath)) {
    console.error("Roadmap file NOT FOUND:", filePath);
    return null;
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

  console.log("Roadmap loaded successfully");

  return data;
}

  getAvailableRoadmaps(): string[] {
    return fs
      .readdirSync(this.roadmapDir)
      .filter(file => file.endsWith(".json"))
      .map(file => file.replace(".json", ""));
  }
}

export const roadmapService = new GeneralRoadmapService();