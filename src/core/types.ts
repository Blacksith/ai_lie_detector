export type Severity = 'info' | 'warn' | 'error';

export interface Issue {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  confidence?: number;
  file?: string;
  line?: number;
  column?: number;
  snippet?: string;
  suggestion?: string;
  tags: string[];
}

export interface AnalyzerResult {
  issues: Issue[];
  meta?: Record<string, unknown>;
}

export interface FileEntry {
  path: string;
  absPath: string;
  content: string;
  sizeKb: number;
}

export interface AppConfig {
  include: string[];
  exclude: string[];
  severityOverrides: Record<string, Severity>;
  aiHeuristics: {
    enabled: boolean;
    threshold: number;
  };
  packages: {
    enabled: boolean;
    staleMonths: number;
    cacheTtlHours: number;
    auditEnabled: boolean;
  };
  ast: {
    enabled: boolean;
  };
  maxFileSizeKb: number;
  maxIssues: number;
}

export interface RunOptions {
  repoPath: string;
  format: 'text' | 'json';
  minExitSeverity: 'warn' | 'error';
  onlyExt?: string[];
  extraExclude?: string[];
  configPath?: string;
  maxIssues?: number;
  disablePackages?: boolean;
  disableHeuristics?: boolean;
  disableAst?: boolean;
}
