import { describe, it, expect } from '@jest/globals';
import { defineWidgetMetadata, type WidgetMetadata } from '../metadata.js';

describe('Widget Metadata', () => {
  describe('defineWidgetMetadata', () => {
    it('should define basic widget metadata', () => {
      const metadata: WidgetMetadata = {
        uri: '/test-widget',
        name: 'Test Widget',
        description: 'A test widget',
        examples: [],
      };

      const result = defineWidgetMetadata(metadata);
      expect(result).toBe(metadata);
      expect(result.uri).toBe('/test-widget');
      expect(result.name).toBe('Test Widget');
      expect(result.description).toBe('A test widget');
      expect(result.examples).toEqual([]);
    });

    it('should pass through complex metadata with examples', () => {
      const metadata: WidgetMetadata = {
        uri: '/calc',
        name: 'Calculator',
        description: 'A calculator widget',
        examples: [
          { name: 'Addition', description: 'Add two numbers', data: { a: 1, b: 2 } },
          { name: 'Subtraction', description: 'Subtract numbers', data: { a: 5, b: 3 } },
        ],
        tags: ['utility', 'math'],
      };

      const result = defineWidgetMetadata(metadata);
      expect(result.examples).toHaveLength(2);
      expect(result.examples[0].name).toBe('Addition');
      expect(result.examples[0].data).toEqual({ a: 1, b: 2 });
      expect(result.tags).toContain('utility');
      expect(result.tags).toContain('math');
    });

    it('should handle metadata with optional fields', () => {
      const metadata: WidgetMetadata = {
        uri: '/simple',
        name: 'Simple Widget',
        description: 'Simple description',
        examples: [],
      };

      const result = defineWidgetMetadata(metadata);
      expect(result.tags).toBeUndefined();
    });

    it('should preserve examples with complex data structures', () => {
      const metadata: WidgetMetadata = {
        uri: '/complex',
        name: 'Complex Widget',
        description: 'Widget with complex data',
        examples: [
          {
            name: 'Nested Data',
            description: 'Example with nested objects',
            data: {
              items: [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }],
              config: { enabled: true, threshold: 0.5 },
            },
          },
        ],
      };

      const result = defineWidgetMetadata(metadata);
      expect(result.examples[0].data.items).toHaveLength(2);
      expect(result.examples[0].data.config.enabled).toBe(true);
    });
  });
});


