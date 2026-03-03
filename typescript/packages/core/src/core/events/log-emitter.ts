
import { EventEmitter } from 'events';
import Transport from 'winston-transport';

// Create a new event emitter
export const logEmitter = new EventEmitter();

interface LogInfo {
  level: string;
  message: string;
  [key: string]: unknown;
}

// Define a custom winston transport
export class EventEmitterTransport extends Transport {
  constructor(opts?: Transport.TransportStreamOptions) {
    super(opts);
  }

  log(info: LogInfo, callback: () => void) {
    setImmediate(() => {
      logEmitter.emit('log', info);
      // Also write to stderr for the dev wrapper to capture
      process.stderr.write(`NITRO_LOG::${JSON.stringify(info)}\n`);
    });

    // Perform the callback
    callback();
  }
}
