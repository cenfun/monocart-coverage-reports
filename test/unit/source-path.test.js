const platform = process.platform;
const assert = require('assert');
const { resolveSourceUrl, getSourcePath } = require('../../lib/utils/source-path.js');

it('resolveSourceUrl', () => {

    // windows absolute path
    if (platform === 'win32') {
        console.log('test win32 path');
        assert.equal(getSourcePath(resolveSourceUrl('C://a.js')), 'C/a.js');
        assert.equal(getSourcePath(resolveSourceUrl('C:\\\\a.js')), 'C/a.js');
        assert.equal(getSourcePath(resolveSourceUrl('c://workspace/test.spec.js')), 'c/workspace/test.spec.js');
        assert.equal(getSourcePath(resolveSourceUrl('c:/workspace/test.spec.js')), 'c/workspace/test.spec.js');
        assert.equal(getSourcePath(resolveSourceUrl('c:\\workspace\\test.spec.js')), 'c/workspace/test.spec.js');
    }

    // linux absolute path
    assert.equal(getSourcePath(resolveSourceUrl('/dir/./src/a.js')), 'dir/src/a.js');

    // protocol
    assert.equal(getSourcePath(resolveSourceUrl('ws://a.js')), 'a.js');
    assert.equal(getSourcePath(resolveSourceUrl('webpack://coverage-v8/./src/branch.js')), 'coverage-v8/src/branch.js');

    // file:// protocol
    if (platform === 'win32') {
        // absolute
        assert.equal(getSourcePath(resolveSourceUrl('file:///C:/path/src/a.js')), 'C/path/src/a.js');
        // relative
        assert.equal(getSourcePath(resolveSourceUrl('file://src/a.js')), 'src/a.js');
    } else {
        // absolute ///
        assert.equal(getSourcePath(resolveSourceUrl('file:///src/a.js')), 'src/a.js');
        // relative localhost or empty
        assert.equal(getSourcePath(resolveSourceUrl('file://localhost/src/a.js')), 'src/a.js');
        assert.equal(getSourcePath(resolveSourceUrl('file:/src/a.js')), 'src/a.js');
    }

    // relative
    assert.equal(getSourcePath(resolveSourceUrl('../../src/a.js')), 'src/a.js');
    assert.equal(getSourcePath(resolveSourceUrl('a.js')), 'a.js');
    assert.equal(getSourcePath(resolveSourceUrl('./src/a.js')), 'src/a.js');

    // sourceRoot
    assert.equal(getSourcePath(resolveSourceUrl('../a.js', 'webpack://')), 'a.js');
    assert.equal(getSourcePath(resolveSourceUrl('a.js', 'dist')), 'dist/a.js');
    assert.equal(getSourcePath(resolveSourceUrl('../a.js', 'dist')), 'a.js');

    if (platform === 'win32') {
        assert.equal(getSourcePath(resolveSourceUrl('./a.js', 'file:///C:/path/src')), 'C/path/src/a.js');
        assert.equal(getSourcePath(resolveSourceUrl('../a.js', 'file:///C:/path/src')), 'C/path/a.js');

        assert.equal(getSourcePath(resolveSourceUrl('./a.js', 'file://path/src')), 'path/src/a.js');
        assert.equal(getSourcePath(resolveSourceUrl('../a.js', 'file://path/src')), 'path/a.js');

    } else {
        // absolute ///
        assert.equal(getSourcePath(resolveSourceUrl('./a.js', 'file:///path/src')), 'path/src/a.js');
        assert.equal(getSourcePath(resolveSourceUrl('../a.js', 'file:///path/src')), 'path/a.js');
    }

    assert.equal(getSourcePath(resolveSourceUrl('a.js', '/root')), 'root/a.js');

    // base path
    assert.equal(getSourcePath('file:///foo/bar/oof/a.js', '/foo/bar'), 'oof/a.js');
});
