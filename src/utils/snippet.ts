export function extractSnippet(content: string, line?: number, maxLines = 2): string | undefined {
  if (!line || line < 1) return undefined;
  const lines = content.split(/\r?\n/);
  const start = Math.max(0, line - 1);
  const slice = lines.slice(start, Math.min(lines.length, start + maxLines));
  return slice.join('\n').trim() || undefined;
}
