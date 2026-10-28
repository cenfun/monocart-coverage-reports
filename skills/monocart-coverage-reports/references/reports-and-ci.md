# Reports, merging, and CI

## Select outputs

| Need | Report | Input support / artifact |
| --- | --- | --- |
| Native interactive V8/CSS report | `v8` | V8 only; `index.html` + assets |
| Native machine-readable V8 results | `v8-json` | V8 only; `coverage-report.json` |
| Istanbul UI | `html` | Istanbul or converted V8 |
| Interoperable coverage | `lcovonly` | Istanbul or converted V8; `lcov.info` |
| XML coverage | `cobertura`, `clover` | Istanbul or converted V8 |
| Istanbul maps / summary | `json`, `json-summary` | Not native V8 JSON and not MCR raw |
| Console | `console-summary`, `console-details` | V8 or Istanbul |
| CI summary | `markdown-summary`, `markdown-details` | `coverage-summary.md`, `coverage-details.md` |
| Upload data | `codecov`, `codacy` | `codecov.json`, `codacy.json` |
| Later merging | `raw` | Original inputs and sources, not rendered output |

Multiple report syntax is `reports: ['v8', ['html', { subdir: 'istanbul' }], 'lcovonly']`. Keep multiple HTML formats in separate paths. Native V8 report options use `outputFile`; Istanbul JSON/XML options commonly use `file` — check the declaration for the selected reporter rather than assuming one universal option.

For a portable single native HTML file, use a report descriptor **inside** the `reports` array:

```js
// inline.config.mjs
export default {
    outputDir: './coverage-reports',
    reports: [['v8', { inline: true }]]
};
```

Do not use `reports: ['v8', { inline: true }]`: the separate object does not configure the V8 reporter. Otherwise upload the HTML **and its assets**. Do not claim Istanbul-only input can recover V8 bytes or CSS metrics. Custom reporters receive format-specific data; inspect the reporter interface and installed implementation rather than treating `CoverageResults` as a universal custom reporter payload.

## Enforce thresholds explicitly

`watermarks: [50, 80]` changes low/medium/high colors, not exit status. A strict `onEnd` implementation for a 3.x config:

```js
// mcr.config.mjs
export default {
    outputDir: './coverage-reports',
    reports: ['v8', 'v8-json', 'lcovonly', 'markdown-summary'],
    onEnd(results) {
        if (!results) throw new Error('No coverage results');
        const thresholds = { lines: 80, branches: 70 };
        const errors = [];
        for (const [metric, minimum] of Object.entries(thresholds)) {
            const summary = results.summary?.[metric];
            const pct = summary?.pct;
            if (!summary || summary.total === 0 ||
                typeof pct !== 'number' || !Number.isFinite(pct) || pct < minimum) {
                errors.push(`${metric}: ${pct ?? 'missing'}%, required ${minimum}% (nonempty)`);
            }
        }
        if (errors.length) throw new Error(errors.join('\n'));
    }
};
```

This deliberately fails absent/zero-total metrics; adapt that policy explicitly if a project legitimately has no branches. Do not coerce `''` into 0 or silently skip missing metrics. For API workflows, also check `generate()`'s return because no usable input can return early without invoking `onEnd`. For ordinary CLI workflows where missing collection must fail, verify a **fresh, nonempty** result as shown below; built-in `mcr test` already treats a missing generated report as an error on 3.x.

Use `process.exitCode = 1` or throw rather than calling `process.exit()` before asynchronous writes/cleanup finish. Preserve the test process's original failing status. Test the threshold-failure path, not just passing coverage.

## Reject stale reports and missing collection in CI

An ordinary CLI run can return success without calling `onEnd` when no usable input was collected. In that case `generate()` returns before its normal output cleanup: **`clean: true` and `cleanCache: true` do not guarantee old reports are removed**. Checking only whether an existing report file exists can therefore pass using a previous run's result.

Prefer a new, isolated output directory per CI run. If reusing a fixed directory, remove it **before** collecting, then require a newly generated machine-readable report with nonempty intended metrics. For the threshold config above, save these two scripts in the host root:

```js
// clean-coverage.mjs
import fs from 'node:fs';

// This must be a dedicated report directory, never a source or shared worker directory.
fs.rmSync('./coverage-reports', { recursive: true, force: true });
```

```js
// verify-coverage.mjs
import fs from 'node:fs';

const results = JSON.parse(fs.readFileSync('./coverage-reports/coverage-report.json', 'utf8'));
const lines = results.summary?.lines;
if (!Array.isArray(results.files) || results.files.length === 0 ||
    !lines || !(lines.total > 0) || typeof lines.pct !== 'number' || !Number.isFinite(lines.pct)) {
    throw new Error('Missing or empty coverage from this run');
}
```

Run all three steps with failure propagation. For example, in a POSIX shell or npm script (replace `./app.js` with the real target):

```sh
node ./clean-coverage.mjs && npx mcr -c mcr.config.mjs -- node ./app.js && node ./verify-coverage.mjs
```

Here `&&` belongs to the **outer shell**, not a command string passed to MCR. In other CI environments, use equivalent sequential steps that stop on failure. The cleanup, config, and verifier must use the same dedicated output path. Never clear shared output while workers are collecting; clean once in the coordinator before starting them. The verifier rejects missing/invalid/empty data; `onEnd` separately enforces the configured thresholds, and the original test/CLI failure must still fail CI.

## Multi-process collection on one filesystem

Use shared options with a dedicated `outputDir` and **no `cleanCache: true` on workers**:

```js
// coverage-options.mjs
export default {
    outputDir: './coverage-reports/shared',
    reports: ['v8', 'console-summary'],
    cleanCache: false
};
```

1. Coordinator before workers start: `MCR(options).cleanCache()` once.
2. Each worker: `await MCR(options).add(itsCoverageData)`; do not generate a final report.
3. Coordinator **after every worker completes its writes**: `await MCR(options).generate()`; require a nonempty result.

`add()` persists inputs to the output's `.cache`; generation merges them. `clean` governs old output artifacts, not the worker input collection lifecycle. Default non-debug generation removes cache afterward. Do not let an early worker generate or clear shared cache while other workers are still adding data.

## Merge separate jobs/shards with raw exports

Each independent job has its own output and exports raw data:

```js
const options = {
    outputDir: './coverage-reports/shard-1', // unique per job
    reports: [
        ['raw', { outputDir: 'raw' }],
        'v8',
        'console-summary'
    ],
    cleanCache: true
};
```

**Test-result privacy (3.2.0+):** `mcr test` adds `test-results-<id>.json` to raw exports (including ZIP) and retains it in debug caches, even without `onTestEnd`. Test names, paths and error strings can contain credentials or personal data. Review artifacts before uploading, and use [`onTestEnd`](cli.md#hooks-and-shutdown) to redact persisted results before publication. This does not redact terminal output or temporary files already written. Raw imports merge coverage only; test results are not merged.

The relative raw directory becomes `coverage-reports/shard-1/raw`. Upload/download the **entire** raw directory, including source files. After every required job finishes, merge in a separate output directory:

```js
// merge-coverage.mjs
import fs from 'node:fs';
import path from 'node:path';
import { MCR } from 'monocart-coverage-reports';

const inputDir = [
    './downloaded/shard-1/raw',
    './downloaded/shard-2/raw'
];
// Check all expected shards BEFORE generation can clean old output.
for (const dir of inputDir) {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
        throw new Error(`Missing coverage shard: ${dir}`);
    }
    const coverageFiles = fs.readdirSync(dir).filter((name) =>
        name.startsWith('coverage-') && name.endsWith('.json'));
    let hasData = false;
    for (const name of coverageFiles) {
        const coverage = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
        if (coverage.type === 'v8' && Array.isArray(coverage.data)) {
            hasData ||= coverage.data.length > 0;
            for (const entry of coverage.data) {
                const sourceFile = path.join(dir, `source-${entry.id}.json`);
                const source = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
                if (source.id !== entry.id || typeof source.source !== 'string') {
                    throw new Error(`Invalid raw source: ${sourceFile}`);
                }
            }
        } else if (coverage.type === 'istanbul' && coverage.data &&
            typeof coverage.data === 'object' && !Array.isArray(coverage.data)) {
            hasData ||= Object.keys(coverage.data).length > 0;
        } else {
            throw new Error(`Invalid raw coverage: ${dir}/${name}`);
        }
    }
    if (!hasData) throw new Error(`Empty coverage shard: ${dir}`);
}

const report = MCR({
    inputDir,
    outputDir: './coverage-reports/merged',
    reports: ['v8', 'lcovonly', 'console-summary'],
    cleanCache: true
});
const results = await report.generate();
if (!results || !results.files.length) throw new Error('No merged coverage generated');
```

CLI merge syntax (does **not** perform the preflight above; prefer the validated script in CI):

```sh
npx mcr merge --inputDir "./downloaded/shard-1/raw,./downloaded/shard-2/raw" --outputDir ./coverage-reports/merged -r v8,lcovonly,console-summary
```

- Derive the expected shard list from the CI matrix, not only the directories that happened to download. The script rejects missing/empty shards, malformed coverage, and missing/invalid V8 source files; a successful merge alone does not prove all shards contributed.
- For independently built artifacts, record and compare source revision/build identifiers and shard IDs before merging; directory checks alone cannot prove the builds match.
- Keep output separate from inputs; default cleaning must not remove downloaded artifacts. Apply the same path normalization/source revision across jobs.
- HTML, `v8-json`, LCOV, and `json-summary` are not substitutes for MCR raw input. Do not average percentages.
- Do not assume arbitrary V8 and Istanbul datasets can be mixed in one run. Prefer consistent raw formats or verify the installed release's mixed-format handling with a targeted fixture.
- Keep raw artifacts until merge validation passes, then apply the host's retention/security policy. Raw exports are not affected by final `outputFilter`.

## CI checklist

- Pin a supported Node runtime and install from the existing lockfile.
- Build the exact coverage target with maps, run tests, then generate/merge only when inputs are flushed.
- Upload coverage artifacts on failed tests too, using the CI platform's failure-safe artifact step. Do not mask exit codes with unconditional success or `continue-on-error`.
- Check source scope and nonempty metrics before gating. Supply `all` when coverage must account for files never imported.
- Publish `coverage-summary.md` to the job summary using the host CI's supported file append mechanism; upload LCOV/Codecov with explicit file paths.
- Never include tokens in generated HTML/config examples. Do not publicly publish source-containing reports without approval.

## Regression snapshots

The public `getSnapshot(results)` and `diffSnapshot(old, next, options)` helpers compare coverage results, not raw data merges:

```js
import { getSnapshot, diffSnapshot } from 'monocart-coverage-reports';
const next = getSnapshot(results);
const diff = diffSnapshot(previousSnapshot, next, {
    skipEqual: true,
    showSummary: true,
    metrics: ['lines', 'branches']
});
if (diff.change) console.log(diff.message);
```

Here `results` is a validated generation result and `previousSnapshot` is a loaded baseline. Inspect differences; do not overwrite baselines simply to make tests pass. Identical percentages alone do not guarantee identical mapped source ranges.
