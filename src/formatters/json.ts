import { Report } from '../core/report.js';

export function formatJson(report: Report, scannedFiles: number): string {
  return JSON.stringify(
    {
      summary: {
        filesScanned: scannedFiles,
        counts: report.counts,
        topRules: report.topRules,
      },
      issues: report.issues,
    },
    null,
    2,
  );
}
