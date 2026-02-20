import { loadConfig } from '../config/defaults.js';
import { runAstAnalyzer } from '../analyzers/ast/index.js';
import { buildExportIndex } from '../analyzers/ast/export-index.js';
import { runHeuristicAnalyzer } from '../analyzers/heuristics/index.js';
import { runPackageAnalyzer } from '../analyzers/packages/index.js';
import { readPackageDeps } from '../analyzers/packages/parser.js';
import { runPlugins } from './plugins.js';
import { buildReport, resolveExitCode } from './report.js';
import { scanFiles } from './scanner.js';
async function readDepsSet(repoPath) {
    try {
        const deps = await readPackageDeps(repoPath);
        return new Set(deps.map((dep) => dep.name));
    }
    catch {
        return new Set();
    }
}
export async function runAICheck(options) {
    const config = await loadConfig(options.repoPath, options);
    const files = await scanFiles(options.repoPath, config, options.onlyExt, options.extraExclude);
    const severityOverrides = config.severityOverrides;
    const plugins = [
        {
            id: 'ast-js-ts',
            enabled: (cfg) => cfg.ast.enabled,
            run: async (ctx) => runAstAnalyzer(ctx.files, ctx.severityOverrides),
        },
        {
            id: 'packages-npm',
            enabled: (cfg) => cfg.packages.enabled,
            run: async (ctx) => runPackageAnalyzer({
                repoPath: ctx.repoPath,
                staleMonths: ctx.config.packages.staleMonths,
                cacheTtlHours: ctx.config.packages.cacheTtlHours,
                auditEnabled: ctx.config.packages.auditEnabled,
                severityOverrides: ctx.severityOverrides,
            }),
        },
        {
            id: 'heuristics-ai-js-ts',
            enabled: (cfg) => cfg.aiHeuristics.enabled,
            run: async (ctx) => {
                const deps = await readDepsSet(ctx.repoPath);
                const exportsByFile = buildExportIndex(ctx.files);
                return runHeuristicAnalyzer({
                    files: ctx.files,
                    aiThreshold: ctx.config.aiHeuristics.threshold,
                    deps,
                    exportsByFile,
                    severityOverrides: ctx.severityOverrides,
                });
            },
        },
    ];
    const issues = await runPlugins(plugins, {
        repoPath: options.repoPath,
        files,
        config,
        severityOverrides,
    });
    const report = buildReport(issues, config.maxIssues);
    const exitCode = resolveExitCode(report.issues, options.minExitSeverity);
    return {
        report,
        scannedFiles: files.length,
        exitCode,
    };
}
//# sourceMappingURL=run.js.map