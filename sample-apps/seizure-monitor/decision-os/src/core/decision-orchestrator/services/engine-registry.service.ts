import { Injectable } from '@nitrostack/core';
import { IEnginePlugin, EngineMetadata } from '../../../shared/contracts/engine.interface.js';

@Injectable()
export class EngineRegistryService {
  private readonly engines: Map<string, IEnginePlugin> = new Map();

  /**
   * Registers a new engine in the registry.
   */
  public registerEngine(engine: IEnginePlugin): void {
    const metadata = engine.getMetadata();
    if (this.engines.has(metadata.engineId)) {
      throw new Error(`Engine with ID ${metadata.engineId} is already registered.`);
    }
    this.engines.set(metadata.engineId, engine);
  }

  /**
   * Retrieves an engine by its ID.
   */
  public getEngine(engineId: string): IEnginePlugin | undefined {
    return this.engines.get(engineId);
  }

  /**
   * Returns a list of all registered engine metadata.
   */
  public listAvailableEngines(): EngineMetadata[] {
    const metadataList: EngineMetadata[] = [];
    for (const engine of this.engines.values()) {
      metadataList.push(engine.getMetadata());
    }
    return metadataList;
  }
}
