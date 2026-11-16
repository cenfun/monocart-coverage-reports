# 配置选项 {#options}
- 默认选项: [lib/default/options.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/lib/default/options.js)
- 选项的类型描述，见 `CoverageReportOptions` [lib/index.d.ts](https://github.com/cenfun/monocart-coverage-reports/blob/main/lib/index.d.ts)
- [配置文件](/zh/guide/configuration#config-file)

| 选项 | 类型 | 默认值 | 说明 |
| :-- | :-- | :-- | :-- |
| `logging` | `"off" \| "error" \| "info" \| "debug"` | `"info"` | 日志级别。设为 `"debug"` 会保留原始缓存并输出 sourcemap，便于排查问题。参见 [调试覆盖率和sourcemap](/zh/troubleshooting/sourcemaps#debug-for-coverage-and-sourcemap)。 |
| `name` | `string` | `"Coverage Report"` | 报告标题，显示在 UI 以及 summary 报告中。 |
| `reports` | `string \| (string \| ReportDescription)[]` | `""` (自动) | 生成哪些报告。V8 数据默认 `"v8"`，Istanbul 数据默认 `"html"`。参见 [所有支持的报告类型](/zh/reference/reports#available-reports)。 |
| `outputDir` | `string` | `"./coverage-reports"` | 所有报告以及 `.cache` 的输出目录。 |
| `inputDir` | `string \| string[]` | `null` | 导入的原始覆盖率数据目录（用于 [合并](/zh/guide/merging#merge-coverage-reports)）。 |
| `baseDir` | `string` | `process.cwd()` | 规范化相对源路径的基准目录。当生成报告的工作目录和源码目录不一致时需要设置。 |
| `dataDir` | `string` | `null` | `generate()` 阶段自动加载的覆盖率数据目录，作为 `addFromDir()` 的替代。 |
| `entryFilter` | `string \| object \| function` | `null` | （仅 V8）按 URL 过滤入口文件，参见 [过滤V8覆盖率数据](/zh/guide/filtering#filtering-results)。 |
| `sourceFilter` | `string \| object \| function` | `null` | （仅 V8）过滤从 sourcemap 解包出的源文件。 |
| `outputFilter` | `string \| object \| function` | `null` | （仅 V8）在 sourcemap 转换后，按最终 `sourcePath` 过滤文件。参见 [过滤V8覆盖率数据](/zh/guide/filtering#filtering-results)。 |
| `filter` | `string \| object \| function` | `null` | 合并 `entryFilter` 和 `sourceFilter` 的统一过滤器。 |
| `sourcePath` | `object \| function` | `null` | 修改源文件路径，参见 [使用 `sourcePath`](/zh/guide/source-path#resolve-sourcepath-for-the-source-files)。 |
| `all` | `string \| string[] \| object` | `null` | 为未测试文件添加空覆盖率，参见 [为未测试的文件添加空的覆盖率报告](/zh/guide/untested-files#adding-empty-coverage-for-untested-files)。 |
| `outputFile` | `string` | `"index.html"` | （仅 V8）V8 报告的 `[子目录/]文件名`。 |
| `inline` | `boolean` | `false` | （仅 V8）将所有资源内联到单一 HTML 文件。 |
| `assetsPath` | `string` | `"./assets"` | （仅 V8）非内联模式下的资源目录。 |
| `lcov` | `boolean` | `false` | 额外生成 `lcov.info`，等同于添加 `lcovonly` 报告。 |
| `v8Ignore` | `boolean` | `true` | （仅 V8）启用/禁用基于注释的忽略（`v8 ignore …`），参见 [忽略未覆盖代码](/zh/guide/ignoring-code#ignoring-uncovered-codes)。 |
| `reportPath` | `string \| () => string` | `null` | 覆盖默认的报告入口路径（默认 `outputDir/index.html`）。多个报告共用同一 `outputDir` 时很有用。 |
| `watermarks` | `[number, number] \| object` | `[50, 80]` | 覆盖率高/低阈值百分比。也支持按指标配置：`{ bytes:[50,80], lines:[50,80] }`。 |
| `clean` | `boolean` | `true` | 生成报告前清理 `outputDir` 中的旧报告（`.cache` 目录在 `cleanCache` 也为 `true` 时才会被清理）。 |
| `cleanCache` | `boolean` | `false` | 启动时清理缓存目录。当 `clean` 和 `cleanCache` 都为 `false` 时，之前运行的缓存数据会保留，可在多进程间复用。 |
| `gc` | `number` | `null` | 内存阈值（MB），在关键阶段若 JavaScript 堆内存使用量（`heapUsed`）超过阈值则强制触发 GC，适用于超大数据集，参见 [JavaScript heap out of memory](/zh/troubleshooting/common-issues#javascript-heap-out-of-memory)。 |
| `sourceMap` | `boolean` | `false` | 将源文件和 sourcemap 也保存到 cache 便于调试（需要 `logging: "debug"`）。 |
| `sourceMapResolver` | `(url, defaultResolver) => Promise<string \| object>` | `null` | 自定义 sourcemap 加载逻辑（例如从构建缓存中读取），可调用 `defaultResolver(url)` 回退到默认解析。 |
| `onEntry` | `(entry) => void \| Promise<void>` | `null` | （仅 V8）每个入口文件处理前触发，参见 [Hooks](/zh/reference/hooks#hooks)。 |
| `onEnd` | `(coverageResults) => void \| Promise<void>` | `null` | 报告生成完成后触发，参见 [Hooks](/zh/reference/hooks#hooks)。 |
