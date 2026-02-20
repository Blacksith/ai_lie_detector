import fs from 'node:fs/promises';
import path from 'node:path';
import { PackageCache } from './types.js';

const EMPTY_CACHE: PackageCache = { packages: {} };

export async function readCache(repoPath: string): Promise<PackageCache> {
  const file = path.resolve(repoPath, '.aicheck-cache.json');
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw) as PackageCache;
  } catch {
    return EMPTY_CACHE;
  }
}

export async function writeCache(repoPath: string, cache: PackageCache): Promise<void> {
  const file = path.resolve(repoPath, '.aicheck-cache.json');
  await fs.writeFile(file, JSON.stringify(cache, null, 2), 'utf8');
}
