import { describe, expect, it } from 'vitest';
import { runHeuristicAnalyzer } from '../src/analyzers/heuristics/index.js';
import { FileEntry } from '../src/core/types.js';

function file(path: string, content: string): FileEntry {
  return { path, absPath: path, content, sizeKb: content.length / 1024 };
}

describe('heuristics', () => {
  it('produces confidence-scored heuristic issue', () => {
    const files = [
      file(
        'src/h.ts',
        `
        // a
        // b
        // c
        const data = 1;
        const result = 2;
        const temp = 3;
        const obj = 4;
        const foo = 5;
        `,
      ),
    ];

    const issues = runHeuristicAnalyzer({
      files,
      aiThreshold: 0.5,
      deps: new Set(),
      exportsByFile: new Map(),
      severityOverrides: {},
    });

    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some((i) => typeof i.confidence === 'number')).toBe(true);
  });
});
