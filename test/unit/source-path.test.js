const platform = process.platform;
const assert = require('assert');
const { normalizeSourcePath } = require('../../lib/utils/source-path.js');

it('normalizeSourcePath', () => {

    // windows absolute path
    if (platform === 'win32') {
        console.log('test win32 path');
        assert.equal(normalizeSourcePath('Z://a.js'), 'Z:/a.js');
        assert.equal(normalizeSourcePath('Z:\\\\b.js'), 'Z:/b.js');
        assert.equal(normalizeSourcePath('z://workspace/test.spec.js'), 'z:/workspace/test.spec.js');
        assert.equal(normalizeSourcePath('z:/workspace/test.spec.js'), 'z:/workspace/test.spec.js');
        assert.equal(normalizeSourcePath('z:\\workspace\\test.spec.js'), 'z:/workspace/test.spec.js');
    }

    // linux absolute path
    assert.equal(normalizeSourcePath('/dir/./src/c.js'), 'dir/src/c.js');

    // protocol
    assert.equal(normalizeSourcePath('ws://d.js'), 'd.js');
    assert.equal(normalizeSourcePath('http://127.0.0:8080/a.js'), '127.0.0.0-8080/a.js');
    assert.equal(normalizeSourcePath('https://127.0.0:8080/a.js?v=1'), '127.0.0.0-8080/a.js-v=1');

    assert.equal(normalizeSourcePath('webpack://coverage-v8/./src/branch.js'), 'coverage-v8/src/branch.js');
    assert.equal(normalizeSourcePath('webpack://coverage-v8/../src/branch.js'), 'coverage-v8/src/branch.js');

    // file:// protocol
    if (platform === 'win32') {
        // absolute
        assert.equal(normalizeSourcePath('file:///Z:/path/src/a.js'), 'Z:/path/src/a.js');
        // relative
        assert.equal(normalizeSourcePath('file://src/e.js'), 'src/e.js');
    } else {
        // absolute ///
        assert.equal(normalizeSourcePath('file:///src/f.js'), 'src/f.js');
        // relative localhost or empty
        assert.equal(normalizeSourcePath('file://localhost/src/g.js'), 'src/g.js');
        assert.equal(normalizeSourcePath('file:/src/h.js'), 'src/h.js');
    }

    // relative
    assert.equal(normalizeSourcePath('../../src/i.js'), 'src/i.js');
    assert.equal(normalizeSourcePath('j.js'), 'j.js');
    assert.equal(normalizeSourcePath('./src/k.js'), 'src/k.js');

    // sourceRoot
    assert.equal(normalizeSourcePath('webpack://../m.js'), 'm.js');
    assert.equal(normalizeSourcePath('dist/n.js'), 'dist/n.js');
    assert.equal(normalizeSourcePath('dist/../o.js'), 'o.js');

    if (platform === 'win32') {
        assert.equal(normalizeSourcePath('file:///Z:/path/src/p.js'), 'Z:/path/src/p.js');
        assert.equal(normalizeSourcePath('file:///Z:/path/src/../q.js'), 'Z:/path/q.js');

        assert.equal(normalizeSourcePath('file://path/src/r.js'), 'path/src/r.js');
        assert.equal(normalizeSourcePath('file://path/src/../s.js'), 'path/s.js');

    } else {
        // absolute ///
        assert.equal(normalizeSourcePath('file:///path/src/t.js'), 'path/src/t.js');
        assert.equal(normalizeSourcePath('file:///path/src/../v.js'), 'path/v.js');
    }

    assert.equal(normalizeSourcePath('/root/u.js'), 'root/u.js');

    // baseDir
    assert.equal(normalizeSourcePath('/root/w.js', '/root'), 'w.js');
    assert.equal(normalizeSourcePath('/root/dir/x.js', '/root'), 'dir/x.js');
    assert.equal(normalizeSourcePath('/root/dir1/y.js', '/root/dir2'), 'dir1/y.js');
    assert.equal(normalizeSourcePath('/root/z.js', '/other'), 'root/z.js');
    assert.equal(normalizeSourcePath('dist/zz.js', __dirname), 'dist/zz.js');

});
