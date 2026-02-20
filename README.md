# ai-check

![ai-check logo](logo.png)

## English

`ai-check` is a local-first CLI that scans repositories for risk signals:

- AST code issues and anti-patterns
- Package risks: outdated, deprecated, stale, and `npm audit` vulnerabilities
- AI-likeness heuristics with confidence score (non-ML)

### Install

```bash
npm install
npm run build
npm link
```

Run:

```bash
ai-check .
# or
npx ai-check .
```

### CLI

```bash
ai-check [repoPath]
  --format text|json
  --json
  --severity warn|error
  --max-issues N
  --only js,ts
  --exclude node_modules,dist
  --config path/to/config.json
  --no-packages
  --no-ai-heuristics
  --no-ast
```

### Config (`aicheck.config.json`)

```json
{
  "include": ["**/*.{js,jsx,ts,tsx,mjs,cjs}"],
  "exclude": ["node_modules/**", "dist/**", "build/**", ".git/**"],
  "severityOverrides": {
    "ast.console_left": "warn",
    "pkg.deprecated": "error",
    "pkg.vulnerability": "error"
  },
  "aiHeuristics": {
    "enabled": true,
    "threshold": 0.65
  },
  "packages": {
    "enabled": true,
    "staleMonths": 24,
    "cacheTtlHours": 24,
    "auditEnabled": true
  },
  "maxFileSizeKb": 300,
  "maxIssues": 200
}
```

### Implemented checks

AST:

- `ast.unused_import`
- `ast.unreachable_code`
- `ast.suspicious_async`
- `ast.fake_import_symbol` (best-effort)
- `ast.console_left`
- `ast.todo_density`

Packages:

- `pkg.outdated`
- `pkg.deprecated`
- `pkg.abandoned`
- `pkg.vulnerability` (`npm audit --json` hook)

`pkg.outdated` uses `package-lock.json` when available (falls back to semver range from `package.json`).

AI heuristics:

- `ai.over_commenting`
- `ai.generic_naming`
- `ai.symmetry_smell`
- `ai.excessive_defensive`
- `ai.verbose_errors`
- `ai.hallucinated_import`

### Exit codes

- `0`: no warn/error issues for chosen threshold
- `1`: warnings found (`--severity warn`)
- `2`: errors found

### CI

GitHub Actions workflow is included at `.github/workflows/ci.yml`.
It runs tests, build, and `ai-check` in JSON mode. The job fails by severity threshold:

```bash
node dist/cli.js . --format json --severity warn
```

On manual run (`workflow_dispatch`) you can set severity to `warn` or `error`.
Core pipeline is plugin-based, so Dart/Python analyzers can be added as separate plugins later.

## Українська

`ai-check` — локальна CLI-утиліта для сканування репозиторію на ризики:

- AST-аналіз помилок та антипатернів
- Перевірка пакетів: застарілі, deprecated, stale, та вразливості через `npm audit`
- Евристики схожості на AI-код з `confidence` (без ML)

### Встановлення

```bash
npm install
npm run build
npm link
```

Запуск:

```bash
ai-check .
# або
npx ai-check .
```

### Параметри CLI

```bash
ai-check [repoPath]
  --format text|json
  --json
  --severity warn|error
  --max-issues N
  --only js,ts
  --exclude node_modules,dist
  --config path/to/config.json
  --no-packages
  --no-ai-heuristics
  --no-ast
```

### Конфіг (`aicheck.config.json`)

Ключі і приклад такі самі, як у секції English вище. Для вразливостей можна перевизначити `pkg.vulnerability`, а також вимкнути audit через `packages.auditEnabled: false`. Для `pkg.outdated` спочатку використовується версія з `package-lock.json` (якщо є), інакше діапазон з `package.json`.

### Коди виходу

- `0`: немає warn/error для обраного порогу
- `1`: є попередження (`--severity warn`)
- `2`: є помилки

### Ліцензія

MIT
