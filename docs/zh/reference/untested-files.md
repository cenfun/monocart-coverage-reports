# 未测试文件 {#untested-files}

## 包含未测试文件 {#include-untested-files}

默认不包含未测试文件。使用 `all` 可将它们以 0% 覆盖率加入报告，即使没有采集到任何覆盖率数据也可生成报告。同一原始源码的真实 V8 覆盖率优先于空覆盖率条目。
```js
const coverageOptions = {
    all: './src'

    // 支持多个目录
    // all: ['./src', './lib']
};
```

## 过滤文件 {#filter-files}

未测试的文件也适用于`sourceFilter`过滤器. 而且也可以指定自己的`filter`过滤器 (可以返回文件类型来支持js或css的覆盖率格式):
```js
const coverageOptions = {
    all: {
        dir: ['./src'],
        filter: {
            // exclude files
            '**/ignored-*.js': false,
            '**/*.html': false,
            // empty css coverage
            '**/*.scss': 'css',
            '**/*': true
        }
    }
};
```

## 原生 TypeScript {#native-typescript}

在较新 Node.js 上，当保留的覆盖率包含 MCR 捕获的 Node 原生 TS 时，`all` 可直接分析使用可擦除语法的 `.ts`、`.mts` 和 `.cts`，无需 transformer 或额外 TS 解析器。纯类型声明不计为可执行语句或可执行行。其他上下文（包括只使用 `all` 的报告）默认维持原有行为，可以设置 `typescript: true` 或使用文件回调来分析其中的原始可擦除 TS；`typescript: false` 则会关闭分析，即使存在原生采集上下文。显式 transformer 始终优先。非可擦除语法需要带 sourcemap 的 transformer 才能提供 AST 指标，否则自动模式保留原有的未覆盖文件回退，显式强制开启时则拒绝不支持的语法。参见 [TypeScript 支持](/zh/reference/typescript#typescript-support)。

## 转换源码 {#transform-source-code}

可以将未测试的文件转换成 JavaScript，以便进行 AST 分析。以下示例仅处理**不含 JSX 的 TypeScript**，并假定已安装 `@swc/core`。JSX/TSX 或 Vue 应使用匹配的编译器和解析器，这不是通用转换器。保留完整文件路径，避免不同目录下的同名文件冲突；SWC 返回的 sourcemap 是 JSON 字符串，赋值前需要解析。
```js
import { fileURLToPath } from 'node:url';
import { transform } from '@swc/core';
const coverageOptions = {
    all: {
        dir: ['./src'],
        filter: '**/*.ts',
        transformer: async (entry) => {
            const { code, map } = await transform(entry.source, {
                filename: fileURLToPath(entry.url),
                sourceMaps: true,
                isModule: true,
                jsc: {
                    parser: {
                        syntax: 'typescript'
                    }
                }
            });
            entry.source = code;
            entry.sourceMap = JSON.parse(map);
        }
    }
};
```
