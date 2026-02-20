import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Issue, Severity } from '../../core/types.js';

const execFileAsync = promisify(execFile);

interface AuditVulnerability {
  name?: string;
  severity?: string;
  via?: Array<string | { title?: string }>;
  isDirect?: boolean;
}

interface AuditReportV2 {
  vulnerabilities?: Record<string, AuditVulnerability>;
}

interface AuditAdvisory {
  module_name?: string;
  severity?: string;
  title?: string;
}

interface AuditReportV1 {
  advisories?: Record<string, AuditAdvisory>;
}

function toSeverity(input?: string): Severity {
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

export function parseNpmAuditReport(
  report: unknown,
  severityOverrides: Record<string, Severity>,
): Issue[] {
  const issues: Issue[] = [];
  const baseSeverity = severityOverrides['pkg.vulnerability'];

  const v2 = report as AuditReportV2;
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

  const v1 = report as AuditReportV1;
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

export async function runNpmAudit(
  repoPath: string,
  severityOverrides: Record<string, Severity>,
): Promise<Issue[]> {
  try {
    const { stdout } = await execFileAsync('npm', ['audit', '--json'], {
      cwd: repoPath,
      maxBuffer: 10 * 1024 * 1024,
    });
    const parsed = JSON.parse(stdout) as unknown;
    return parseNpmAuditReport(parsed, severityOverrides);
  } catch (error) {
    if (error && typeof error === 'object' && 'stdout' in error) {
      const stdout = String((error as { stdout?: string }).stdout ?? '').trim();
      if (stdout) {
        try {
          const parsed = JSON.parse(stdout) as unknown;
          return parseNpmAuditReport(parsed, severityOverrides);
        } catch {
          return [];
        }
      }
    }
    return [];
  }
}
