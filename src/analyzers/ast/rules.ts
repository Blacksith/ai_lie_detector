import traverseModule, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { Issue } from '../../core/types.js';
import { extractSnippet } from '../../utils/snippet.js';
import { resolveKnownExport } from './export-index.js';
import { AstRule } from './types.js';

const traverse: (node: t.Node, visitors: Record<string, unknown>) => void =
  ((traverseModule as unknown as { default?: { default?: unknown } }).default?.default as
    | ((node: t.Node, visitors: Record<string, unknown>) => void)
    | undefined)
  ?? ((traverseModule as unknown as { default?: unknown }).default as
    | ((node: t.Node, visitors: Record<string, unknown>) => void)
    | undefined)
  ?? (traverseModule as unknown as (node: t.Node, visitors: Record<string, unknown>) => void);

function makeIssue(params: {
  ruleId: string;
  title: string;
  description: string;
  file: string;
  content: string;
  line?: number;
  column?: number;
  severity: 'info' | 'warn' | 'error';
  suggestion?: string;
  tags: string[];
  confidence?: number;
}): Issue {
  return {
    id: params.ruleId,
    title: params.title,
    description: params.description,
    severity: params.severity,
    confidence: params.confidence,
    file: params.file,
    line: params.line,
    column: params.column,
    snippet: extractSnippet(params.content, params.line),
    suggestion: params.suggestion,
    tags: params.tags,
  };
}

function nameAppearsOutsideImport(content: string, name: string, importLine?: number): boolean {
  const lines = content.split(/\r?\n/);
  const safeName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`\\b${safeName}\\b`);
  for (let i = 0; i < lines.length; i += 1) {
    if (importLine && i + 1 === importLine) continue;
    if (re.test(lines[i])) return true;
  }
  return false;
}

export const unusedImportsRule: AstRule = {
  id: 'ast.unused_import',
  title: 'Unused import',
  defaultSeverity: 'warn',
  run(ast, ctx) {
    const issues: Issue[] = [];
    traverse(ast as t.Node, {
      ImportSpecifier(path: NodePath<t.ImportSpecifier>) {
        const local = path.node.local.name;
        const parentImportKind = path.parentPath.isImportDeclaration() ? path.parentPath.node.importKind : null;
        if (path.node.importKind === 'type' || parentImportKind === 'type') return;
        const binding = path.scope.getBinding(local);
        if (
          binding
          && !binding.referenced
          && !nameAppearsOutsideImport(ctx.file.content, local, path.node.loc?.start.line)
        ) {
          issues.push(
            makeIssue({
              ruleId: 'ast.unused_import',
              title: `Unused import '${local}'`,
              description: `Imported symbol '${local}' is not used in this file.`,
              severity: ctx.severityForRule('ast.unused_import', 'warn'),
              file: ctx.file.path,
              content: ctx.file.content,
              line: path.node.loc?.start.line,
              column: path.node.loc?.start.column,
              suggestion: 'Remove the import or use the symbol.',
              tags: ['ast', 'cleanup'],
            }),
          );
        }
      },
      ImportDefaultSpecifier(path: NodePath<t.ImportDefaultSpecifier>) {
        const local = path.node.local.name;
        const binding = path.scope.getBinding(local);
        if (
          binding
          && !binding.referenced
          && !nameAppearsOutsideImport(ctx.file.content, local, path.node.loc?.start.line)
        ) {
          issues.push(
            makeIssue({
              ruleId: 'ast.unused_import',
              title: `Unused default import '${local}'`,
              description: `Default import '${local}' is unused.`,
              severity: ctx.severityForRule('ast.unused_import', 'warn'),
              file: ctx.file.path,
              content: ctx.file.content,
              line: path.node.loc?.start.line,
              column: path.node.loc?.start.column,
              suggestion: 'Remove the default import if unnecessary.',
              tags: ['ast', 'cleanup'],
            }),
          );
        }
      },
    });
    return issues;
  },
};

export const unreachableCodeRule: AstRule = {
  id: 'ast.unreachable_code',
  title: 'Unreachable code',
  defaultSeverity: 'warn',
  run(ast, ctx) {
    const issues: Issue[] = [];

    traverse(ast as t.Node, {
      BlockStatement(path: NodePath<t.BlockStatement>) {
        let terminated = false;
        for (const stmt of path.node.body) {
          if (terminated) {
            issues.push(
              makeIssue({
                ruleId: 'ast.unreachable_code',
                title: 'Code is unreachable in this block',
                description: 'Statement appears after a terminating control-flow statement.',
                severity: ctx.severityForRule('ast.unreachable_code', 'warn'),
                file: ctx.file.path,
                content: ctx.file.content,
                line: stmt.loc?.start.line,
                column: stmt.loc?.start.column,
                suggestion: 'Remove dead code or restructure control flow.',
                tags: ['ast', 'control-flow'],
              }),
            );
            break;
          }

          if (
            t.isReturnStatement(stmt)
            || t.isThrowStatement(stmt)
            || t.isBreakStatement(stmt)
            || t.isContinueStatement(stmt)
          ) {
            terminated = true;
          }
        }
      },
    });

    return issues;
  },
};

export const suspiciousAsyncRule: AstRule = {
  id: 'ast.suspicious_async',
  title: 'Suspicious async pattern',
  defaultSeverity: 'warn',
  run(ast, ctx) {
    const issues: Issue[] = [];

    traverse(ast as t.Node, {
      AwaitExpression(path: NodePath<t.AwaitExpression>) {
        const fn = path.getFunctionParent();
        if (fn && !fn.node.async) {
          issues.push(
            makeIssue({
              ruleId: 'ast.suspicious_async',
              title: 'await used inside non-async function',
              description: 'Function containing await is not marked async.',
              severity: ctx.severityForRule('ast.suspicious_async', 'warn'),
              file: ctx.file.path,
              content: ctx.file.content,
              line: path.node.loc?.start.line,
              column: path.node.loc?.start.column,
              suggestion: 'Add async to the function or remove await.',
              tags: ['ast', 'async'],
            }),
          );
        }
      },
      NewExpression(path: NodePath<t.NewExpression>) {
        if (
          t.isIdentifier(path.node.callee, { name: 'Promise' })
          && path.node.arguments.length > 0
          && (t.isFunctionExpression(path.node.arguments[0]) || t.isArrowFunctionExpression(path.node.arguments[0]))
          && (path.node.arguments[0] as t.FunctionExpression | t.ArrowFunctionExpression).async
        ) {
          issues.push(
            makeIssue({
              ruleId: 'ast.suspicious_async',
              title: 'new Promise(async ...) anti-pattern',
              description: 'Using async executor in Promise constructor may hide errors.',
              severity: ctx.severityForRule('ast.suspicious_async', 'warn'),
              file: ctx.file.path,
              content: ctx.file.content,
              line: path.node.loc?.start.line,
              column: path.node.loc?.start.column,
              suggestion: 'Avoid async Promise executors; use async function directly.',
              tags: ['ast', 'async', 'antipattern'],
            }),
          );
        }
      },
    });

    return issues;
  },
};

export const fakeImportSymbolRule: AstRule = {
  id: 'ast.fake_import_symbol',
  title: 'Potentially unknown local import symbol',
  defaultSeverity: 'warn',
  run(ast, ctx) {
    const issues: Issue[] = [];

    traverse(ast as t.Node, {
      ImportDeclaration(path: NodePath<t.ImportDeclaration>) {
        const source = path.node.source.value;
        if (!source.startsWith('./') && !source.startsWith('../')) return;

        const knownExports = resolveKnownExport(ctx.exportsByFile, ctx.file.path, source);
        if (!knownExports) return;

        for (const spec of path.node.specifiers) {
          if (t.isImportSpecifier(spec)) {
            const importedName = t.isIdentifier(spec.imported) ? spec.imported.name : spec.imported.value;
            if (!knownExports.has(importedName)) {
              issues.push(
                makeIssue({
                  ruleId: 'ast.fake_import_symbol',
                  title: `Imported symbol '${importedName}' was not found`,
                  description: `Best-effort export scan did not find '${importedName}' in '${source}'.`,
                  severity: ctx.severityForRule('ast.fake_import_symbol', 'warn'),
                  file: ctx.file.path,
                  content: ctx.file.content,
                  line: spec.loc?.start.line,
                  column: spec.loc?.start.column,
                  suggestion: 'Verify export name or update import source path.',
                  tags: ['ast', 'import', 'best-effort'],
                  confidence: 0.65,
                }),
              );
            }
          }
        }
      },
    });

    return issues;
  },
};

export const consoleInCodeRule: AstRule = {
  id: 'ast.console_left',
  title: 'Console statement left in code',
  defaultSeverity: 'info',
  run(ast, ctx) {
    const issues: Issue[] = [];
    traverse(ast as t.Node, {
      CallExpression(path: NodePath<t.CallExpression>) {
        const callee = path.node.callee;
        if (
          t.isMemberExpression(callee)
          && t.isIdentifier(callee.object, { name: 'console' })
          && t.isIdentifier(callee.property)
          && ['log', 'info', 'warn', 'error', 'debug'].includes(callee.property.name)
        ) {
          issues.push(
            makeIssue({
              ruleId: 'ast.console_left',
              title: `console.${callee.property.name} found`,
              description: 'Console call can leak debugging output in production.',
              severity: ctx.severityForRule('ast.console_left', 'info'),
              file: ctx.file.path,
              content: ctx.file.content,
              line: path.node.loc?.start.line,
              column: path.node.loc?.start.column,
              suggestion: 'Remove or gate debug logs by environment.',
              tags: ['ast', 'logging'],
            }),
          );
        }
      },
    });
    return issues;
  },
};

export const todoDensityRule: AstRule = {
  id: 'ast.todo_density',
  title: 'High TODO/FIXME density',
  defaultSeverity: 'info',
  run(_ast, ctx) {
    const matches =
      ctx.file.content
        .split(/\r?\n/)
        .filter((line) => /^\s*(\/\/|\/\*|\*|\*\/)/.test(line))
        .flatMap((line) => line.match(/\b(TODO|FIXME)\b/g) ?? []).length;
    if (matches <= 5) return [];

    return [
      makeIssue({
        ruleId: 'ast.todo_density',
        title: `File has high TODO/FIXME count (${matches})`,
        description: 'Large TODO/FIXME density can indicate unfinished or placeholder logic.',
        severity: ctx.severityForRule('ast.todo_density', 'info'),
        file: ctx.file.path,
        content: ctx.file.content,
        line: 1,
        column: 1,
        suggestion: 'Resolve stale TODO/FIXME notes or convert them to tracked issues.',
        tags: ['ast', 'quality'],
      }),
    ];
  },
};

export const AST_RULES: AstRule[] = [
  unusedImportsRule,
  unreachableCodeRule,
  suspiciousAsyncRule,
  fakeImportSymbolRule,
  consoleInCodeRule,
  todoDensityRule,
];
