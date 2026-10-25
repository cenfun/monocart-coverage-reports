import { it } from 'node:test';
const platform = process.platform;
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CoverageReport, MCR } from '../../lib/index.js';
import { normalizeSourcePath } from '../../lib/utils/source-path.js';

it('normalizeSourcePath', () => {

    // windows absolute path
    if (platform === 'win32') {
        console.log('test win32 path');
        assert.equal(normalizeSourcePath('Z://a.js'), 'Z/a.js');
        assert.equal(normalizeSourcePath('Z:\\\\b.js'), 'Z/b.js');
        assert.equal(normalizeSourcePath('z://workspace/test.spec.js'), 'z/workspace/test.spec.js');
        assert.equal(normalizeSourcePath('z:/workspace/test.spec.js'), 'z/workspace/test.spec.js');
        assert.equal(normalizeSourcePath('z:\\workspace\\test.spec.js'), 'z/workspace/test.spec.js');
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
        assert.equal(normalizeSourcePath('file:///Z:/path/src/a.js'), 'Z/path/src/a.js');
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
        assert.equal(normalizeSourcePath('file:///Z:/path/src/p.js'), 'Z/path/src/p.js');
        assert.equal(normalizeSourcePath('file:///Z:/path/src/../q.js'), 'Z/path/q.js');

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
    assert.equal(normalizeSourcePath('dist/zz.js', import.meta.dirname), 'dist/zz.js');

});

it('preserves malformed URI text without throwing during path normalization', () => {
    for (const filename of ['bad%.js', 'bad%ZZ.js', 'bad%E0%A4%A.js', 'bad%FF.js', 'bad%20%.js']) {
        const url = pathToFileURL(path.resolve('src', filename)).href.replace(/%25/g, '%');
        assert.ok(normalizeSourcePath(url).endsWith(filename), url);
    }
});

it('keeps existing valid file URL decoding and encoded separator fallback', () => {
    for (const filename of ['space name.js', '中文.js', 'percent%.js']) {
        const url = pathToFileURL(path.resolve('src', filename)).href;
        assert.equal(normalizeSourcePath(url), `src/${filename}`);
    }
    const url = pathToFileURL(path.resolve('src', 'nested', 'entry.js')).href.replace('/nested/', '/nested%2F');
    assert.equal(normalizeSourcePath(url), 'src/nested/entry.js');
});

const createIssue139Entry = () => ({
    scriptId: '1',
    url: 'file:///C:/app/bundle.js',
    source: 'console.log(1);',
    sourceMap: {
        version: 3,
        sources: ['file:///home/user/src/a.ts'],
        sourcesContent: ['console.log(1);'],
        names: [],
        mappings: 'AAAA'
    },
    functions: [{
        functionName: '',
        isBlockCoverage: true,
        ranges: [{
            startOffset: 0, endOffset: 15, count: 1
        }]
    }]
});

it('generates a report for the original POSIX file URL case (issues #139/#140)', async () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr-issue-139-'));
    try {
        const report = new CoverageReport({
            logging: 'off', outputDir, reports: ['v8']
        });
        const entry = createIssue139Entry();
        if (platform === 'win32') {
            // Both conversion attempts in the original bug throw for this URL.
            const url = entry.sourceMap.sources[0];
            for (const input of [url, decodeURIComponent(url)]) {
                assert.throws(() => fileURLToPath(input), {
                    code: 'ERR_INVALID_FILE_URL_PATH'
                });
            }
        }
        await report.add([entry]);
        const result = await report.generate();
        assert.equal(result.files.length, 1);
        assert.equal(result.files[0].url, 'file:///home/user/src/a.ts');
        assert.equal(path.posix.basename(result.files[0].sourcePath), 'a.ts');
        assert.equal(result.files[0].source, entry.source);
        assert.equal(result.files[0].summary.lines.pct, 100);
        assert.ok(fs.existsSync(result.reportPath));
    } finally {
        fs.rmSync(outputDir, {
            recursive: true, force: true
        });
    }
});

it('lets sourceFilter exclude foreign file URLs while keeping application sources', async () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr-file-url-filter-'));
    try {
        const report = MCR({
            logging: 'off', outputDir, reports: ['v8-json'], sourceFilter: 'src/**'
        });
        const entry = createIssue139Entry();
        const ownSource = 'console.log(2);';
        entry.sourceMap.sourcesContent = [entry.source, entry.source, ownSource];
        entry.sourceMap.sources = [
            'file:///home/nina/Git/OpenSource/theia/vscode/out-editor-src/vs/base/browser/dom.ts',
            'vs/base/browser/dom.ts',
            'src/own.ts'
        ];
        entry.sourceMap.mappings = 'AAAA;ACAA;ACAA';
        entry.source += `\n${entry.source}\n${ownSource}`;
        entry.functions[0].ranges[0].endOffset = entry.source.length;
        await report.add([entry]);
        const result = await report.generate();
        assert.deepEqual(result.files.map((file) => file.sourcePath), ['src/own.ts']);
        assert.equal(result.files[0].source, ownSource);
        assert.ok(fs.existsSync(path.join(outputDir, 'coverage-report.json')));
    } finally {
        fs.rmSync(outputDir, {
            recursive: true, force: true
        });
    }
});

it('lets sourcePath repair special paths using the original URL before filtering', async () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr-source-path-repair-'));
    const originalUrl = 'file:///home/user/project/src/original%ZZ.ts';
    const repairedPath = 'src/original.ts';
    const received = [];
    try {
        const report = MCR({
            logging: 'off',
            outputDir,
            reports: ['v8-json', 'json'],
            sourcePath: (filePath, info) => {
                if (info.url === originalUrl) {
                    received.push(filePath);
                    return repairedPath;
                }
                return filePath;
            },
            sourceFilter: repairedPath,
            outputFilter: repairedPath
        });
        const entry = createIssue139Entry();
        entry.sourceMap.sources = [originalUrl];
        await report.add([entry]);
        const result = await report.generate();
        assert.deepEqual(received, [normalizeSourcePath(originalUrl)]);
        assert.deepEqual(result.files.map((file) => file.sourcePath), [repairedPath]);
        assert.equal(result.files[0].url, originalUrl);
        assert.equal(result.files[0].source, entry.source);
        assert.equal(result.files[0].summary.lines.pct, 100);
        const v8 = JSON.parse(fs.readFileSync(path.join(outputDir, 'coverage-report.json'), 'utf8'));
        assert.deepEqual(v8.files.map((file) => file.sourcePath), [repairedPath]);
        const istanbul = JSON.parse(fs.readFileSync(path.join(outputDir, 'coverage-final.json'), 'utf8'));
        assert.deepEqual(Object.keys(istanbul), [repairedPath]);
    } finally {
        fs.rmSync(outputDir, {
            recursive: true, force: true
        });
    }
});

it('generates coverage for malformed file URLs without failing in ordered filters', async () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr-file-url-malformed-'));
    try {
        const report = MCR({
            logging: 'off',
            outputDir,
            reports: ['v8-json'],
            sourceFilter: {
                '**/excluded/**': false, '**': true
            }
        });
        const entry = createIssue139Entry();
        entry.url = 'file:///bundle%ZZ.js';
        entry.sourceMap.sources = ['file:///original%ZZ.js'];
        await report.add([entry]);
        const result = await report.generate();
        assert.equal(result.files.length, 1);
        assert.equal(result.files[0].url, 'file:///original%ZZ.js');
        assert.equal(path.posix.basename(result.files[0].sourcePath), 'original%ZZ.js');
        assert.equal(result.files[0].source, entry.source);
        assert.ok(fs.existsSync(path.join(outputDir, 'coverage-report.json')));
    } finally {
        fs.rmSync(outputDir, {
            recursive: true, force: true
        });
    }
});
