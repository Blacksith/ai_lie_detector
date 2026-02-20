import { describe, expect, it } from 'vitest';
import { extractNpmLockVersions } from '../src/analyzers/packages/parser.js';

describe('package-lock parser', () => {
  it('extracts versions from npm lockfile v2', () => {
    const versions = extractNpmLockVersions({
      packages: {
        '': { version: '1.0.0' },
        'node_modules/react': { version: '18.3.1' },
        'node_modules/@types/node': { version: '22.16.0' },
      },
    });

    expect(versions.get('react')).toBe('18.3.1');
    expect(versions.get('@types/node')).toBe('22.16.0');
  });
});
