import { describe, expect, it } from 'vitest';
import { buildReport, resolveExitCode } from '../src/core/report.js';

describe('report', () => {
  it('aggregates counts and top rules', () => {
    const report = buildReport(
      [
        { id: 'a', title: 'A', description: '', severity: 'warn', tags: [] },
        { id: 'b', title: 'B', description: '', severity: 'error', tags: [] },
        { id: 'a', title: 'A2', description: '', severity: 'warn', tags: [] },
      ],
      100,
    );

    expect(report.counts).toEqual({ info: 0, warn: 2, error: 1 });
    expect(report.topRules[0]).toEqual({ id: 'a', count: 2 });
  });

  it('resolves exit code by threshold', () => {
    const issues = [
      { id: 'a', title: 'A', description: '', severity: 'warn', tags: [] },
      { id: 'b', title: 'B', description: '', severity: 'error', tags: [] },
    ] as const;

    expect(resolveExitCode(issues as any, 'warn')).toBe(2);
    expect(resolveExitCode(issues as any, 'error')).toBe(2);
    expect(resolveExitCode([{ id: 'x', title: 'X', description: '', severity: 'warn', tags: [] }], 'error')).toBe(0);
  });
});
