import { FileEntry, Issue } from '../../core/types.js';
import { extractSnippet } from '../../utils/snippet.js';
import { resolveKnownExport } from '../ast/export-index.js';

const GENERIC_NAMES = new Set(['data', 'result', 'temp', 'obj', 'foo', 'bar', 'value', 'item']);

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function confidenceFromRatio(ratio: number, floor = 0.5): number {
  return clamp01(floor + Math.min(ratio, 1) * 0.5);
}

function dependencyKeyForImport(source: string): string {
  if (source.startsWith('@')) {
    const [scope, name] = source.split('/');
    return scope && name ? `${scope}/${name}` : source;
  }
  return source.split('/')[0] ?? source;
}

function makeIssue(issue: Issue): Issue {
  return issue;
}

export function runHeuristicAnalyzer(params: {
  files: FileEntry[];
  aiThreshold: number;
  deps: Set<string>;
  exportsByFile: Map<string, Set<string>>;
  severityOverrides: Record<string, 'info' | 'warn' | 'error'>;
}): Issue[] {
  const issues: Issue[] = [];

  for (const file of params.files) {
    const lines = file.content.split(/\r?\n/);
    const codeLines = lines.filter((line) => line.trim() && !line.trim().startsWith('//') && !line.trim().startsWith('*')).length;
    const commentLines = lines.filter((line) => /^\s*(\/\/|\/\*|\*|\*\/)/.test(line)).length;

    if (codeLines > 0) {
      const ratio = commentLines / codeLines;
      if (ratio > 0.8) {
        const conf = confidenceFromRatio(Math.min(ratio, 2) / 2, 0.55);
        if (conf >= params.aiThreshold) {
          issues.push(makeIssue({
            id: 'ai.over_commenting',
            title: 'Over-commenting ratio',
            description: `Comment/code ratio is ${ratio.toFixed(2)} in this file.`,
            severity: params.severityOverrides['ai.over_commenting'] ?? 'info',
            confidence: conf,
            file: file.path,
            line: 1,
            column: 1,
            snippet: extractSnippet(file.content, 1),
            suggestion: 'Prefer concise comments for non-obvious logic only.',
            tags: ['ai', 'heuristic'],
          }));
        }
      }
    }

    const nameMatches = [...file.content.matchAll(/\b(const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g)].map((m) => m[2]);
    const genericCount = nameMatches.filter((name) => GENERIC_NAMES.has(name.toLowerCase())).length;
    if (nameMatches.length >= 5 && genericCount >= 4) {
      const conf = confidenceFromRatio(genericCount / nameMatches.length, 0.5);
      if (conf >= params.aiThreshold) {
        issues.push(makeIssue({
          id: 'ai.generic_naming',
          title: 'Generic naming cluster',
          description: `${genericCount}/${nameMatches.length} local variable names are generic.`,
          severity: params.severityOverrides['ai.generic_naming'] ?? 'warn',
          confidence: conf,
          file: file.path,
          line: 1,
          column: 1,
          snippet: extractSnippet(file.content, 1),
          suggestion: 'Rename variables to domain-specific names.',
          tags: ['ai', 'heuristic'],
        }));
      }
    }

    const functionBodies = [...file.content.matchAll(/function\s+[A-Za-z_$][A-Za-z0-9_$]*\s*\([^)]*\)\s*\{([\s\S]*?)\}/g)]
      .map((m) => m[1].replace(/\s+/g, ' ').trim());
    const bodyCount = new Map<string, number>();
    for (const body of functionBodies) {
      if (body.length < 25) continue;
      bodyCount.set(body, (bodyCount.get(body) ?? 0) + 1);
    }
    const repeat = [...bodyCount.values()].find((count) => count >= 3);
    if (repeat) {
      const conf = clamp01(0.4 + repeat * 0.12);
      if (conf >= params.aiThreshold) {
        issues.push(makeIssue({
          id: 'ai.symmetry_smell',
          title: 'Repeated function body symmetry',
          description: `Detected ${repeat} highly similar function bodies.`,
          severity: params.severityOverrides['ai.symmetry_smell'] ?? 'info',
          confidence: conf,
          file: file.path,
          line: 1,
          column: 1,
          snippet: extractSnippet(file.content, 1),
          suggestion: 'Extract shared logic into a reusable function.',
          tags: ['ai', 'heuristic'],
        }));
      }
    }

    const defensiveCount = [...file.content.matchAll(/if\s*\(\s*!\s*[A-Za-z_$][A-Za-z0-9_$]*\s*\)\s*return\s*;?/g)].length;
    if (defensiveCount >= 4) {
      const conf = clamp01(0.45 + defensiveCount * 0.08);
      if (conf >= params.aiThreshold) {
        issues.push(makeIssue({
          id: 'ai.excessive_defensive',
          title: 'Excessive defensive guard clauses',
          description: `${defensiveCount} guard returns like 'if (!x) return;' were found.`,
          severity: params.severityOverrides['ai.excessive_defensive'] ?? 'warn',
          confidence: conf,
          file: file.path,
          line: 1,
          column: 1,
          snippet: extractSnippet(file.content, 1),
          suggestion: 'Group validations and keep business logic explicit.',
          tags: ['ai', 'heuristic'],
        }));
      }
    }

    const verboseErrorCount = [
      ...file.content.matchAll(
        /throw\s+new\s+Error\(((?:"This function[^"]{10,}")|(?:'This function[^']{10,}')|(?:`This function[^`]{10,}`))\)/g,
      ),
    ].length;
    if (verboseErrorCount > 0) {
      const conf = clamp01(0.55 + verboseErrorCount * 0.05);
      if (conf >= params.aiThreshold) {
        issues.push(makeIssue({
          id: 'ai.verbose_errors',
          title: 'Verbose tutorial-like runtime errors',
          description: `${verboseErrorCount} long explanatory runtime error strings detected.`,
          severity: params.severityOverrides['ai.verbose_errors'] ?? 'info',
          confidence: conf,
          file: file.path,
          line: 1,
          column: 1,
          snippet: extractSnippet(file.content, 1),
          suggestion: 'Keep runtime errors concise and actionable.',
          tags: ['ai', 'heuristic'],
        }));
      }
    }

    for (const match of file.content.matchAll(/import\s+[^;]+\s+from\s+['"]([^'"]+)['"]/g)) {
      const source = match[1];
      const depKey = dependencyKeyForImport(source);
      if (!source.startsWith('.') && !params.deps.has(depKey) && !source.startsWith('node:')) {
        const conf = 0.72;
        if (conf >= params.aiThreshold) {
          issues.push(makeIssue({
            id: 'ai.hallucinated_import',
            title: `Import from undeclared package '${source}'`,
            description: `Package '${source}' is imported but not listed in package.json dependencies.`,
            severity: params.severityOverrides['ai.hallucinated_import'] ?? 'warn',
            confidence: conf,
            file: file.path,
            line: 1,
            column: 1,
            snippet: extractSnippet(file.content, 1),
            suggestion: 'Install dependency or remove the import.',
            tags: ['ai', 'heuristic', 'dependency'],
          }));
        }
      }

      if (source.startsWith('./') || source.startsWith('../')) {
        const known = resolveKnownExport(params.exportsByFile, file.path, source);
        if (!known) continue;

        const named = match[0].match(/\{([^}]+)\}/);
        if (!named) continue;
        const imports = named[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0]);
        const misses = imports.filter((i) => i && !known.has(i));
        if (misses.length > 0) {
          const conf = 0.68;
          if (conf >= params.aiThreshold) {
            issues.push(makeIssue({
              id: 'ai.hallucinated_import',
              title: `Possibly invalid local import symbols: ${misses.join(', ')}`,
              description: 'Best-effort export index could not resolve some named imports.',
              severity: params.severityOverrides['ai.hallucinated_import'] ?? 'warn',
              confidence: conf,
              file: file.path,
              line: 1,
              column: 1,
              snippet: extractSnippet(file.content, 1),
              suggestion: 'Verify named exports in target module.',
              tags: ['ai', 'heuristic', 'best-effort'],
            }));
          }
        }
      }
    }
  }

  return issues;
}
