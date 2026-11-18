# Sourcemap 与调试 {#sourcemaps-and-debugging}
> 当你觉得覆盖率存在问题的时候，`MCR`支持自行调试来核验覆盖率的准确性

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
调试模式下，也就是`logging`为`debug`的时候, 原始的覆盖率数据将保留在`[outputDir]/.cache`缓存目录下，不会删除，如果使用了`raw`报告，那么位置变为`[outputDir]/raw`下，这样我们可以打开v8报告的html文件，通过下面新增的一些调试帮助信息来核对覆盖率
![](/images/debug-coverage.png)

## 检查 Sourcemap {#inspect-sourcemaps}

调试 sourcemap 可以直接使用 [Source Map Visualization](https://evanw.github.io/source-map-visualization/)（esbuild 作者提供的 sourcemap 在线查看器）。

![](/images/debug-sourcemap.png)

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
process.env.MCR_LOG_TIME = true;
```
