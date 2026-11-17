# Source paths {#resolve-sourcepath-for-the-source-files}
If the source file comes from the sourcemap, then its path is a virtual path. Using the `sourcePath` option to resolve a custom path.
For example, we have tested multiple dist files, which contain some common files. We hope to merge the coverage of the same files, so we need to unify the `sourcePath` in order to be able to merge the coverage data.
```js
const coverageOptions = {
    sourcePath: (filePath) => {
        // Remove the virtual prefix
        const list = ['my-dist-file1/', 'my-dist-file2/'];
        for (const str of list) {
            if (filePath.startsWith(str)) {
                return filePath.slice(str.length);
            }
        }
        return filePath;
    }
};
```
Built-in report path normalization is best-effort; it cannot fully reconcile every nonstandard, virtual, or foreign-platform path. Use `sourcePath` to correct these special cases rather than relying on automatic inference. The callback receives the normalized `filePath`; for V8 entries and sourcemap sources, `info.url` provides the original URL before report path normalization (including the sourcemap's `sourceRoot`, when present). This rewrites report paths, not the filesystem paths used to load missing source content. When `sourcesContent` is missing, local sources are loaded relative to the external map's URL (or the generated file for inline maps), with `sourceRoot` applied as a directory.

It also supports simple key/value replacement:
```js
const coverageOptions = {
    sourcePath: {
        'my-dist-file1/': '',
        'my-dist-file2/': ''
    }
};
```
Normalize the full path of the file:
```js
import path from 'node:path';

// MCR coverage options
const coverageOptions = {
    sourcePath: (filePath, info) => {
        if (!filePath.includes('/') && info.distFile) {
            return `${path.dirname(info.distFile)}/${filePath}`;
        }
        return filePath;
    }
};
```
