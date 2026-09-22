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
  setSpilloverStore(store: SpilloverStore): unknown;
  hasSessionVisibility?(): boolean;
}

class PayloadTooLargeError extends Error {
  constructor(sizeBytes: number, maxBytes: number) {
    super(
      `Spillover payload of ${sizeBytes} bytes exceeds the store limit of ${maxBytes} bytes. ` +
        `Raise the store maxSizeBytes or use a larger spillover driver.`
    );
    this.name = 'PayloadTooLargeError';
  }
}

/** JSON.stringify that aborts once the output would exceed maxBytes. */
function stringifyCapped(value: unknown, maxBytes: number): string {
  let accounted = 0;
  const json = JSON.stringify(value, (_key, val) => {
    if (typeof val === 'string') accounted += val.length;
    else if (typeof val === 'number' || typeof val === 'boolean' || val === null) accounted += 16;
    if (accounted > maxBytes) {
      throw new PayloadTooLargeError(accounted, maxBytes);
    }
    return val;
  });
  if (json == null) return 'null';
  const size = Buffer.byteLength(json, 'utf8');
  if (size > maxBytes) throw new PayloadTooLargeError(size, maxBytes);
  return json;
}

export class DataSpilloverInterceptor implements InterceptorInterface {
  private readonly maxPayloadBytes: number;
  private readonly spilloverTtlSeconds: number;
  private readonly previewItems: number;
  private readonly previewChars: number;
  private readonly uriPrefix: string;
  private readonly explicitStore?: SpilloverStore;
  private readonly filesystemRequested: boolean;
  private fallbackStore?: SpilloverStore;

  constructor(options: DataSpilloverOptions = {}) {
    this.maxPayloadBytes = options.maxPayloadBytes ?? 10 * 1024; // 10KB
    this.spilloverTtlSeconds = options.spilloverTtlSeconds ?? 3600; // 1 hr
    this.previewItems = options.previewItems ?? 3;
    this.previewChars = options.previewStringChars ?? 500;
    this.uriPrefix = options.resourceUriPrefix ?? 'resource://data-spillover/';
    this.filesystemRequested = options.storage === 'filesystem';

    if (options.storage && typeof options.storage === 'object') {
      this.explicitStore = options.storage;
    }
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
  private serverHost(): SpilloverStoreHost | undefined {
    const container = DIContainer.getInstance();
    if (!container.has('NitroStackServer')) return undefined;
    const server = container.resolve<SpilloverStoreHost>('NitroStackServer');
    if (typeof server?.getSpilloverStore !== 'function') return undefined;
    return server;
  }

  getStore(): SpilloverStore {
    const host = this.serverHost();

    if (this.explicitStore) {
      if (host && host.getSpilloverStore() !== this.explicitStore) {
        throw new Error(
          'DataSpilloverInterceptor storage instance is not the server spillover store. ' +
            'Omit storage to use the server store, or point the server at this instance with setSpilloverStore().'
        );
      }
      return this.explicitStore;
    }

    if (this.filesystemRequested) {
      const current = host?.getSpilloverStore();
      if (current instanceof FsSpilloverStore) return current;
      throw new Error(
        'DataSpilloverInterceptor requested filesystem storage, but the server spillover store is not a filesystem store. ' +
          'Set the server spillover driver to filesystem.'
      );
    }

    // Read through on every call rather than memoizing, so setSpilloverStore() on the
    // server does not leave this interceptor writing to a disposed store.
    if (host) return host.getSpilloverStore();

    this.fallbackStore ??= new MemorySpilloverStore();
    return this.fallbackStore;
  }

  async intercept(context: ExecutionContext, next: () => Promise<unknown>): Promise<unknown> {
    const result = await next();
    if (result === undefined || result === null) {
      return result;
    }

    const store = this.getStore();
    const quota = store.getMaxSizeBytes?.() ?? 100 * 1024 * 1024;

    // Measure serialized size
    let serialized: string;
    let mimeType = 'application/json';

    if (typeof result === 'string') {
      serialized = result;
      mimeType = 'text/plain';
    } else if (Buffer.isBuffer(result)) {
      if (result.length > quota) throw new PayloadTooLargeError(result.length, quota);
      serialized = result.toString('base64');
      mimeType = 'application/octet-stream';
    } else {
      try {
        serialized = stringifyCapped(result, quota);
      } catch (err) {
        if (err instanceof PayloadTooLargeError) throw err;
        // Not serializable; pass through
        return result;
      }
    }

    const sizeBytes = Buffer.byteLength(serialized, 'utf8');

    // If within limit, pass through unmodified
    if (sizeBytes <= this.maxPayloadBytes) {
      return result;
    }

    if (sizeBytes > quota) {
      throw new PayloadTooLargeError(sizeBytes, quota);
    }

    // Exceeded threshold: spillover to storage.
    // With visibility installed, a row without a session would be readable by
    // anyone who learned the URI, so refuse the write instead.
    if (!context?.sessionId && this.serverHost()?.hasSessionVisibility?.()) {
      throw new Error(
        'Spillover requires a session when visibility is enabled. ' +
          'Call this tool with a server-issued session id.'
      );
    }

    const spilloverId = `spill-${uuidv4()}`;
    const resourceUri = `${this.uriPrefix}${spilloverId}`;

    await store.save(
      spilloverId,
      serialized,
      mimeType,
      this.spilloverTtlSeconds,
      context?.sessionId,
    );

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

    // A nested value (for example `{ rows: [...] }`) can still exceed the limit
    // after preview slicing. Drop that preview rather than re-inline the payload.
    const previewBytes = Buffer.byteLength(JSON.stringify(envelope.preview) ?? '', 'utf8');
    if (previewBytes > this.maxPayloadBytes) {
      envelope.preview = '[preview omitted]';
    }

    return envelope;
  }
}
