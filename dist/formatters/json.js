export function formatJson(report, scannedFiles) {
    return JSON.stringify({
        summary: {
            filesScanned: scannedFiles,
            counts: report.counts,
            topRules: report.topRules,
        },
        issues: report.issues,
    }, null, 2);
}
//# sourceMappingURL=json.js.map