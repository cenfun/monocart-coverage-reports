# 配置选项 {#options}

按功能分组查阅配置，每个选项均提供独立锚点，可从右侧目录直接定位。通用选项对应 `CoverageReportOptions`；CLI 与测试运行器专属选项对应 `McrCliOptions`。

- 默认配置：[lib/default/options.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/lib/default/options.js)
- 类型声明：[lib/index.d.ts](https://github.com/cenfun/monocart-coverage-reports/blob/main/lib/index.d.ts)
- 配置加载与示例：[配置文件](/zh/reference/configuration#config-file)

## 报告输出 {#report-output}

### `name` {#name}

- **类型:** `string`
- **默认值:** `"Coverage Report"`

报告标题，显示在 UI 以及 summary 报告中。

### `reports` {#reports}

- **类型:** `string | (string | ReportDescription)[]`
- **默认值:** `""` (自动)

生成哪些报告。V8 数据默认 `"v8"`，Istanbul 数据默认 `"html"`。参见 [所有支持的报告类型](/zh/reference/reports#available-reports)。

### `outputDir` {#outputdir}

- **类型:** `string`
- **默认值:** `"./coverage-reports"`

所有报告以及 `.cache` 的输出目录。

### `reportPath` {#reportpath}

- **类型:** `string | (() => string)`
- **默认值:** `null`

覆盖默认的报告入口路径（默认 `outputDir/index.html`）。多个报告共用同一 `outputDir` 时很有用。

### `lcov` {#lcov}

- **类型:** `boolean`
- **默认值:** `false`

额外生成 `lcov.info`，等同于添加 `lcovonly` 报告。

### `watermarks` {#watermarks}

- **类型:** `[number, number] | object`
- **默认值:** `[50, 80]`

覆盖率高/低阈值百分比。也支持按指标配置：`{ bytes:[50,80], lines:[50,80] }`。这些值控制报告的颜色分级，不会强制检查覆盖率是否达标；质量门禁参见 [覆盖率阈值](/zh/reference/hooks#coverage-thresholds)。

## 输入与源码路径 {#inputs-and-paths}

### `inputDir` {#inputdir}

- **类型:** `string | string[]`
- **默认值:** `null`

导入的原始覆盖率数据目录（用于 [合并](/zh/reference/merging#merge-coverage-reports)）。

### `dataDir` {#datadir}

- **类型:** `string`
- **默认值:** `null`

`generate()` 阶段自动加载的覆盖率数据目录，作为 `addFromDir()` 的替代。

### `baseDir` {#basedir}

- **类型:** `string`
- **默认值:** `null`

规范化相对源路径的基准目录。默认值 `null` 表示使用当前工作目录（`process.cwd()`）。当生成报告的工作目录和源码目录不一致时需要设置。

### `sourcePath` {#sourcepath}

- **类型:** `object | function`
- **默认值:** `null`

修改源文件路径，参见 [使用 `sourcePath`](/zh/reference/source-path#resolve-sourcepath-for-the-source-files)。

## 过滤与统计范围 {#filtering-and-scope}

### `entryFilter` {#entryfilter}

- **类型:** `string | object | function`
- **默认值:** `null`

（仅 V8）按 URL 过滤入口文件，参见 [过滤V8覆盖率数据](/zh/reference/filtering#filtering-results)。

### `sourceFilter` {#sourcefilter}

- **类型:** `string | object | function`
- **默认值:** `null`

（仅 V8）过滤从 sourcemap 解包出的源文件。

### `filter` {#filter}

- **类型:** `string | object | function`
- **默认值:** `null`

合并 `entryFilter` 和 `sourceFilter` 的统一过滤器。不配置 `outputFilter`。

### `outputFilter` {#outputfilter}

- **类型:** `string | object | function`
- **默认值:** `null`

（仅 V8）在 sourcemap 转换后，按最终 `sourcePath` 过滤文件。参见 [过滤V8覆盖率数据](/zh/reference/filtering#filtering-results)。

### `all` {#all}

- **类型:** `string | string[] | object`
- **默认值:** `null`

为未测试文件添加空覆盖率，参见 [为未测试的文件添加空的覆盖率报告](/zh/reference/untested-files#adding-empty-coverage-for-untested-files)。

### `v8Ignore` {#v8ignore}

- **类型:** `boolean`
- **默认值:** `true`

（仅 V8）启用/禁用基于注释的忽略（`v8 ignore …`），参见 [忽略未覆盖代码](/zh/reference/ignoring-code#ignoring-uncovered-codes)。

## V8 HTML 报告 {#v8-html}

### `outputFile` {#outputfile}

- **类型:** `string`
- **默认值:** `"index.html"`

（仅 V8）V8 报告的 `[子目录/]文件名`。

### `inline` {#inline}

- **类型:** `boolean`
- **默认值:** `false`

（仅 V8）将所有资源内联到单一 HTML 文件。

### `assetsPath` {#assetspath}

- **类型:** `string`
- **默认值:** `"./assets"`

（仅 V8）非内联模式下的资源目录。

## 缓存与性能 {#cache-and-performance}

### `clean` {#clean}

- **类型:** `boolean`
- **默认值:** `true`

生成报告前清理 `outputDir` 中的旧报告。此清理会跳过 `.cache`，不控制初始化时或生成后的缓存清理。

### `cleanCache` {#cleancache}

- **类型:** `boolean`
- **默认值:** `false`

报告实例初始化时清理缓存目录。设为 `false` 只表示初始化时保留已有缓存，不保证 `generate()` 后仍保留缓存。CLI 在执行测试或子命令前，还会主动清空自身缓存，再开始采集。

跨进程采集时，可在采集阶段共享缓存，等待所有采集进程完成后再生成报告。报告成功生成后，非 debug 模式仍会删除缓存，与 `clean`、`cleanCache` 的值无关。如需保留，可使用 `logging: "debug"`；也可以导出 [`raw` 报告](/zh/reference/reports#raw)，后续通过 `inputDir` 导入原始数据进行合并。

::: warning 清理范围
请仅将 `outputDir` 设置为专用报告目录，不要指向源码目录、待合并的原始数据或其他任务的输出。多进程共享缓存时，不要让某个进程在其他采集进程完成前提前生成报告或清空缓存。
:::

### `gc` {#gc}

- **类型:** `number`
- **默认值:** `null`

内存阈值（MB），在关键阶段若 JavaScript 堆内存使用量（`heapUsed`）超过阈值则强制触发 GC，适用于超大数据集，参见 [JavaScript heap out of memory](/zh/troubleshooting/common-issues#javascript-heap-out-of-memory)。

## Sourcemap 与诊断 {#sourcemaps-and-diagnostics}

### `logging` {#logging}

- **类型:** `"off" | "error" | "info" | "debug"`
- **默认值:** `"info"`

日志级别。设为 `"debug"` 会保留原始缓存并输出 sourcemap，便于排查问题。参见 [调试覆盖率和sourcemap](/zh/troubleshooting/sourcemaps#debug-for-coverage-and-sourcemap)。

### `sourceMap` {#sourcemap}

- **类型:** `boolean`
- **默认值:** `false`

将源文件和 sourcemap 也保存到 cache 便于调试（需要 `logging: "debug"`）。

### `sourceMapResolver` {#sourcemapresolver}

- **类型:** `(url, defaultResolver) => Promise<string | object>`
- **默认值:** `null`

自定义 sourcemap 加载逻辑（例如从构建缓存中读取），可调用 `defaultResolver(url)` 回退到默认解析。

## Hooks {#hooks}

### `onEntry` {#onentry}

- **类型:** `(entry) => void | Promise<void>`
- **默认值:** `null`

（仅 V8）每个入口文件处理前触发，参见 [Hooks](/zh/reference/hooks#hooks)。

### `onEnd` {#onend}

- **类型:** `(coverageResults: CoverageResults | undefined) => void | Promise<void>`
- **默认值:** `null`

报告生成完成后触发，参见 [Hooks](/zh/reference/hooks#hooks)。

## CLI 与测试运行器 {#cli-and-tests}

本组只适用于 CLI 配置，API 不会执行这些选项。函数选项需写在配置文件中，而不是作为命令行参数传入。

### `test` {#test}

- **类型:** `string | string[] | null`
- **默认值:** `null`

仅适用于 `mcr test`。指定传给 `node --test` 的测试文件路径或 glob；字符串作为一个参数，数组作为多个参数。命令行测试目标会覆盖此配置。未提供命令行目标且值为 `null`、空字符串或 `[]` 时跳过测试。其他命令和 API 忽略此选项。参见 [使用 mcr test 运行测试](/zh/getting-started/node-test-runner)。

### `onStart` {#onstart}

- **类型:** `(coverageReport: CoverageReport) => void | Promise<void>`
- **默认值:** `undefined`（未配置）

仅 CLI：子进程启动前触发，参见 [`onStart`](/zh/reference/hooks#onstart--onready--仅cli可用)。

### `onReady` {#onready}

- **类型:** `(coverageReport: CoverageReport, nodeV8CoverageDir: string, subprocess: any) => void | Promise<void>`
- **默认值:** `undefined`（未配置）

仅 CLI：子进程退出后、读取覆盖率数据前触发，参见 [`onReady`](/zh/reference/hooks#onready)。

### `onTestEnd` {#ontestend}

- **类型:** `(testResults: TestResults) => void | Promise<void>`
- **默认值:** `null`

仅适用于 `mcr test`：测试结果采集后、结果缓存发布和覆盖率生成前触发。可在此处理或脱敏测试结果；不配置此 hook 也会采集测试结果。参见 [`onTestEnd`](/zh/reference/hooks#ontestend--仅-mcr-test-可用)。
