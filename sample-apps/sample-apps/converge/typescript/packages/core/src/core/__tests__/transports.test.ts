import { jest, describe, it, expect } from '@jest/globals';
import { StreamableHttpTransport } from '../transports/streamable-http';
import { IncomingMessage, ServerResponse } from 'http';

describe('Transports', () => {
    describe('StreamableHttpTransport', () => {
        it('should instantiate', () => {
            const app = {} as any;
            const transport = new StreamableHttpTransport(app);
            expect(transport).toBeDefined();
        });
    });
});
