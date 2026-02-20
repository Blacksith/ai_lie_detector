import { severityRank } from '../utils/severity.js';
export function buildReport(issues, maxIssues) {
    const ordered = [...issues]
        .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
        .slice(0, maxIssues);
    const counts = ordered.reduce((acc, issue) => {
        acc[issue.severity] += 1;
        return acc;
    }, { info: 0, warn: 0, error: 0 });
    const byRule = new Map();
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
export function resolveExitCode(issues, minSeverity) {
    const hasError = issues.some((issue) => issue.severity === 'error');
    const hasWarn = issues.some((issue) => issue.severity === 'warn');
    if (minSeverity === 'error') {
        return hasError ? 2 : 0;
    }
    if (hasError)
        return 2;
    if (hasWarn)
        return 1;
    return 0;
}
//# sourceMappingURL=report.js.map