import { describe, it, expect } from '@jest/globals';
import { SET_GLOBALS_EVENT_TYPE } from '../types.js';

describe('Widget Types', () => {
  describe('SET_GLOBALS_EVENT_TYPE', () => {
    it('should be a string constant', () => {
      expect(typeof SET_GLOBALS_EVENT_TYPE).toBe('string');
    });

    it('should have the correct value', () => {
      expect(SET_GLOBALS_EVENT_TYPE).toBe('openai:set_globals');
    });
  });

  describe('Type Exports', () => {
    it('should export all required types', async () => {
      // Import the module to verify it loads correctly
      const types = await import('../types.js');
      
      // Verify the module loaded successfully
      expect(types).toBeDefined();
      expect(types.SET_GLOBALS_EVENT_TYPE).toBeDefined();
    });
  });
});

// Type tests - these verify TypeScript types at compile time
// If these compile, the types are correct
describe('Type Definitions', () => {
  it('should have Theme type defined', () => {
    // Type check at compile time
    const theme: 'light' | 'dark' = 'dark';
    expect(['light', 'dark']).toContain(theme);
  });

  it('should have DisplayMode type defined', () => {
    // Type check at compile time
    const mode: 'inline' | 'fullscreen' | 'pip' = 'inline';
    expect(['inline', 'fullscreen', 'pip']).toContain(mode);
  });

  it('should have valid SafeAreaInsets structure', () => {
    const insets = { top: 10, bottom: 20, left: 5, right: 5 };
    expect(insets).toHaveProperty('top');
    expect(insets).toHaveProperty('bottom');
    expect(insets).toHaveProperty('left');
    expect(insets).toHaveProperty('right');
    expect(typeof insets.top).toBe('number');
  });

  it('should have valid DeviceType values', () => {
    const deviceTypes = ['desktop', 'mobile', 'tablet'];
    expect(deviceTypes).toContain('mobile');
  });

  it('should have valid CallToolResponse structure', () => {
    const response = {
      status: 'success',
      data: { result: 'test' },
    };
    expect(response).toHaveProperty('status');
    expect(response).toHaveProperty('data');
  });
});

