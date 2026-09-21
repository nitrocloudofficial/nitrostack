import { describe, expect, it } from 'vitest';
import { TrimPipe } from '../../src/gateway/trim.pipe.js';

describe('TrimPipe', () => {
  it('trims nested strings without changing non-string values', async () => {
    const pipe = new TrimPipe();
    await expect(
      pipe.transform(
        {
          query: '  diabetes  ',
          symptoms: [' chest pain ', ' shortness of breath'],
          nested: { reason: '  follow up  ' },
          count: 2,
        },
        { type: 'body' },
      ),
    ).resolves.toEqual({
      query: 'diabetes',
      symptoms: ['chest pain', 'shortness of breath'],
      nested: { reason: 'follow up' },
      count: 2,
    });
  });
});
