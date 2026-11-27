# 配置选项 {#configuration-options}

按功能分组查阅配置，每个选项均提供独立锚点，可从右侧目录直接定位。通用选项对应 [`CoverageReportOptions`](/zh/pages/types#coveragereportoptions)；CLI 与测试运行器专属选项对应 [`McrCliOptions`](/zh/pages/types#mcrclioptions)。

- 默认配置：[lib/default/options.js](https://github.com/cenfun/monocart-coverage-reports/blob/main/lib/default/options.js)
- 类型声明：[lib/index.d.ts](/zh/pages/types#type-declarations)
- 配置加载与示例：[配置文件](/zh/pages/configuration#configuration-files)

已有[配置文件](/zh/pages/configuration#configuration-files)时，把示例属性合并到现有配置；否则可将示例复制到项目根目录的 `mcr.config.mjs`，并按需调整路径。组合多个 ESM 示例时，只保留一个 `export default` 对象。CommonJS 写法参见[模块格式](/zh/pages/configuration#module-format)。

## 报告输出 {#report-output}

### `name` {#name}

- **类型:** `string`
- **默认值:** `"Coverage Report"`

报告标题，显示在 UI 以及 summary 报告中。

### `reports` {#reports}

- **类型:** `string | (string | ReportDescription)[]`
- **默认值:** `""` (自动)

同一次 V8 采集既要生成可浏览的 HTML，又要在终端查看摘要时，列出两种报告。

```js
export default {
    reports: [
        ['v8', {
            outputFile: 'browser.html'
        }],
        'console-summary'
    ]
};
```

::: tip 自动选择报告
`reports` 为空时，V8 输入默认生成 `v8`，Istanbul 输入默认生成 `html`。需要为某种报告单独配置时，使用 `[名称, 选项]` 元组，参见[选项类型](/zh/pages/types#reportdescription)和[支持的报告](/zh/pages/reports#reports)。
:::

### `outputDir` {#outputdir}

- **类型:** `string`
- **默认值:** `"./coverage-reports"`

所有报告以及 `.cache` 的输出目录。

### `reportPath` {#reportpath}

- **类型:** `string | (() => string)`
- **默认值:** `null`

同时生成 V8 HTML 和 JSON 时，可让下游工具读取 JSON，而不是默认的 HTML 报告。

```js
export default {
    reports: ['v8', 'v8-json'],
    reportPath: 'coverage-report.json'
};
```

::: warning 不会重命名文件
`reportPath` 只更改结果中返回的入口路径，不改变实际输出文件。相对路径以 `outputDir` 为基准；V8 HTML 的文件名由 `outputFile` 设置。
:::

### `lcov` {#lcov}

- **类型:** `boolean`
- **默认值:** `false`

额外生成 `lcov.info`，等同于添加 `lcovonly` 报告。

### `watermarks` {#watermarks}

- **类型:** `[number, number] | object`
- **默认值:** `[50, 80]`

想让行覆盖率在低于 70%、70% 至不足 90%、90% 及以上时显示不同颜色，可单独配置行覆盖率的颜色分界。

```js
export default {
    watermarks: {
        lines: [70, 90]
    }
};
```

::: warning 不等于 CI 门禁
[`Watermarks`](/zh/pages/types#watermarks) 按 `[低, 高]` 的顺序填写百分比。若低覆盖率应导致 CI 失败，请使用[覆盖率阈值 hook](/zh/pages/hooks#coverage-thresholds)。
:::

## 输入与源码路径 {#inputs-and-paths}

### `inputDir` {#inputdir}

- **类型:** `string | string[]`
- **默认值:** `null`

单元测试和端到端测试分别导出覆盖率后，用此选项生成一份合并报告。

```js
export default {
    inputDir: ['./coverage-reports/unit/raw', './coverage-reports/e2e/raw'],
    outputDir: './coverage-reports/merged'
};
```

::: warning 合并前检查每份输入
传入 `raw` 报告导出的目录，而不是 HTML 或 LCOV 输出；各次运行的输入格式应一致（均为 V8 或均为 Istanbul）。缺失的目录会被跳过，[合并](/zh/pages/merging#manual-merging)前请确认每份产物都存在。
:::

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

同一个源码文件在客户端和服务端构建中带有不同路径前缀时，先统一报告路径，再合并覆盖率。

```js
export default {
    sourcePath: {
        'client-build/src/': 'src/',
        'server-build/src/': 'src/'
    }
};
```

::: tip 只改报告路径
此选项不会改变 MCR 查找缺失源码的位置。遇到特殊的 V8 路径，可通过[回调的 `info.url`](/zh/pages/source-path#path-normalization)查看原始 URL。
:::

## 过滤与统计范围 {#filtering-and-scope}

### `entryFilter` {#entryfilter}

- **类型:** `string | object | function`
- **默认值:** `null`

使用 V8 数据时，在处理 sourcemap 之前按采集到的 URL 保留应用 bundle。

```js
export default {
    entryFilter: '**/dist/main.js'
};
```

::: warning 排除 bundle 也会排除其中的源码
若应用和依赖共用同一个 bundle，请保留它，再通过 [`sourceFilter`](#sourcefilter) 缩小范围。匹配 URL 时也要留意查询参数。参见[过滤流程](/zh/pages/filtering#filtering-pipeline)。
:::

### `sourceFilter` {#sourcefilter}

- **类型:** `string | object | function`
- **默认值:** `null`

V8 bundle 的 sourcemap 同时包含应用和依赖源码时，只保留 `src/` 下的应用源码。

```js
export default {
    sourceFilter: '**/src/**'
};
```

::: tip 匹配源码路径，而不是 bundle URL
待匹配路径已规范化，并包含 [`sourcePath`](#sourcepath) 的改写结果。若要筛选最终报告的文件列表，请用 [`outputFilter`](#outputfilter)。
:::

### `filter` {#filter}

- **类型:** `string | object | function`
- **默认值:** `null`

入口 URL 和源码路径都要排除依赖时，复用同一组规则。

```js
export default {
    filter: {
        '**/node_modules/**': false,
        '**/*': true
    }
};
```

::: tip 备用规则，不是叠加规则
`entryFilter` 和 `sourceFilter` 各自在未配置时才使用 `filter`。对象规则按首次匹配生效，排除规则要放在兜底规则之前。此选项不设置 `outputFilter`。
:::

### `outputFilter` {#outputfilter}

- **类型:** `string | object | function`
- **默认值:** `null`

使用 V8 数据时，按最终报告中显示的路径，只保留 `src/` 下的文件。

```js
export default {
    outputFilter: (file) => file.sourcePath.startsWith('src/')
};
```

::: tip 转换后才过滤
回调接收 [`CoverageFile`](/zh/pages/types#coveragefile)，不是路径字符串。此选项不会省去转换开销、恢复前面已排除的文件，也不会改变 [`raw` 导出](/zh/pages/reports#raw)。参见[过滤方案对比](/zh/pages/filtering#filtering-approaches)。
:::

### `all` {#all}

- **类型:** `string | string[] | object`
- **默认值:** `null`

将 `src/` 下未测试的 JavaScript 文件按 0% 覆盖率纳入报告，而不是让它们从统计中消失。

```js
export default {
    all: {
        dir: './src',
        filter: '**/*.js'
    }
};
```

::: tip 检查其他过滤规则
使用 V8 数据时，未测试文件同样受 `sourceFilter` 影响，之后仍可能被 `outputFilter` 排除。文件类型与转换配置参见[未测试文件](/zh/pages/untested-files#untested-files)。
:::

### `v8Ignore` {#v8ignore}

- **类型:** `boolean`
- **默认值:** `true`

（仅 V8）启用/禁用基于注释的忽略（`v8 ignore …`），参见 [忽略未覆盖代码](/zh/pages/ignoring-code#ignoring-code)。

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

::: warning 使用专用输出目录
`clean` 默认开启，不要将 `outputDir` 指向源码目录、待合并的原始数据或其他任务的输出。
:::

### `cleanCache` {#cleancache}

- **类型:** `boolean`
- **默认值:** `false`

独立运行需要从空缓存开始时，让报告实例在初始化时清理缓存。

```js
export default {
    outputDir: './coverage-reports/local',
    cleanCache: true
};
```

::: warning 不要提前清理共享缓存
CLI 在启动子命令或合并报告前会清理自身缓存。[跨进程采集](/zh/pages/multiprocessing#multiple-processes)时，应等所有采集进程结束后再生成报告，不要提前清理共享缓存。成功生成报告后，非 debug 模式会删除缓存，不受 `clean` 或 `cleanCache` 控制；需要保留时可设 `logging: "debug"`，也可导出 [`raw` 报告](/zh/pages/reports#raw)供后续合并。
:::

### `gc` {#gc}

- **类型:** `number`
- **默认值:** `null`

内存阈值（MB），在关键阶段若 JavaScript 堆内存使用量（`heapUsed`）超过阈值则强制触发 GC，适用于超大数据集，参见 [JavaScript heap out of memory](/zh/pages/common-issues#javascript-heap-out-of-memory)。

## Sourcemap 与诊断 {#sourcemaps-and-diagnostics}

### `logging` {#logging}

- **类型:** `"off" | "error" | "info" | "debug"`
- **默认值:** `"info"`

日志级别（[`LoggingType`](/zh/pages/types#loggingtype)）。设为 `"debug"` 会保留原始缓存并输出 sourcemap，便于排查问题。参见 [Sourcemap 与调试](/zh/pages/sourcemaps#sourcemaps-and-debugging)。

### `sourceMap` {#sourcemap}

- **类型:** `boolean`
- **默认值:** `false`

排查 V8 覆盖范围异常时，将源码与 sourcemap 保存下来以便对照。

```js
export default {
    logging: 'debug',
    sourceMap: true
};
```

::: warning 必须开启 debug 日志
仅设置 `sourceMap: true` 不会保存这些文件。调试产物可能包含源码、内部路径和测试结果，分享前请先检查。参见 [sourcemap 调试](/zh/pages/sourcemaps#export-debug-files)。
:::

### `sourceMapResolver` {#sourcemapresolver}

- **类型:** `(url, defaultResolver) => Promise<string | object>`
- **默认值:** `null`

部署后的 bundle 无法访问 sourcemap URL 时，可从本地构建产物读取对应的映射。

```js
import { readFile } from 'node:fs/promises';

export default {
    sourceMapResolver: (url, defaultResolver) => {
        if (url === 'https://example.com/assets/app.js.map') {
            return readFile(new URL('./build/app.js.map', import.meta.url), 'utf8');
        }
        return defaultResolver(url);
    }
};
```

::: warning 必须与测试时的构建一致
将示例 URL 和文件路径换成实际值，并使用测试时那次构建生成的 sourcemap，其中应通过 `sourcesContent` 内嵌原始源码。从磁盘读取映射不会让 MCR 改用本地映射所在目录作为相对源码路径的基准。未接管的 URL 交给 `defaultResolver(url)`。
:::

## Hooks {#hooks}

### `onEntry` {#onentry}

- **类型:** `(entry) => void | Promise<void>`
- **默认值:** `null`

（仅 V8）每个入口文件处理前触发，参数为 [`entry`](/zh/pages/types#v8coverageentry)。参见 [Hooks](/zh/pages/hooks#hooks)。

### `onEnd` {#onend}

- **类型:** `(coverageResults: CoverageResults | undefined) => void | Promise<void>`
- **默认值:** `null`

报告生成后，从 [`coverageResults`](/zh/pages/types#coverageresults) 读取行覆盖率摘要。

```js
export default {
    onEnd: (results) => {
        if (results) {
            console.log(results.summary.lines);
        }
    }
};
```

::: warning 不要用 hook 判断生成是否成功
没有可用输入时，`generate()` 可能直接返回 `undefined`，不调用 `onEnd`。使用 API 时请检查返回值；如需 CI 门禁，参见[覆盖率阈值](/zh/pages/hooks#coverage-thresholds)。
:::

## CLI 与测试运行器 {#cli-and-tests}

本组只适用于 CLI 配置，API 不会执行这些选项。函数选项需写在配置文件中，而不是作为命令行参数传入。

### `test` {#test}

- **类型:** `string | string[] | null`
- **默认值:** `null`

为两组测试设置默认目标，运行 `npx mcr test` 时就不用重复传入路径。

```js
export default {
    test: ['test/unit/*.test.js', 'test/integration/*.test.js']
};
```

::: tip 命令行目标会覆盖默认值
字符串作为一个参数传给 `node --test`；多个路径或 glob 应写成数组。未传入命令行目标时，`null`、空字符串或 `[]` 都会跳过测试。其他命令和 API 忽略此选项。参见[使用 mcr test 运行测试](/zh/pages/node-test-runner)。
:::

### `onStart` {#onstart}

- **类型:** `(coverageReport: CoverageReport) => void | Promise<void>`
- **默认值:** `undefined`（未配置）

仅 CLI：子进程启动前触发，参数为 [`coverageReport`](/zh/pages/types#coveragereport)。参见 [`onStart`](/zh/pages/hooks#onstart)。

### `onReady` {#onready}

- **类型:** `(coverageReport: CoverageReport, nodeV8CoverageDir: string, subprocess: any) => void | Promise<void>`
- **默认值:** `undefined`（未配置）

仅 CLI：子进程退出后、读取覆盖率数据前触发，参数为 [`coverageReport`](/zh/pages/types#coveragereport)。参见 [`onReady`](/zh/pages/hooks#onready)。

### `onTestEnd` {#ontestend}

- **类型:** `(testResults: TestResults) => void | Promise<void>`
- **默认值:** `null`

在 `mcr test` 发布测试结果并生成覆盖率之前，先输出已采集的 Node.js 测试结果摘要。

```js
export default {
    test: './test/**/*.test.js',
    onTestEnd: (results) => {
        console.log(results.summary);
    }
};
```

::: tip 不配置 hook 也会采集测试结果
此 hook 仅适用于 `mcr test`，并在 `onReady` 之前运行。原始报告和调试缓存可能包含测试名称及错误信息，参见 [`onTestEnd`](/zh/pages/hooks#ontestend) 的[结果类型](/zh/pages/types#testresults)与[脱敏说明](/zh/pages/hooks#sensitive-data)。
:::
