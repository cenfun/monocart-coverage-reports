# Ignoring code {#ignoring-uncovered-codes}

To ignore codes, use the special comment which starts with `v8 ignore `:
- Ignoring all until stop
<!-- eslint-skip -->
```js
/* v8 ignore start */
function uncovered() {
}
/* v8 ignore stop */
```
- Ignoring the next line or next N lines
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
- Compatible with [c8 coverage](https://github.com/bcoe/c8/?tab=readme-ov-file#ignoring-all-lines-until-told) or [nodejs coverage](https://nodejs.org/docs/latest/api/test.html#collecting-code-coverage) syntax
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
- To disable comment-based ignoring entirely, set `v8Ignore: false`.
