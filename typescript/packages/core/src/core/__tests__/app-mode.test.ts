import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  getAppMode,
  isMcpAppMode,
  isOpenAiMode,
  getWidgetMimeType,
  RESOURCE_MIME_TYPE_MCP_APP,
  RESOURCE_MIME_TYPE_OPENAI,
} from '../app-mode.js';

describe('App Mode Utility', () => {
  const originalNitrostackMode = process.env.NITROSTACK_APP_MODE;
  const originalAppMode = process.env.APP_MODE;

  beforeEach(() => {
    delete process.env.NITROSTACK_APP_MODE;
    delete process.env.APP_MODE;
  });

  afterEach(() => {
    if (originalNitrostackMode !== undefined) {
      process.env.NITROSTACK_APP_MODE = originalNitrostackMode;
    } else {
      delete process.env.NITROSTACK_APP_MODE;
    }

    if (originalAppMode !== undefined) {
      process.env.APP_MODE = originalAppMode;
    } else {
      delete process.env.APP_MODE;
    }
  });

  describe('Default mode', () => {
    it('defaults to openai when environment variables are unset', () => {
      expect(getAppMode()).toBe('openai');
      expect(isMcpAppMode()).toBe(false);
      expect(isOpenAiMode()).toBe(true);
      expect(getWidgetMimeType()).toBe(RESOURCE_MIME_TYPE_OPENAI);
    });

    it('defaults to openai when environment variables are empty or whitespace', () => {
      process.env.NITROSTACK_APP_MODE = '   ';
      expect(getAppMode()).toBe('openai');
      expect(isMcpAppMode()).toBe(false);
      expect(isOpenAiMode()).toBe(true);
    });

    it('defaults to openai for unrecognized values', () => {
      process.env.NITROSTACK_APP_MODE = 'unknown-flavor';
      expect(getAppMode()).toBe('openai');
      expect(isMcpAppMode()).toBe(false);
      expect(isOpenAiMode()).toBe(true);
    });
  });

  describe('OpenAI mode', () => {
    it('detects openai mode via NITROSTACK_APP_MODE', () => {
      process.env.NITROSTACK_APP_MODE = 'openai';
      expect(getAppMode()).toBe('openai');
      expect(isMcpAppMode()).toBe(false);
      expect(isOpenAiMode()).toBe(true);
      expect(getWidgetMimeType()).toBe(RESOURCE_MIME_TYPE_OPENAI);
    });

    it('handles uppercase and lenient openai alias', () => {
      process.env.NITROSTACK_APP_MODE = '  OPENAI  ';
      expect(getAppMode()).toBe('openai');

      process.env.NITROSTACK_APP_MODE = 'chatgpt';
      expect(getAppMode()).toBe('openai');
    });

    it('detects openai mode via APP_MODE fallback', () => {
      process.env.APP_MODE = 'openai';
      expect(getAppMode()).toBe('openai');
      expect(isMcpAppMode()).toBe(false);
      expect(isOpenAiMode()).toBe(true);
    });
  });

  describe('MCP Apps mode', () => {
    it('detects mcp-app mode via various aliases', () => {
      const aliases = ['mcp-app', 'mcpapp', 'mcp_app', 'mcp app', 'MCP-APP'];
      for (const alias of aliases) {
        process.env.NITROSTACK_APP_MODE = alias;
        expect(getAppMode()).toBe('mcp-app');
        expect(isMcpAppMode()).toBe(true);
        expect(isOpenAiMode()).toBe(false);
        expect(getWidgetMimeType()).toBe(RESOURCE_MIME_TYPE_MCP_APP);
      }
    });

    it('detects mcp-app mode via APP_MODE fallback', () => {
      process.env.APP_MODE = 'mcp-app';
      expect(getAppMode()).toBe('mcp-app');
      expect(isMcpAppMode()).toBe(true);
      expect(isOpenAiMode()).toBe(false);
    });
  });

  describe('Universal mode', () => {
    it('detects explicit universal mode via various aliases', () => {
      const aliases = ['universal', 'UNIVERSAL', 'all', 'both'];
      for (const alias of aliases) {
        process.env.NITROSTACK_APP_MODE = alias;
        expect(getAppMode()).toBe('universal');
        expect(isMcpAppMode()).toBe(true);
        expect(isOpenAiMode()).toBe(true);
        expect(getWidgetMimeType()).toBe(RESOURCE_MIME_TYPE_MCP_APP);
      }
    });

    it('detects universal mode via APP_MODE fallback', () => {
      process.env.APP_MODE = 'universal';
      expect(getAppMode()).toBe('universal');
      expect(isMcpAppMode()).toBe(true);
      expect(isOpenAiMode()).toBe(true);
    });
  });

  describe('Precedence', () => {
    it('prioritizes NITROSTACK_APP_MODE over APP_MODE', () => {
      process.env.NITROSTACK_APP_MODE = 'openai';
      process.env.APP_MODE = 'mcp-app';
      expect(getAppMode()).toBe('openai');
    });
  });
});
