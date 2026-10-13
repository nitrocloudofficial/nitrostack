import { appConfig } from '../config/app.config.js';
import { env } from '../config/env.config.js';

export class ConfigManager {
  private static instance: ConfigManager;
  private configData: Record<string, unknown>;

  private constructor() {
    this.configData = {
      app: appConfig,
      env: env
    };
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  public get<T>(key: string): T | undefined {
    const keys = key.split('.');
    let val: any = this.configData;
    for (const k of keys) {
      if (val && typeof val === 'object' && k in val) {
        val = val[k];
      } else {
        return undefined;
      }
    }
    return val as T;
  }
}
