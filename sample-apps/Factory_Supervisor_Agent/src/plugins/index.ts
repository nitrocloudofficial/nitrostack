import { ToolRegistry } from '../server/toolRegistry.js';
import { ILogger } from '../types/logger.js';

export interface IFactoryPlugin {
  name: string;
  version: string;
  register(registry: ToolRegistry, logger: ILogger): Promise<void> | void;
}
