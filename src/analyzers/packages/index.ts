import { request } from 'undici';
import semver from 'semver';
import { Issue } from '../../core/types.js';
import { runNpmAudit } from './audit.js';
import { readCache, writeCache } from './cache.js';
import { readNpmLockVersions, readPackageDeps } from './parser.js';
import { PackageMeta } from './types.js';

function monthsAgo(date: Date): number {
  const now = new Date();
  const months = (now.getUTCFullYear() - date.getUTCFullYear()) * 12 + now.getUTCMonth() - date.getUTCMonth();
  return months;
}

export function extractMetaFromPackument(data: {
  'dist-tags'?: { latest?: string };
  deprecated?: string;
  time?: Record<string, string>;
  versions?: Record<string, { deprecated?: string }>;
}): PackageMeta | null {
  const latest = data['dist-tags']?.latest;
  if (!latest) return null;

  return {
    latest,
    deprecated: data.versions?.[latest]?.deprecated ?? data.deprecated,
    modifiedAt: data.time?.modified,
  };
}

async function fetchMeta(name: string): Promise<PackageMeta | null> {
  try {
    const encoded = encodeURIComponent(name);
    const { body, statusCode } = await request(`https://registry.npmjs.org/${encoded}`);
    if (statusCode !== 200) return null;
    const data = (await body.json()) as {
      'dist-tags'?: { latest?: string };
      deprecated?: string;
      time?: Record<string, string>;
      versions?: Record<string, { deprecated?: string }>;
    };
    return extractMetaFromPackument(data);
  } catch {
    return null;
  }
}

export async function runPackageAnalyzer(params: {
  repoPath: string;
  staleMonths: number;
  cacheTtlHours: number;
  auditEnabled: boolean;
  severityOverrides: Record<string, 'info' | 'warn' | 'error'>;
}): Promise<Issue[]> {
  const issues: Issue[] = [];
  let deps;

  try {
    deps = await readPackageDeps(params.repoPath);
  } catch {
    return issues;
  }

  const cache = await readCache(params.repoPath);
  const lockVersions = await readNpmLockVersions(params.repoPath);
  const now = Date.now();

  for (const dep of deps) {
    const cached = cache.packages[dep.name];
    const freshEnough = cached && now - cached.fetchedAt < params.cacheTtlHours * 60 * 60 * 1000;
    const meta = freshEnough ? cached.meta : await fetchMeta(dep.name);

    if (!meta) continue;

    cache.packages[dep.name] = {
      fetchedAt: now,
      meta,
    };

    const lockedVersion = lockVersions.get(dep.name);
    const currentVersion = lockedVersion && semver.valid(lockedVersion)
      ? lockedVersion
      : semver.minVersion(dep.range)?.version;
    if (currentVersion && semver.valid(meta.latest) && semver.lt(currentVersion, meta.latest)) {
      issues.push({
        id: 'pkg.outdated',
        title: `Package ${dep.name} is outdated`,
        description: `Current ${currentVersion} (${lockedVersion ? 'lockfile' : `range ${dep.range}`}), latest is ${meta.latest}.`,
        severity: params.severityOverrides['pkg.outdated'] ?? 'warn',
        suggestion: `Upgrade ${dep.name} toward ${meta.latest}.`,
        tags: ['package', 'outdated', dep.section],
      });
    }

    if (meta.deprecated) {
      issues.push({
        id: 'pkg.deprecated',
        title: `Package ${dep.name} is deprecated`,
        description: meta.deprecated,
        severity: params.severityOverrides['pkg.deprecated'] ?? 'warn',
        suggestion: 'Replace or remove deprecated dependency.',
        tags: ['package', 'deprecated', dep.section],
      });
    }

    if (meta.modifiedAt) {
      const modifiedAt = new Date(meta.modifiedAt);
      if (!Number.isNaN(modifiedAt.getTime())) {
        const months = monthsAgo(modifiedAt);
        if (months >= params.staleMonths) {
          issues.push({
            id: 'pkg.abandoned',
            title: `Package ${dep.name} may be stale`,
            description: `Last npm metadata update was about ${months} months ago.`,
            severity: params.severityOverrides['pkg.abandoned'] ?? 'warn',
            confidence: 0.4,
            suggestion: 'Review maintenance status before relying on this package.',
            tags: ['package', 'stale', dep.section],
          });
        }
      }
    }
  }

  if (params.auditEnabled) {
    issues.push(...(await runNpmAudit(params.repoPath, params.severityOverrides)));
  }

  await writeCache(params.repoPath, cache);
  return issues;
}
