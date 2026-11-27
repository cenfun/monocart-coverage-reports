# Sourcemap 与调试 {#sourcemaps-and-debugging}

## 症状速查 {#quick-diagnosis}

| 症状 | 可能原因 | 处理方法 |
| --- | --- | --- |
| 命中的行或分支与实际执行不符 | 覆盖率区间、生成代码、sourcemap 或原始源码可能来自不同构建。 | 确认四者均对应测试时实际执行的构建。若确认一致，选一处异常区间[检查 sourcemap](#inspect-sourcemaps)。 |
| 源码内容正确，但报告路径不对 | sourcemap 中的虚拟路径或构建路径未按预期规范化。 | 用 [`sourcePath`](/zh/pages/source-path#path-normalization) 改写报告路径；它不会改变 MCR 加载源码的位置。 |
| 报告只显示生成代码 | MCR 可能找不到可用的 sourcemap 或原始源码。 | 检查映射 URL，以及映射是否包含 `sourcesContent` 或指向可读取的本地源码。[开启调试日志](#enable-debugging)，将覆盖率与构建产物对照。 |
| 调试输出中找不到单独的源码和映射文件 | 仅开启调试日志不会导出这些文件；它们也可能已移至 `raw` 目录，或 MCR 没有可保存的 sourcemap。 | 同时设置 [`logging: 'debug'` 和 `sourceMap: true`](#export-debug-files)，在 `outputDir/.cache` 或配置的 raw 输出位置查找。若仍找不到，请确认构建生成了可用的 sourcemap。 |

如果文件完全缺失或没有生成报告，先看[常见问题](./common-issues#unexpected-coverage)。样式表问题参见 [CSS 覆盖率问题](./css-coverage-issues#quick-diagnosis)。

## 启用调试 {#enable-debugging}

通过 `logging: 'debug'` 启用 V8 报告的调试模式。

```js
const coverageOptions = {
    logging: 'debug',
    reports: [
        ['v8'],
        ['console-details']
    ]
};
```
调试模式会把原始覆盖率数据留在 `outputDir/.cache`。如果同时生成 [`raw` 报告](/zh/pages/reports#raw)，缓存会移到 raw 输出位置（默认为 `outputDir/raw`）。V8 报告也会保留生成文件视图，便于对照生成代码和源码上的覆盖率区间。

![V8 报告中的生成代码与覆盖率区间](/images/debug-coverage.png)

## 检查 Sourcemap {#inspect-sourcemaps}

选取一处异常区间，用 [Source Map Visualization](https://github.com/evanw/source-map-visualization) 对照生成代码的行列位置和对应的原始位置。如果源码显示正常但路径不对，请查看[源码路径改写](/zh/pages/source-path)。调试文件可能包含源码、路径和测试结果，分享前请[审查产物](/zh/pages/merging#raw-artifact-safety)。

![生成位置与原始位置的 sourcemap 对照](/images/debug-sourcemap.png)

## 导出调试文件 {#export-debug-files}

生成额外的 source 和 sourcemap 文件到 cache 或 raw 文件夹。

```js
const coverageOptions = {
    logging: 'debug',
    sourceMap: true
};
```

## 查看耗时日志 {#view-timing-logs}

使用环境变量 `MCR_LOG_TIME` 显示耗时日志。

```js
process.env.MCR_LOG_TIME = '1';
```
