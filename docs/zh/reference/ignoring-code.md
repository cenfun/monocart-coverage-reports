# 忽略代码 {#ignoring-code}

以下忽略注释仅适用于 V8 格式的覆盖率数据。对于 Istanbul 格式的覆盖率数据，请使用 Istanbul 的忽略注释语法（例如 `/* istanbul ignore next */`）。

对于 V8 覆盖率数据，使用特殊注释可以忽略未覆盖的代码，支持以下标记：

1. `v8 ignore`（`start`、`stop`、`next`、`next N`）— **推荐**
2. `node:coverage`（`disable`、`enable`、`ignore next`、`ignore next N`）
3. `c8 ignore`（`start`、`stop`、`next`、`next N`）

## 忽略代码块 {#ignore-code-blocks}

<!-- eslint-skip -->
```js
/* v8 ignore start */
function uncovered() {
}
/* v8 ignore stop */
```

## 忽略后续行 {#ignore-subsequent-lines}

<!-- eslint-skip -->
```js
/* v8 ignore next */
const os = platform === 'win32' ? 'Windows' : 'Other';

const os = platform === 'win32' ? 'Windows' /* v8 ignore next */ : 'Other';

// v8 ignore next 3
if (platform === 'linux') {
    console.log('hello linux');
}
```

## 兼容语法 {#compatible-syntax}

兼容支持 [c8 coverage](https://github.com/bcoe/c8/?tab=readme-ov-file#ignoring-all-lines-until-told) 或 [nodejs coverage](https://nodejs.org/docs/latest/api/test.html#collecting-code-coverage) 的语法格式
<!-- eslint-skip -->
```js
/* c8 ignore start */
function uncovered() {
}
/* c8 ignore stop */

/* node:coverage disable */
function uncovered() {
}
/* node:coverage enable */
```

## 禁用注释忽略 {#disable-comment-based-ignoring}

可以设置 `v8Ignore: false` 完全禁用基于注释的忽略机制。
