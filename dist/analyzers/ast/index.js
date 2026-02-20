import { parse } from '@babel/parser';
import { extractSnippet } from '../../utils/snippet.js';
import { buildExportIndex } from './export-index.js';
import { AST_RULES } from './rules.js';
export function runAstAnalyzer(files, severityOverrides) {
    const issues = [];
    const exportsByFile = buildExportIndex(files);
    for (const file of files) {
        let ast;
        try {
            ast = parse(file.content, {
                sourceType: 'unambiguous',
                allowAwaitOutsideFunction: true,
                errorRecovery: false,
                plugins: ['typescript', 'jsx'],
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown parser error';
            issues.push({
                id: 'ast.parse_error',
                title: 'Parse error',
                description: message,
                severity: severityOverrides['ast.parse_error'] ?? 'warn',
                file: file.path,
                line: 1,
                column: 1,
                snippet: extractSnippet(file.content, 1),
                suggestion: 'Fix syntax issues to enable AST checks.',
                tags: ['ast', 'parser'],
            });
            continue;
        }
        for (const rule of AST_RULES) {
            const ruleIssues = rule.run(ast, {
                file,
                exportsByFile,
                severityForRule: (ruleId, defaultSeverity) => severityOverrides[ruleId] ?? defaultSeverity,
            });
            issues.push(...ruleIssues);
        }
    }
    return issues;
}
//# sourceMappingURL=index.js.map