# Sourcemap 与调试 {#sourcemaps-and-debugging}

当报告中的行或分支与执行情况不符时，先确认覆盖率、生成代码、sourcemap 和原始源码来自同一轮构建，再开启调试。缺少文件或报告时，先看[常见问题](/zh/troubleshooting/common-issues#unexpected-coverage)。的准确性

CSS 专项排障参见 [CSS 覆盖率问题](/zh/troubleshooting/css-coverage-issues)。

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
调试模式会把原始覆盖率数据留在 `outputDir/.cache`。如果同时生成 [`raw` 报告](/zh/reference/reports#raw)，缓存会移到 raw 输出位置（默认为 `outputDir/raw`）。V8 报告也会保留生成文件视图，便于对照生成代码和源码上的覆盖率区间。

![V8 报告中的生成代码与覆盖率区间](/images/debug-coverage.png)

## 检查 Sourcemap {#inspect-sourcemaps}

选取一处异常区间，用 [Source Map Visualization](https://github.com/evanw/source-map-visualization) 对照生成代码的行列位置和对应的原始位置。如果源码显示正常但路径不对，请查看[源码路径改写](/zh/reference/source-path)。调试文件可能包含源码、路径和测试结果，分享前请[审查产物](/zh/reference/merging#raw-artifact-safety)。

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
