import * as fs from "fs/promises";
import * as path from "path";
import { IntentAnswers, IntentAnswersSchema, ElicitIntentInput } from "../schemas/analyzer.schemas.js";
import { safeReadFile } from "../utils/fs-guard.js";

export class IntentService {
  private static CACHE_FILE_NAME = ".gavel-context";

  async readCache(projectPath: string): Promise<IntentAnswers | null> {
    const absolutePath = path.isAbsolute(projectPath)
      ? projectPath
      : path.resolve(process.cwd(), projectPath);
    const cacheFilePath = path.join(absolutePath, IntentService.CACHE_FILE_NAME);

    const content = await safeReadFile(cacheFilePath);
    if (!content) return null;

    try {
      const parsed = JSON.parse(content);
      const validation = IntentAnswersSchema.safeParse(parsed);
      return validation.success ? validation.data : null;
    } catch {
      return null;
    }
  }

  async saveCache(projectPath: string, input: Omit<ElicitIntentInput, "path">): Promise<IntentAnswers> {
    const absolutePath = path.isAbsolute(projectPath)
      ? projectPath
      : path.resolve(process.cwd(), projectPath);
    const cacheFilePath = path.join(absolutePath, IntentService.CACHE_FILE_NAME);

    const intentData: IntentAnswers = {
      audience: input.audience,
      priority: input.priority,
      visualGoal: input.visualGoal,
      updatedAt: new Date().toISOString(),
    };

    await fs.writeFile(cacheFilePath, JSON.stringify(intentData, null, 2), "utf-8");
    return intentData;
  }

  async getCacheStatus(projectPath: string): Promise<{
    exists: boolean;
    isFresh: boolean;
    ageHours: number;
    answers?: IntentAnswers;
  }> {
    const answers = await this.readCache(projectPath);
    if (!answers) {
      return { exists: false, isFresh: false, ageHours: 0 };
    }

    const updatedDate = new Date(answers.updatedAt);
    const ageMs = Date.now() - updatedDate.getTime();
    const ageHours = Math.round((ageMs / (1000 * 60 * 60)) * 10) / 10;
    const isFresh = ageHours < 24;

    return {
      exists: true,
      isFresh,
      ageHours,
      answers,
    };
  }
}
