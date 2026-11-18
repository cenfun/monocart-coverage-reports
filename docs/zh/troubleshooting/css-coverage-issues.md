# CSS 覆盖率问题 {#css-coverage-issues}

多个 bundle 映射到同一原始文件时，CSS 覆盖率取并集。

对于 `all` 无法直接解析的预处理器语法，请使用 `all.transformer` 编译为 CSS，设置 `entry.type = 'css'`，并保留 sourcemap。

## Sass mixin 与 `@include` {#sass-mixins-and-include}

Sass `@include` 可能将一条生成规则映射到不连续的源码位置。规则无法可靠映射时，MCR 会将**整个 bundle 按生成的 CSS 展示**，而不是预处理器源文件；该 bundle 的覆盖率也不会合并到原始源码的覆盖率中。

## 未测试预处理源文件的行覆盖率 {#line-coverage-of-untested-preprocessor-sources}

通过 `all` 加入的未测试文件，其字节覆盖率为 `0%`，包括 sourcemap 还原的原始文件。解析或映射规则之外的行（如变量、未使用的 mixin）可能显示为已覆盖；请以 **bytes** 覆盖率为准。

## 压缩后 sourcemap 可能不准确 {#source-map-can-be-inaccurate-after-minification}
CSS 压缩可能产生不准确的 sourcemap，导致报告回退到生成的 CSS。遇到映射不准确时，可尝试**禁用 CSS 压缩**。

## V8 会将整个 block 视为已覆盖 {#v8-covered-the-whole-block}

Chromium 可能将整个 media query 或嵌套 CSS block 标记为已覆盖。可考虑使用 [postcss-atomic-selectors](https://www.npmjs.com/package/postcss-atomic-selectors) 作为临时解决方案。
