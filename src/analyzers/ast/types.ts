import { FileEntry, Issue, Severity } from '../../core/types.js';

export interface AstRuleContext {
  file: FileEntry;
  exportsByFile: Map<string, Set<string>>;
  severityForRule: (ruleId: string, defaultSeverity: Severity) => Severity;
}

export interface AstRule {
  id: string;
  title: string;
  defaultSeverity: Severity;
  run: (ast: unknown, ctx: AstRuleContext) => Issue[];
}
