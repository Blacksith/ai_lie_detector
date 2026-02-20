import fs from 'node:fs/promises';
import path from 'node:path';
import { AppConfig, RunOptions, Severity } from '../core/types.js';

export const DEFAULT_CONFIG: AppConfig = {
  include: ['**/*.{js,jsx,ts,tsx,mjs,cjs}'],
  exclude: ['node_modules/**', 'dist/**', 'build/**', '.git/**'],
  severityOverrides: {},
  aiHeuristics: {
    enabled: true,
    threshold: 0.65,
  },
  packages: {
    enabled: true,
    staleMonths: 24,
    cacheTtlHours: 24,
    auditEnabled: true,
  },
  ast: {
    enabled: true,
  },
  maxFileSizeKb: 300,
  maxIssues: 200,
};

function isSeverity(value: unknown): value is Severity {
  return value === 'info' || value === 'warn' || value === 'error';
}

export async function loadConfig(repoPath: string, cliOptions: RunOptions): Promise<AppConfig> {
  const configPath = cliOptions.configPath
    ? path.resolve(repoPath, cliOptions.configPath)
    : path.resolve(repoPath, 'aicheck.config.json');

  let fileConfig: Partial<AppConfig> = {};
  try {
    const raw = await fs.readFile(configPath, 'utf8');
    fileConfig = JSON.parse(raw) as Partial<AppConfig>;
  } catch {
    fileConfig = {};
  }

  const merged: AppConfig = {
    ...DEFAULT_CONFIG,
    ...fileConfig,
    aiHeuristics: {
      ...DEFAULT_CONFIG.aiHeuristics,
      ...fileConfig.aiHeuristics,
    },
    packages: {
      ...DEFAULT_CONFIG.packages,
      ...fileConfig.packages,
    },
    ast: {
      ...DEFAULT_CONFIG.ast,
      ...fileConfig.ast,
    },
    severityOverrides: {
      ...DEFAULT_CONFIG.severityOverrides,
      ...(fileConfig.severityOverrides ?? {}),
    },
  };

  if (cliOptions.maxIssues && Number.isFinite(cliOptions.maxIssues)) {
    merged.maxIssues = cliOptions.maxIssues;
  }

  if (cliOptions.disablePackages) merged.packages.enabled = false;
  if (cliOptions.disableHeuristics) merged.aiHeuristics.enabled = false;
  if (cliOptions.disableAst) merged.ast.enabled = false;

  const safeOverrides: Record<string, Severity> = {};
  for (const [rule, severity] of Object.entries(merged.severityOverrides)) {
    if (isSeverity(severity)) safeOverrides[rule] = severity;
  }
  merged.severityOverrides = safeOverrides;

  return merged;
}
