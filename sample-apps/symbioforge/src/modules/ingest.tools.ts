import { ToolDecorator as Tool, Injectable, ExecutionContext, z } from '@nitrostack/core';
import { WasteClassifier } from '../core/waste-classifier.js';
import { stateManager, eventBus } from './bootstrap.js';

@Injectable()
export class IngestTools {

  @Tool({
    name: 'ingest-telemetry',
    description: 'Ingest live telemetry data from an IoT sensor or external system. Updates a factory waste stream volume in real-time and triggers agent re-evaluation.',
    inputSchema: z.object({
      factoryId: z.string().describe('The factory ID to update'),
      wasteStreamName: z.string().describe('Name of the waste stream being measured'),
      volumeKgPerDay: z.number().describe('Current measured volume in kg/day'),
      timestamp: z.string().optional().describe('ISO timestamp of the measurement')
    })
  })
  public async ingestTelemetry(
    args: { factoryId: string; wasteStreamName: string; volumeKgPerDay: number; timestamp?: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info(`[Ingest] Telemetry received: ${args.factoryId} / ${args.wasteStreamName} = ${args.volumeKgPerDay} kg/day`);

    const factory = stateManager.getFactory(args.factoryId);
    if (!factory) {
      return { success: false, message: `Factory "${args.factoryId}" not found in cluster.` };
    }

    // Find and update the waste stream volume
    const stream = (factory.wasteStreams || []).find(
      w => w.name.toLowerCase() === args.wasteStreamName.toLowerCase()
    );

    if (stream) {
      const oldVolume = stream.volume;
      stream.volume = args.volumeKgPerDay;
      stateManager.addLog('System', `IoT telemetry: ${factory.name} — ${stream.name} volume updated: ${oldVolume} → ${args.volumeKgPerDay} kg/day`, 'info');

      // Recalculate metrics with new volumes
      stateManager.recalculateMetrics();

      // Persist to database if configured
      await stateManager.persistFactory(factory);

      eventBus.publish({
        type: 'VOLUME_UPDATE',
        payload: {
          factoryId: args.factoryId,
          currentVolume: args.volumeKgPerDay
        }
      });

      eventBus.publish({
        type: 'MATCHES_DISCOVERED',
        payload: { matchIds: [] }
      });

      return {
        success: true,
        message: `Telemetry ingested. ${stream.name} volume updated from ${oldVolume} to ${args.volumeKgPerDay} kg/day. Agent re-evaluation triggered.`,
        factory: factory.name,
        stream: stream.name,
        previousVolume: oldVolume,
        newVolume: args.volumeKgPerDay,
        timestamp: args.timestamp || new Date().toISOString()
      };
    }

    // If stream not found, add it as a new declared waste and classify
    const classifier = new WasteClassifier();
    const newStream = classifier.classifyWaste(factory.id, factory.name, args.wasteStreamName);
    newStream.volume = args.volumeKgPerDay;

    if (!factory.wasteStreams) factory.wasteStreams = [];
    factory.wasteStreams.push(newStream);
    factory.declaredWastes.push(args.wasteStreamName);

    stateManager.addLog('System', `IoT telemetry: New waste stream "${args.wasteStreamName}" discovered at ${factory.name} (${args.volumeKgPerDay} kg/day)`, 'warning');
    stateManager.recalculateMetrics();
    await stateManager.persistFactory(factory);

    eventBus.publish({
      type: 'VOLUME_UPDATE',
      payload: {
        factoryId: args.factoryId,
        currentVolume: args.volumeKgPerDay
      }
    });

    eventBus.publish({
      type: 'MATCHES_DISCOVERED',
      payload: { matchIds: [] }
    });

    return {
      success: true,
      message: `New waste stream "${args.wasteStreamName}" added to ${factory.name}, classified, and sent through agent re-evaluation.`,
      factory: factory.name,
      newStream: newStream,
      timestamp: args.timestamp || new Date().toISOString()
    };
  }

  @Tool({
    name: 'ingest-factory-bulk',
    description: 'Bulk import factories from an external data source (data.gov.in, CPCB, CSV export). Accepts an array of factory objects and processes them through the full agent pipeline.',
    inputSchema: z.object({
      factories: z.array(z.object({
        id: z.string().describe('Unique factory ID'),
        name: z.string().describe('Factory name'),
        industryType: z.string().describe('Industry type'),
        address: z.string().describe('Physical address'),
        lat: z.number().describe('Latitude'),
        lng: z.number().describe('Longitude'),
        productionCapacity: z.string().describe('Production capacity'),
        rawMaterials: z.array(z.string()).describe('Raw materials consumed'),
        declaredWastes: z.array(z.string()).describe('Declared waste streams')
      })).describe('Array of factory objects to import')
    })
  })
  public async ingestFactoryBulk(
    args: { factories: any[] },
    ctx: ExecutionContext
  ) {
    ctx.logger.info(`[Ingest] Bulk import: ${args.factories.length} factories`);

    const classifier = new WasteClassifier();
    const results: { id: string; name: string; status: string }[] = [];

    for (const raw of args.factories) {
      try {
        // Classify waste streams
        const wasteStreams = raw.declaredWastes.map((w: string) =>
          classifier.classifyWaste(raw.id, raw.name, w)
        );

        const factory = {
          id: raw.id,
          name: raw.name,
          industryType: raw.industryType,
          location: { lat: raw.lat, lng: raw.lng, address: raw.address },
          productionCapacity: raw.productionCapacity,
          rawMaterials: raw.rawMaterials,
          declaredWastes: raw.declaredWastes,
          wasteStreams,
          complianceStatus: 'filed' as const,
          lastFiledDate: new Date().toISOString().split('T')[0],
          savingsEarned: 0,
          co2Avoided: 0
        };

        stateManager.addFactory(factory);
        await stateManager.persistFactory(factory);
        results.push({ id: raw.id, name: raw.name, status: 'imported' });
      } catch (err: any) {
        results.push({ id: raw.id, name: raw.name, status: `error: ${err.message}` });
      }
    }

    // Re-run the full agent pipeline through the event bus.
    eventBus.publish({
      type: 'MATCHES_DISCOVERED',
      payload: { matchIds: [] }
    });

    const allFactories = stateManager.getFactories();
    const newMatches = stateManager.getMatches();

    const imported = results.filter(r => r.status === 'imported').length;
    const failed = results.filter(r => r.status !== 'imported').length;

    stateManager.addLog('System', `Bulk import complete: ${imported} factories imported, ${failed} failed. Full agent pipeline re-evaluated ${newMatches.length} symbioses across cluster.`, imported > 0 ? 'success' : 'warning');

    return {
      success: true,
      message: `Bulk import complete. ${imported} factories imported, ${newMatches.length} symbiotic matches available after full agent re-evaluation.`,
      results,
      newMatchesCount: newMatches.length,
      clusterSize: allFactories.length
    };
  }
}
