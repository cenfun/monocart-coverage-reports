# Ignoring code {#ignoring-code}

The following ignore comments are supported only for V8 coverage data. For Istanbul coverage data, use Istanbul’s ignore comment syntax (for example, `/* istanbul ignore next */`).

To ignore uncovered code in V8 coverage data, use special comments with the following supported markers:

1. `v8 ignore` (`start`, `stop`, `next`, `next N`) — **Recommended**
2. `node:coverage` (`disable`, `enable`, `ignore next`, `ignore next N`)
3. `c8 ignore` (`start`, `stop`, `next`, `next N`)

## Ignore code blocks {#ignore-code-blocks}

<!-- eslint-skip -->
```js
/* v8 ignore start */
function uncovered() {
}
/* v8 ignore stop */
```

## Ignore subsequent lines {#ignore-subsequent-lines}

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

## Compatible syntax {#compatible-syntax}

Compatible with [c8 coverage](https://github.com/bcoe/c8/?tab=readme-ov-file#ignoring-all-lines-until-told) or [nodejs coverage](https://nodejs.org/docs/latest/api/test.html#collecting-code-coverage) syntax
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

## Disable comment-based ignoring {#disable-comment-based-ignoring}

To disable comment-based ignoring entirely, set `v8Ignore: false`.
