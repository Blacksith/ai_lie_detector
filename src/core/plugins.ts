import { AppConfig, FileEntry, Issue } from './types.js';

export interface AnalyzerPluginContext {
  repoPath: string;
  files: FileEntry[];
  config: AppConfig;
  severityOverrides: Record<string, 'info' | 'warn' | 'error'>;
}

export interface AnalyzerPlugin {
  id: string;
  enabled: (config: AppConfig) => boolean;
  run: (ctx: AnalyzerPluginContext) => Promise<Issue[]>;
}

export async function runPlugins(
  plugins: AnalyzerPlugin[],
  ctx: AnalyzerPluginContext,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  for (const plugin of plugins) {
    if (!plugin.enabled(ctx.config)) continue;
    issues.push(...(await plugin.run(ctx)));
  }
  return issues;
}
