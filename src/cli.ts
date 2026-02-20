#!/usr/bin/env node
import path from 'node:path';
import { Command } from 'commander';
import { runAICheck } from './core/run.js';
import { formatJson } from './formatters/json.js';
import { formatText } from './formatters/text.js';

const program = new Command();

program
  .name('ai-check')
  .description('Scan repository for code risks, outdated dependencies and AI-like heuristics')
  .argument('[repoPath]', 'Path to repository', '.')
  .option('--format <format>', 'text|json', 'text')
  .option('--json', 'Alias for --format json')
  .option('--severity <severity>', 'warn|error exit-code threshold', 'warn')
  .option('--max-issues <number>', 'Maximum number of reported issues', '200')
  .option('--only <extensions>', 'Only analyze extensions, comma-separated. Example: js,ts')
  .option('--exclude <paths>', 'Extra excludes, comma-separated. Example: node_modules,dist')
  .option('--config <path>', 'Path to config file')
  .option('--no-packages', 'Disable package analysis')
  .option('--no-ai-heuristics', 'Disable AI heuristics analyzer')
  .option('--no-ast', 'Disable AST analyzer')
  .action(async (repoPath: string, flags) => {
    const onlyExt = typeof flags.only === 'string' ? flags.only.split(',').map((x: string) => x.trim()).filter(Boolean) : undefined;
    const extraExclude =
      typeof flags.exclude === 'string'
        ? flags.exclude.split(',').map((x: string) => x.trim()).filter(Boolean)
        : undefined;
    const outputFormat: 'text' | 'json' = flags.json || flags.format === 'json' ? 'json' : 'text';

    const result = await runAICheck({
      repoPath: path.resolve(process.cwd(), repoPath),
      format: outputFormat,
      minExitSeverity: flags.severity === 'error' ? 'error' : 'warn',
      maxIssues: Number(flags.maxIssues),
      onlyExt,
      extraExclude,
      configPath: flags.config,
      disablePackages: !flags.packages,
      disableHeuristics: !flags.aiHeuristics,
      disableAst: !flags.ast,
    });

    const output =
      outputFormat === 'json'
        ? formatJson(result.report, result.scannedFiles)
        : formatText(result.report, result.scannedFiles);

    process.stdout.write(`${output}\n`);
    process.exitCode = result.exitCode;
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`ai-check failed: ${message}\n`);
  process.exit(2);
});
