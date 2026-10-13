declare module 'ws' {
  import { EventEmitter } from 'node:events';
  export class WebSocket extends EventEmitter {
    static OPEN: number;
    readyState: number;
    send(data: string): void;
  }
  export class WebSocketServer extends EventEmitter {
    constructor(options: { port: number; host?: string });
    clients: Set<WebSocket>;
    close(callback?: (error?: Error) => void): void;
  }
}
