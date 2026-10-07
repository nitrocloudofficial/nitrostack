import { describe, it, expect, afterEach, jest } from '@jest/globals';
import { ACCEPT_DEBUG_ENV_VAR, acceptsEventStream, logAcceptDebug, type AcceptDebugEntry } from '../accept.js';

const entry = (overrides: Partial<AcceptDebugEntry>): AcceptDebugEntry => ({
  engine: 'legacy',
  httpMethod: 'POST',
  accept: 'application/json',
  contentType: 'application/json',
  protocolVersion: undefined,
  rpcMethod: 'initialize',
  status: 200,
  servedAsJson: true,
  ...overrides,
});

describe('accept', () => {
  afterEach(() => {
    delete process.env[ACCEPT_DEBUG_ENV_VAR];
    jest.restoreAllMocks();
  });

  it('detects text/event-stream in an Accept list', () => {
    expect(acceptsEventStream('application/json, text/event-stream')).toBe(true);
    expect(acceptsEventStream('Text/Event-Stream')).toBe(true);
    expect(acceptsEventStream('application/json')).toBe(false);
    expect(acceptsEventStream('*/*')).toBe(false);
    expect(acceptsEventStream(undefined)).toBe(false);
    expect(acceptsEventStream(null)).toBe(false);
  });

  it('logs nothing unless the env flag is set', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    logAcceptDebug(entry({ status: 406 }));
    expect(spy).not.toHaveBeenCalled();
  });

  it('logs requests without text/event-stream and every 406 when enabled', () => {
    process.env[ACCEPT_DEBUG_ENV_VAR] = '1';
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    logAcceptDebug(entry({ accept: 'application/json, text/event-stream', servedAsJson: false }));
    expect(spy).not.toHaveBeenCalled();

    logAcceptDebug(entry({ accept: '*/*' }));
    logAcceptDebug(entry({ accept: 'application/json, text/event-stream', status: 406, servedAsJson: false }));
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[0][0]).toContain(`[${ACCEPT_DEBUG_ENV_VAR}]`);
    expect(spy.mock.calls[0][0]).toContain('"accept":"*/*"');
  });
});
