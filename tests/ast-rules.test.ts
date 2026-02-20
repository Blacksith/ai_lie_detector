import { describe, expect, it } from 'vitest';
import { runAstAnalyzer } from '../src/analyzers/ast/index.js';
import { FileEntry } from '../src/core/types.js';

function file(path: string, content: string): FileEntry {
  return { path, absPath: path, content, sizeKb: content.length / 1024 };
}

describe('ast analyzer', () => {
  it('detects unused imports and new Promise(async)', () => {
    const files = [
      file(
        'src/a.ts',
        `
        import { x } from './b';
        function run() {
          return new Promise(async (resolve) => { resolve(1); });
        }
        `,
      ),
      file('src/b.ts', 'export const y = 1;'),
    ];

    const issues = runAstAnalyzer(files, {});
    const ids = new Set(issues.map((i) => i.id));
    expect(ids.has('ast.unused_import')).toBe(true);
    expect(ids.has('ast.suspicious_async')).toBe(true);
  });

  it('detects unknown local import symbol best effort', () => {
    const files = [
      file('src/a.ts', "import { missing } from './b';\nconsole.log(missing);"),
      file('src/b.ts', 'export const real = 1;'),
    ];

    const issues = runAstAnalyzer(files, {});
    expect(issues.some((i) => i.id === 'ast.fake_import_symbol')).toBe(true);
  });
});
