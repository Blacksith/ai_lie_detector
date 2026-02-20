import fs from 'node:fs/promises';
import path from 'node:path';
const EMPTY_CACHE = { packages: {} };
export async function readCache(repoPath) {
    const file = path.resolve(repoPath, '.aicheck-cache.json');
    try {
        const raw = await fs.readFile(file, 'utf8');
        return JSON.parse(raw);
    }
    catch {
        return EMPTY_CACHE;
    }
}
export async function writeCache(repoPath, cache) {
    const file = path.resolve(repoPath, '.aicheck-cache.json');
    await fs.writeFile(file, JSON.stringify(cache, null, 2), 'utf8');
}
//# sourceMappingURL=cache.js.map