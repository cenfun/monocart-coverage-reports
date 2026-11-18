# Sourcemap 与 CSS {#sourcemaps-and-css}
> 当你觉得覆盖率存在问题的时候，`MCR`支持自行调试来核验覆盖率的准确性
- 首先打开调试设置`logging: 'debug'`
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

- 调试sourcemap可以直接使用[Source Map Visualization](https://evanw.github.io/source-map-visualization/) （esbuild作者提供的sourcemap在线查看器）

![](/images/debug-sourcemap.png)

- 生成额外的source和sourcemap文件到cache或raw文件夹
```js
const coverageOptions = {
    logging: 'debug',
    sourceMap: true
};
```

- 使用环境变量`MCR_LOG_TIME`显示时间日志
```js
process.env.MCR_LOG_TIME = true;
```

## CSS 覆盖率与 sourcemap {#css-coverage-issues}

多个 bundle 映射到同一原始文件时，CSS 覆盖率取并集。

对于 `all` 无法直接解析的预处理器语法，请使用 `all.transformer` 编译为 CSS，设置 `entry.type = 'css'`，并保留 sourcemap。

### Sass mixin 与 `@include` {#sass-mixins-and-include}

Sass `@include` 可能将一条生成规则映射到不连续的源码位置。规则无法可靠映射时，MCR 会将**整个 bundle 按生成的 CSS 展示**，而不是预处理器源文件；该 bundle 的覆盖率也不会合并到原始源码的覆盖率中。

### 未测试预处理源文件的行覆盖率 {#line-coverage-of-untested-preprocessor-sources}

通过 `all` 加入的未测试文件，其字节覆盖率为 `0%`，包括 sourcemap 还原的原始文件。解析或映射规则之外的行（如变量、未使用的 mixin）可能显示为已覆盖；请以 **bytes** 覆盖率为准。

### 压缩后 sourcemap 可能不准确 {#source-map-can-be-inaccurate-after-minification}
CSS 压缩可能产生不准确的 sourcemap，导致报告回退到生成的 CSS。遇到映射不准确时，可尝试**禁用 CSS 压缩**。

### V8 会将整个 block 视为已覆盖 {#v8-covered-the-whole-block}

Chromium 可能将整个 media query 或嵌套 CSS block 标记为已覆盖。可考虑使用 [postcss-atomic-selectors](https://www.npmjs.com/package/postcss-atomic-selectors) 作为临时解决方案。
