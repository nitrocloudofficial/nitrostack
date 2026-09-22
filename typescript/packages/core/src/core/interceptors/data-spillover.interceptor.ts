import { v4 as uuidv4 } from 'uuid';
import { InterceptorInterface, InterceptorConstructor } from './interceptor.interface.js';
import { ExecutionContext } from '../types.js';
import { DIContainer } from '../di/container.js';
import { DataSpilloverOptions, SpilloverEnvelope } from './spillover/types.js';
import { SpilloverStore } from './spillover/spillover-store.interface.js';
import { MemorySpilloverStore } from './spillover/memory-spillover.store.js';
import { FsSpilloverStore } from './spillover/fs-spillover.store.js';
import { generatePreview } from './spillover/preview-generator.js';

/** Minimal view of NitroStackServer, kept structural to avoid a circular import. */
interface SpilloverStoreHost {
  getSpilloverStore(): SpilloverStore;
}

export class DataSpilloverInterceptor implements InterceptorInterface {
  private readonly maxPayloadBytes: number;
  private readonly spilloverTtlSeconds: number;
  private readonly previewItems: number;
  private readonly previewChars: number;
  private readonly uriPrefix: string;
  private readonly explicitStore?: SpilloverStore;
  private fallbackStore?: SpilloverStore;

  constructor(options: DataSpilloverOptions = {}) {
    this.maxPayloadBytes = options.maxPayloadBytes ?? 10 * 1024; // 10KB
    this.spilloverTtlSeconds = options.spilloverTtlSeconds ?? 3600; // 1 hr
    this.previewItems = options.previewItems ?? 3;
    this.previewChars = options.previewStringChars ?? 500;
    this.uriPrefix = options.resourceUriPrefix ?? 'resource://data-spillover/';

    if (options.storage && typeof options.storage === 'object') {
      this.explicitStore = options.storage;
    } else if (options.storage === 'filesystem') {
      this.explicitStore = new FsSpilloverStore({ storageDir: options.storagePath });
    }
    // Otherwise the store is resolved lazily from the server, so that the URIs this
    // interceptor hands out are readable through the server's spillover resource.
  }

  /**
   * Static factory helper for @UseInterceptors decorator:
   */
  static configure(options: DataSpilloverOptions): InterceptorConstructor {
    return class ConfiguredDataSpilloverInterceptor extends DataSpilloverInterceptor {
      constructor() {
        super(options);
      }
    };
  }

  /**
   * The store this interceptor writes to.
   *
   * Defaults to the server's store rather than a private one: the envelope's
   * `resourceUri` is served by the server's `resource://data-spillover/{id}` handler,
   * so writing anywhere else produces URIs that can never be read back.
   */
  getStore(): SpilloverStore {
    if (this.explicitStore) {
      return this.explicitStore;
    }

    // Read through on every call rather than memoizing, so setSpilloverStore() on the
    // server does not leave this interceptor writing to a disposed store.
    const container = DIContainer.getInstance();
    if (container.has('NitroStackServer')) {
      const server = container.resolve<SpilloverStoreHost>('NitroStackServer');
      if (typeof server?.getSpilloverStore === 'function') {
        return server.getSpilloverStore();
      }
    }

    this.fallbackStore ??= new MemorySpilloverStore();
    return this.fallbackStore;
  }

  async intercept(context: ExecutionContext, next: () => Promise<unknown>): Promise<unknown> {
    const result = await next();
    if (result === undefined || result === null) {
      return result;
    }

    // Measure serialized size
    let serialized: string;
    let mimeType = 'application/json';

    if (typeof result === 'string') {
      serialized = result;
      mimeType = 'text/plain';
    } else if (Buffer.isBuffer(result)) {
      serialized = result.toString('base64');
      mimeType = 'application/octet-stream';
    } else {
      try {
        serialized = JSON.stringify(result);
      } catch {
        // Not serializable; pass through
        return result;
      }
    }

    const sizeBytes = Buffer.byteLength(serialized, 'utf8');

    // If within limit, pass through unmodified
    if (sizeBytes <= this.maxPayloadBytes) {
      return result;
    }

    // Exceeded threshold: spillover to storage
    const spilloverId = `spill-${uuidv4()}`;
    const resourceUri = `${this.uriPrefix}${spilloverId}`;

    await this.getStore().save(spilloverId, serialized, mimeType, this.spilloverTtlSeconds);

    const { preview, summary, totalItems } = generatePreview(
      result,
      sizeBytes,
      this.previewItems,
      this.previewChars
    );

    if (context?.logger?.info) {
      context.logger.info(`Spilled tool output exceeding threshold (${sizeBytes} bytes) to ${resourceUri}`);
    }

    const envelope: SpilloverEnvelope = {
      _spillover: true,
      resourceUri,
      mimeType,
      sizeBytes,
      totalItems,
      summary,
      preview,
      hint: `Full dataset (${summary}) exceeded prompt limit. Read full data via MCP resources/read with URI '${resourceUri}'.`,
    };

    return envelope;
  }
}
