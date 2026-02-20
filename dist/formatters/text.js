export function formatText(report, scannedFiles) {
    const lines = [];
    lines.push('Summary:');
    lines.push(`  files scanned: ${scannedFiles}`);
    lines.push(`  issues: error=${report.counts.error}, warn=${report.counts.warn}, info=${report.counts.info}`);
    lines.push('  top rules:');
    for (const rule of report.topRules) {
        lines.push(`    - ${rule.id}: ${rule.count}`);
    }
    lines.push('');
    lines.push('Issues:');
    for (const issue of report.issues) {
        const loc = issue.file
            ? `${issue.file}${issue.line ? `:${issue.line}${issue.column ? `:${issue.column}` : ''}` : ''}`
            : 'n/a';
        const conf = typeof issue.confidence === 'number' ? `[conf=${issue.confidence.toFixed(2)}]` : '';
        lines.push(`[${issue.severity.toUpperCase()}][${issue.id}]${conf} ${loc} ${issue.title}`);
        if (issue.suggestion)
            lines.push(`  Suggestion: ${issue.suggestion}`);
        if (issue.snippet)
            lines.push(`  Snippet: ${issue.snippet}`);
    }
    if (report.issues.length === 0) {
        lines.push('No issues found.');
    }
    return lines.join('\n');
}
//# sourceMappingURL=text.js.map