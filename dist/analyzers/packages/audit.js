import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync = promisify(execFile);
function toSeverity(input) {
    switch ((input ?? '').toLowerCase()) {
        case 'critical':
        case 'high':
            return 'error';
        case 'moderate':
            return 'warn';
        default:
            return 'info';
    }
}
export function parseNpmAuditReport(report, severityOverrides) {
    const issues = [];
    const baseSeverity = severityOverrides['pkg.vulnerability'];
    const v2 = report;
    if (v2?.vulnerabilities && typeof v2.vulnerabilities === 'object') {
        for (const [pkg, vuln] of Object.entries(v2.vulnerabilities)) {
            const via = (vuln.via ?? [])
                .map((entry) => (typeof entry === 'string' ? entry : entry.title ?? 'unknown advisory'))
                .slice(0, 3)
                .join('; ');
            const severity = baseSeverity ?? toSeverity(vuln.severity);
            issues.push({
                id: 'pkg.vulnerability',
                title: `Vulnerability in ${vuln.name ?? pkg}`,
                description: via ? `npm audit: ${via}` : 'npm audit reported a vulnerability.',
                severity,
                confidence: 0.95,
                suggestion: 'Run npm audit fix or upgrade to a patched version.',
                tags: ['package', 'security', vuln.isDirect ? 'direct' : 'transitive'],
            });
        }
        return issues;
    }
    const v1 = report;
    if (v1?.advisories && typeof v1.advisories === 'object') {
        for (const advisory of Object.values(v1.advisories)) {
            const severity = baseSeverity ?? toSeverity(advisory.severity);
            issues.push({
                id: 'pkg.vulnerability',
                title: `Vulnerability in ${advisory.module_name ?? 'unknown package'}`,
                description: advisory.title ?? 'npm audit advisory detected.',
                severity,
                confidence: 0.95,
                suggestion: 'Run npm audit fix or upgrade to a patched version.',
                tags: ['package', 'security'],
            });
        }
    }
    return issues;
}
export async function runNpmAudit(repoPath, severityOverrides) {
    try {
        const { stdout } = await execFileAsync('npm', ['audit', '--json'], {
            cwd: repoPath,
            maxBuffer: 10 * 1024 * 1024,
        });
        const parsed = JSON.parse(stdout);
        return parseNpmAuditReport(parsed, severityOverrides);
    }
    catch (error) {
        if (error && typeof error === 'object' && 'stdout' in error) {
            const stdout = String(error.stdout ?? '').trim();
            if (stdout) {
                try {
                    const parsed = JSON.parse(stdout);
                    return parseNpmAuditReport(parsed, severityOverrides);
                }
                catch {
                    return [];
                }
            }
        }
        return [];
    }
}
//# sourceMappingURL=audit.js.map