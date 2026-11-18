import { describe, it, expect, jest } from '@jest/globals';
import {
  DeploymentLogStreamer,
  colorizeLogLine,
} from '../log-streamer.js';
import { StudioApiClient, StudioApiError } from '../../api/client.js';

describe('DeploymentLogStreamer & Colorizer', () => {
  describe('colorizeLogLine', () => {
    it('applies ANSI styling to known log prefixes', () => {
      const builderLine = colorizeLogLine('[builder] Compiling TypeScript...');
      expect(builderLine).toContain('[builder]');

      const dockerLine = colorizeLogLine('[docker] Step 3/8 : COPY . .');
      expect(dockerLine).toContain('[docker]');

      const runtimeLine = colorizeLogLine('[runtime] Server listening on :3000');
      expect(runtimeLine).toContain('[runtime]');

      const errorLine = colorizeLogLine('Build FAILED with ERROR: compilation failed');
      expect(errorLine).toContain('FAILED');
      expect(errorLine).toContain('ERROR');
    });

    it('handles empty or null lines safely', () => {
      expect(colorizeLogLine('')).toBe('');
    });
  });

  describe('DeploymentLogStreamer', () => {
    it('fetches incremental pre-sliced chunks with nextOffset tracking and eof', async () => {
      let callOffset = 0;
      const mockClient = {
        request: jest.fn<any>().mockImplementation(async (endpoint: string) => {
          if (endpoint.includes('offset=0')) {
            return {
              lines: ['Line 1: npm install', 'Line 2: building'],
              nextOffset: 2,
              eof: false,
            };
          }
          if (endpoint.includes('offset=2')) {
            return {
              lines: ['Line 3: done'],
              nextOffset: 3,
              eof: true,
            };
          }
          return { lines: [], nextOffset: 3, eof: true };
        }),
      } as unknown as StudioApiClient;

      const streamer = new DeploymentLogStreamer({
        client: mockClient,
        deploymentId: 'dpl_stream_test',
        type: 'build',
      });

      const chunk1 = await streamer.fetchNextChunk();
      expect(chunk1).toEqual(['Line 1: npm install', 'Line 2: building']);
      expect(streamer.offset).toBe(2);
      expect(streamer.eof).toBe(false);

      const chunk2 = await streamer.fetchNextChunk();
      expect(chunk2).toEqual(['Line 3: done']);
      expect(streamer.offset).toBe(3);
      expect(streamer.eof).toBe(true);

      const chunk3 = await streamer.fetchNextChunk();
      expect(chunk3).toEqual([]);
    });

    it('handles unstructured multiline text log buffers (CloudWatch style)', async () => {
      let callCount = 0;
      const mockClient = {
        request: jest.fn<any>().mockImplementation(async () => {
          callCount++;
          if (callCount === 1) {
            return {
              logs: 'Log Alpha\nLog Beta',
            };
          }
          return {
            logs: 'Log Alpha\nLog Beta\nLog Gamma\nLog Delta',
          };
        }),
      } as unknown as StudioApiClient;

      const streamer = new DeploymentLogStreamer(mockClient, 'dpl_raw_text');

      const chunk1 = await streamer.fetchNextChunk();
      expect(chunk1).toEqual(['Log Alpha', 'Log Beta']);
      expect(streamer.offset).toBe(2);

      const chunk2 = await streamer.fetchNextChunk();
      expect(chunk2).toEqual(['Log Gamma', 'Log Delta']);
      expect(streamer.offset).toBe(4);
    });

    it('suppresses transient placeholder log messages until real logs arrive', async () => {
      let callCount = 0;
      const mockClient = {
        request: jest.fn<any>().mockImplementation(async () => {
          callCount++;
          if (callCount === 1) {
            return {
              buildLog: 'No logs available',
            };
          }
          if (callCount === 2) {
            return {
              buildLog: "We're still fetching logs. This can take a moment — check back shortly.",
            };
          }
          return {
            buildLog: 'Step 1/5 : FROM node:20-alpine\nStep 2/5 : WORKDIR /app',
          };
        }),
      } as unknown as StudioApiClient;

      const streamer = new DeploymentLogStreamer(mockClient, 'dpl_placeholder_test');

      const chunk1 = await streamer.fetchNextChunk();
      expect(chunk1).toEqual([]);
      expect(streamer.offset).toBe(0);

      const chunk2 = await streamer.fetchNextChunk();
      expect(chunk2).toEqual([]);
      expect(streamer.offset).toBe(0);

      const chunk3 = await streamer.fetchNextChunk();
      expect(chunk3).toEqual(['Step 1/5 : FROM node:20-alpine', 'Step 2/5 : WORKDIR /app']);
      expect(streamer.offset).toBe(2);
    });

    it('streams runtime logs from deployment endpoint when requested', async () => {
      const mockClient = {
        request: jest.fn<any>().mockResolvedValue({
          deploymentLog: 'Starting container\nListening on port 8080',
        }),
      } as unknown as StudioApiClient;

      const streamer = new DeploymentLogStreamer({
        client: mockClient,
        deploymentId: 'dpl_runtime',
        type: 'runtime',
      });

      const chunk = await streamer.fetchNextChunk();
      expect(chunk).toEqual(['Starting container', 'Listening on port 8080']);
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.stringContaining('/deployments/dpl_runtime/logs/deployment'),
      );
    });

    it('returns log tail for failure inspection', async () => {
      const mockClient = {
        request: jest.fn<any>().mockResolvedValue({
          lines: ['Line 1', 'Line 2', 'Line 3', 'Line 4', 'Line 5'],
          nextOffset: 5,
        }),
      } as unknown as StudioApiClient;

      const streamer = new DeploymentLogStreamer({
        client: mockClient,
        deploymentId: 'dpl_tail',
      });

      const tail = await streamer.fetchTail(3);
      expect(tail).toEqual(['Line 3', 'Line 4', 'Line 5']);
    });

    it('handles fallback to studio route on 404', async () => {
      const mockClient = {
        request: jest.fn<any>().mockImplementation(async (endpoint: string) => {
          if (endpoint.startsWith('/deployments/')) {
            throw new StudioApiError('Route not found', 404);
          }
          return {
            lines: ['Studio fallback line'],
            nextOffset: 1,
            eof: true,
          };
        }),
      } as unknown as StudioApiClient;

      const streamer = new DeploymentLogStreamer({
        client: mockClient,
        deploymentId: 'dpl_fallback',
      });

      const chunk = await streamer.fetchNextChunk();
      expect(chunk).toEqual(['Studio fallback line']);
    });
  });
});
