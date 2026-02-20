import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import ignore from 'ignore';
const SCAN_CONCURRENCY = 32;
async function loadGitignore(repoPath) {
    const ig = ignore();
    try {
        const gitignore = await fs.readFile(path.resolve(repoPath, '.gitignore'), 'utf8');
        ig.add(gitignore);
    }
    catch {
        // noop
    }
    return ig;
}
async function mapWithConcurrency(items, worker, concurrency = SCAN_CONCURRENCY) {
    const results = new Array(items.length);
    let index = 0;
    async function runWorker() {
        while (true) {
            const current = index;
            index += 1;
            if (current >= items.length)
                break;
            results[current] = await worker(items[current]);
        }
    }
    const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker());
    await Promise.all(workers);
    return results;
}
export async function scanFiles(repoPath, config, onlyExt, extraExclude) {
    const ig = await loadGitignore(repoPath);
    const include = config.include;
    const excludes = [...config.exclude, ...(extraExclude ?? []).map((x) => `${x}/**`)];
    const candidates = await fg(include, {
        cwd: repoPath,
        dot: false,
        onlyFiles: true,
        ignore: excludes,
        unique: true,
    });
    const filteredByExt = onlyExt && onlyExt.length > 0
        ? candidates.filter((file) => onlyExt.some((ext) => file.endsWith(`.${ext}`)))
        : candidates;
    const paths = filteredByExt.filter((file) => !ig.ignores(file));
    const readEntries = await mapWithConcurrency(paths, async (relPath) => {
        const absPath = path.resolve(repoPath, relPath);
        const stat = await fs.stat(absPath);
        const sizeKb = stat.size / 1024;
        if (sizeKb > config.maxFileSizeKb)
            return null;
        const content = await fs.readFile(absPath, 'utf8');
        return {
            path: relPath,
            absPath,
            content,
            sizeKb,
        };
    });
    return readEntries.filter((entry) => Boolean(entry));
}
//# sourceMappingURL=scanner.js.map