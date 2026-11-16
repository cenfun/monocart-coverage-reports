# 忽略代码 {#ignoring-uncovered-codes}

使用特定的注释，以`v8 ignore `开头可以忽略未覆盖的代码:
- 忽略开始到结束
<!-- eslint-skip -->
```js
/* v8 ignore start */
function uncovered() {
}
/* v8 ignore stop */
```
- 忽略接下来一行或者多行
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
- 兼容支持 [c8 coverage](https://github.com/bcoe/c8/?tab=readme-ov-file#ignoring-all-lines-until-told) 或 [nodejs coverage](https://nodejs.org/docs/latest/api/test.html#collecting-code-coverage) 的语法格式
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
- 可以设置 `v8Ignore: false` 完全禁用基于注释的忽略机制。
