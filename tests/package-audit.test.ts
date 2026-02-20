import { describe, expect, it } from 'vitest';
import { parseNpmAuditReport } from '../src/analyzers/packages/audit.js';

describe('npm audit parser', () => {
  it('parses audit report v2 vulnerabilities', () => {
    const issues = parseNpmAuditReport(
      {
        vulnerabilities: {
          lodash: {
            name: 'lodash',
            severity: 'high',
            via: [{ title: 'Prototype pollution' }],
            isDirect: true,
          },
        },
      },
      {},
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].id).toBe('pkg.vulnerability');
    expect(issues[0].severity).toBe('error');
  });
});
