const platform = process.platform;
const assert = require('assert');
const { normalizeSourcePath } = require('../../lib/utils/source-path.js');

it('normalizeSourcePath', () => {

    // windows absolute path
    if (platform === 'win32') {
        console.log('test win32 path');
        assert.equal(normalizeSourcePath('C://a.js'), 'C/a.js');
        assert.equal(normalizeSourcePath('C:\\\\a.js'), 'C/a.js');
        assert.equal(normalizeSourcePath('c://workspace/test.spec.js'), 'c/workspace/test.spec.js');
        assert.equal(normalizeSourcePath('c:/workspace/test.spec.js'), 'c/workspace/test.spec.js');
        assert.equal(normalizeSourcePath('c:\\workspace\\test.spec.js'), 'c/workspace/test.spec.js');
    }

    // linux absolute path
    assert.equal(normalizeSourcePath('/dir/./src/a.js'), 'dir/src/a.js');

    // protocol
    assert.equal(normalizeSourcePath('ws://a.js'), 'a.js');
    assert.equal(normalizeSourcePath('http://127.0.0:8080/a.js'), '127.0.0.0-8080/a.js');
    assert.equal(normalizeSourcePath('https://127.0.0:8080/a.js?v=1'), '127.0.0.0-8080/a.js/v=1');

    assert.equal(normalizeSourcePath('webpack://coverage-v8/./src/branch.js'), 'coverage-v8/src/branch.js');
    assert.equal(normalizeSourcePath('webpack://coverage-v8/../src/branch.js'), 'coverage-v8/src/branch.js');

    // file:// protocol
    if (platform === 'win32') {
        // absolute
        assert.equal(normalizeSourcePath('file:///C:/path/src/a.js'), 'C/path/src/a.js');
        // relative
        assert.equal(normalizeSourcePath('file://src/a.js'), 'src/a.js');
    } else {
        // absolute ///
        assert.equal(normalizeSourcePath('file:///src/a.js'), 'src/a.js');
        // relative localhost or empty
        assert.equal(normalizeSourcePath('file://localhost/src/a.js'), 'src/a.js');
        assert.equal(normalizeSourcePath('file:/src/a.js'), 'src/a.js');
    }

    // relative
    assert.equal(normalizeSourcePath('../../src/a.js'), 'src/a.js');
    assert.equal(normalizeSourcePath('a.js'), 'a.js');
    assert.equal(normalizeSourcePath('./src/a.js'), 'src/a.js');

    // sourceRoot
    assert.equal(normalizeSourcePath('webpack://../a.js'), 'a.js');
    assert.equal(normalizeSourcePath('dist/a.js'), 'dist/a.js');
    assert.equal(normalizeSourcePath('dist/../a.js'), 'a.js');

    if (platform === 'win32') {
        assert.equal(normalizeSourcePath('file:///C:/path/src/a.js'), 'C/path/src/a.js');
        assert.equal(normalizeSourcePath('file:///C:/path/src/../a.js'), 'C/path/a.js');

        assert.equal(normalizeSourcePath('file://path/src/a.js'), 'path/src/a.js');
        assert.equal(normalizeSourcePath('file://path/src/../a.js'), 'path/a.js');

    } else {
        // absolute ///
        assert.equal(normalizeSourcePath('file:///path/src/a.js'), 'path/src/a.js');
        assert.equal(normalizeSourcePath('file:///path/src/../a.js'), 'path/a.js');
    }

    assert.equal(normalizeSourcePath('/root/a.js'), 'root/a.js');

    // baseDir
    assert.equal(normalizeSourcePath('/root/a.js', '/root'), 'a.js');
    assert.equal(normalizeSourcePath('/root/dir/a.js', '/root'), 'dir/a.js');
    assert.equal(normalizeSourcePath('/root/dir1/a.js', '/root/dir2'), 'dir1/a.js');
    assert.equal(normalizeSourcePath('/root/a.js', '/other'), 'root/a.js');
    assert.equal(normalizeSourcePath('dist/a.js', __dirname), 'dist/a.js');

});
