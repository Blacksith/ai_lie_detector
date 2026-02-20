import fs from 'node:fs/promises';
import path from 'node:path';
const SECTIONS = [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
];
export async function readPackageDeps(repoPath) {
    const pkgPath = path.resolve(repoPath, 'package.json');
    const raw = await fs.readFile(pkgPath, 'utf8');
    const parsed = JSON.parse(raw);
    const deps = [];
    for (const section of SECTIONS) {
        const block = parsed[section] ?? {};
        for (const [name, range] of Object.entries(block)) {
            deps.push({ name, range, section });
        }
    }
    return deps;
}
export function extractNpmLockVersions(lockData) {
    const versions = new Map();
    const v2 = lockData;
    if (v2?.packages && typeof v2.packages === 'object') {
        for (const [pkgPath, pkgData] of Object.entries(v2.packages)) {
            if (!pkgPath.startsWith('node_modules/'))
                continue;
            if (!pkgData?.version)
                continue;
            const name = pkgPath.slice('node_modules/'.length);
            versions.set(name, pkgData.version);
        }
        return versions;
    }
    const v1 = lockData;
    if (v1?.dependencies && typeof v1.dependencies === 'object') {
        for (const [name, meta] of Object.entries(v1.dependencies)) {
            if (meta?.version)
                versions.set(name, meta.version);
        }
    }
    return versions;
}
export async function readNpmLockVersions(repoPath) {
    try {
        const lockPath = path.resolve(repoPath, 'package-lock.json');
        const raw = await fs.readFile(lockPath, 'utf8');
        const lockData = JSON.parse(raw);
        return extractNpmLockVersions(lockData);
    }
    catch {
        return new Map();
    }
}
//# sourceMappingURL=parser.js.map