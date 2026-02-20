import path from 'node:path';
import { FileEntry } from '../../core/types.js';

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

function parseExports(content: string): Set<string> {
  const names = new Set<string>();

  const named = content.matchAll(/export\s+(?:const|let|var|function|class|type|interface|enum)\s+([A-Za-z0-9_$]+)/g);
  for (const match of named) names.add(match[1]);

  const exportList = content.matchAll(/export\s*\{([^}]+)\}/g);
  for (const match of exportList) {
    const raw = match[1].split(',').map((item) => item.trim());
    for (const entry of raw) {
      const aliased = entry.split(/\s+as\s+/i).map((x) => x.trim());
      names.add(aliased[1] || aliased[0]);
    }
  }

  if (/export\s+default\s+/m.test(content)) {
    names.add('default');
  }

  return names;
}

export function buildExportIndex(files: FileEntry[]): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>();
  for (const file of files) {
    index.set(file.path, parseExports(file.content));
  }
  return index;
}

export function resolveLocalImportPath(fromFile: string, importSource: string): string | null {
  const base = path.posix.dirname(fromFile);
  const resolved = path.posix.normalize(path.posix.join(base, importSource));

  const candidates = [
    resolved,
    ...EXTENSIONS.map((ext) => `${resolved}${ext}`),
    ...EXTENSIONS.map((ext) => path.posix.join(resolved, `index${ext}`)),
  ];

  return candidates[0] ?? null;
}

export function resolveKnownExport(
  exportsByFile: Map<string, Set<string>>,
  fromFile: string,
  importSource: string,
): Set<string> | null {
  const base = path.posix.dirname(fromFile);
  const resolved = path.posix.normalize(path.posix.join(base, importSource));
  const candidates = [
    resolved,
    ...EXTENSIONS.map((ext) => `${resolved}${ext}`),
    ...EXTENSIONS.map((ext) => path.posix.join(resolved, `index${ext}`)),
  ];

  for (const candidate of candidates) {
    const exp = exportsByFile.get(candidate);
    if (exp) return exp;
  }

  return null;
}
