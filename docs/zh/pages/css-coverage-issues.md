# CSS 覆盖率问题 {#css-coverage-issues}

## 症状速查 {#quick-diagnosis}

| 症状 | 可能原因 | 处理方法 |
| --- | --- | --- |
| 使用 `@include` 时，报告显示生成的 CSS，而非 Sass 源文件 | 同一条生成规则可能映射到不连续的源码位置。 | [检查该规则的映射](./sourcemaps#inspect-sourcemaps)。若无法可靠映射，请[查看生成的 bundle 的覆盖率](#sass-mixins-and-include)，不要在原始源码的统计中查找这部分覆盖率。 |
| 压缩后，报告回退到生成的 CSS | CSS 压缩可能使 sourcemap 不准确。 | [关闭 CSS 压缩](#source-map-can-be-inaccurate-after-minification)，重新构建并采集覆盖率。 |
| 未测试的 Sass 文件却有行显示为已覆盖 | 未被解析或映射到 CSS 规则的行可能显示为已覆盖。 | 看[字节覆盖率](#line-coverage-of-untested-preprocessor-sources)：通过 `all` 纳入的未测试文件在此指标上为 0%。 |
| `all` 无法解析预处理器语法 | 文件需要先编译为 CSS，才能分析。 | 在 `all.transformer` 中调用项目的 CSS 预处理器：将 `entry.source` 设为编译后的 CSS、`entry.type` 设为 `'css'`、`entry.sourceMap` 设为对应的映射。 |
| 整个媒体查询或嵌套块都显示为已覆盖 | Chromium 可能为[整个块](#v8-covered-the-whole-block)记录覆盖率。 | 可尝试使用 [postcss-atomic-selectors](https://github.com/stephan-dum/postcss-atomic-selectors) 作为临时解决方案。 |

多个 bundle 映射到同一原始文件时，CSS 覆盖率取并集。

## Sass mixin 与 `@include` {#sass-mixins-and-include}

Sass `@include` 可能将一条生成规则映射到不连续的源码位置。规则无法可靠映射时，MCR 会将**整个 bundle 按生成的 CSS 展示**，而不是预处理器源文件；该 bundle 的覆盖率也不会合并到原始源码的覆盖率中。

## 未测试预处理源文件的行覆盖率 {#line-coverage-of-untested-preprocessor-sources}

通过 `all` 加入的未测试文件，其字节覆盖率为 `0%`，包括 sourcemap 还原的原始文件。解析或映射规则之外的行（如变量、未使用的 mixin）可能显示为已覆盖；请以 **bytes** 覆盖率为准。

## 压缩后 sourcemap 可能不准确 {#source-map-can-be-inaccurate-after-minification}
CSS 压缩可能产生不准确的 sourcemap，导致报告回退到生成的 CSS。遇到映射不准确时，可尝试**禁用 CSS 压缩**。

## V8 会将整个 block 视为已覆盖 {#v8-covered-the-whole-block}

Chromium 可能将整个 media query 或嵌套 CSS block 标记为已覆盖。可考虑使用 [postcss-atomic-selectors](https://github.com/stephan-dum/postcss-atomic-selectors) 作为临时解决方案。
