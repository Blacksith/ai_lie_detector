import { Severity } from '../core/types.js';

export function severityRank(severity: Severity): number {
  switch (severity) {
    case 'error':
      return 3;
    case 'warn':
      return 2;
    default:
      return 1;
  }
}
