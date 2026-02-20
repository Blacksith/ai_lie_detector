export function severityRank(severity) {
    switch (severity) {
        case 'error':
            return 3;
        case 'warn':
            return 2;
        default:
            return 1;
    }
}
//# sourceMappingURL=severity.js.map