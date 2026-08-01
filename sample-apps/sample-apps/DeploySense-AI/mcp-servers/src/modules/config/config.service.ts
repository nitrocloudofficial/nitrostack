import { Injectable } from '@nitrostack/core';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class ConfigService {
  getDataDirectory(): string {
    return path.join(process.cwd(), 'data');
  }

  isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  getSimulationDataDirectory(): string {
    const localDir = path.join(process.cwd(), 'simulation-data');
    if (fs.existsSync(localDir)) {
      return localDir;
    }
    return path.join(process.cwd(), '..', 'simulation-data');
  }

  getActiveScenarioName(): string {
    try {
      const activeFilePath = path.join(this.getSimulationDataDirectory(), 'active-scenario.json');
      if (fs.existsSync(activeFilePath)) {
        const content = JSON.parse(fs.readFileSync(activeFilePath, 'utf8'));
        return content.activeScenario || 'default';
      }
    } catch (e) {
      console.error('Failed to read active scenario, falling back to default:', e);
    }
    return 'default';
  }

  getScenarioData(scenarioName: string): any {
    try {
      const scenarioPath = path.join(this.getSimulationDataDirectory(), 'scenarios', `${scenarioName}.json`);
      if (fs.existsSync(scenarioPath)) {
        return JSON.parse(fs.readFileSync(scenarioPath, 'utf8'));
      }
    } catch (e) {
      console.error(`Failed to read scenario data for ${scenarioName}:`, e);
    }
    return null;
  }

  getMockData(type: string): any {
    const activeScenario = this.getActiveScenarioName();
    if (activeScenario !== 'default') {
      const scenarioData = this.getScenarioData(activeScenario);
      if (scenarioData && scenarioData[type]) {
        return scenarioData[type];
      }
    }

    // Fallback to legacy local data files
    try {
      const legacyPath = path.join(this.getDataDirectory(), `${type}.json`);
      if (fs.existsSync(legacyPath)) {
        return JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
      }
    } catch (e) {
      console.error(`Failed to read legacy fallback data for ${type}:`, e);
    }
    return null;
  }
}

