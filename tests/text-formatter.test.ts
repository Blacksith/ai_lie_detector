import { describe, expect, it } from 'vitest';
import { formatText } from '../src/formatters/text.js';

describe('text formatter', () => {
  it('matches output snapshot', () => {
    const output = formatText(
      {
        counts: { info: 1, warn: 1, error: 0 },
        topRules: [
          { id: 'ast.unused_import', count: 1 },
          { id: 'ai.generic_naming', count: 1 },
        ],
        issues: [
          {
            id: 'ast.unused_import',
            title: "Unused import 'x'",
            description: 'x not used',
            severity: 'warn',
            file: 'src/a.ts',
            line: 12,
            column: 3,
            suggestion: 'remove',
            snippet: 'import { x } from ...',
            tags: ['ast'],
          },
          {
            id: 'ai.generic_naming',
            title: 'Generic naming cluster',
            description: '...',
            severity: 'info',
            confidence: 0.71,
            file: 'src/b.ts',
            line: 3,
            column: 1,
            tags: ['ai'],
          },
        ],
      },
      42,
    );

    expect(output).toMatchSnapshot();
  });
});
