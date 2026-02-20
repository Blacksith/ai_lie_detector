import { Issue } from './types.js';
import { severityRank } from '../utils/severity.js';

export interface Report {
  issues: Issue[];
  counts: {
    info: number;
    warn: number;
    error: number;
  };
  topRules: Array<{ id: string; count: number }>;
}

export function buildReport(issues: Issue[], maxIssues: number): Report {
  const ordered = [...issues]
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
    .slice(0, maxIssues);

  const counts = ordered.reduce(
    (acc, issue) => {
      acc[issue.severity] += 1;
      return acc;
    },
    { info: 0, warn: 0, error: 0 },
  );

  const byRule = new Map<string, number>();
  for (const issue of ordered) {
    byRule.set(issue.id, (byRule.get(issue.id) ?? 0) + 1);
  }

  const topRules = [...byRule.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    issues: ordered,
    counts,
    topRules,
  };
}

export function resolveExitCode(issues: Issue[], minSeverity: 'warn' | 'error'): number {
  const hasError = issues.some((issue) => issue.severity === 'error');
  const hasWarn = issues.some((issue) => issue.severity === 'warn');

  if (minSeverity === 'error') {
    return hasError ? 2 : 0;
  }

  if (hasError) return 2;
  if (hasWarn) return 1;
  return 0;
}
