import { describe, expect, it } from 'vitest';
import { extractMetaFromPackument } from '../src/analyzers/packages/index.js';

describe('package metadata parser', () => {
  it('extracts latest, deprecated and modified fields', () => {
    const meta = extractMetaFromPackument({
      'dist-tags': { latest: '1.2.3' },
      time: { modified: '2024-01-10T00:00:00.000Z' },
      versions: {
        '1.2.3': {
          deprecated: 'Use another package',
        },
      },
    });

    expect(meta).toEqual({
      latest: '1.2.3',
      deprecated: 'Use another package',
      modifiedAt: '2024-01-10T00:00:00.000Z',
    });
  });
});
