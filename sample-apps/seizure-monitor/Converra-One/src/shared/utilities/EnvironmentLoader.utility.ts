import { env } from '../config/env.config.js';
import { Logger } from './Logger.utility.js';

export class EnvironmentLoader {
  public static validateEnvironment(): boolean {
    Logger.info('Validating environment configuration...');
    const requiredKeys: (keyof typeof env)[] = ['NODE_ENV', 'PORT'];
    for (const key of requiredKeys) {
      if (!env[key]) {
        Logger.warn(`Environment variable key ${String(key)} missing`);
      }
    }
    return true;
  }
}
