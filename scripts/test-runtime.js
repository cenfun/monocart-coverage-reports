// Run against the checkout by default, or an installed package in a separate
// project. Only built-ins and MCR's production dependencies are required.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const projectDir = path.resolve(process.argv[2] || process.cwd());
const projectRequire = createRequire(path.join(projectDir, 'package.json'));
const pkg = projectRequire('monocart-coverage-reports/package.json');
const packageDir = path.dirname(projectRequire.resolve('monocart-coverage-reports/package.json'));
const { MCR } = await import(pathToFileURL(projectRequire.resolve('monocart-coverage-reports')));
const cli = path.resolve(packageDir, pkg.bin.mcr);
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcr-runtime-'));

const runNode = (args, cwd = root) => {
    const result = spawnSync(process.execPath, args, {
        cwd, encoding: 'utf8', timeout: 30000
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    return result.stdout.trim();
};
const assertReport = (dir) => {
    const report = JSON.parse(fs.readFileSync(path.join(dir, 'coverage-report.json'), 'utf8'));
    assert.equal(report.files.length, 1);
    assert.ok(report.files[0].sourcePath.endsWith('subject.cjs'));
};

const main = async () => {
    assert.equal(pkg.engines.node, '>=22.15.0');
    assert.equal(runNode([cli, '--version']), pkg.version);
    runNode(['--input-type=module', '-e', `
        import { MCR, CoverageReport } from 'monocart-coverage-reports';
        if (!(MCR() instanceof CoverageReport)) throw new Error('Invalid ESM exports');
    `], projectDir);

    fs.mkdirSync(path.join(root, 'src'));
    fs.mkdirSync(path.join(root, 'test'));
    fs.writeFileSync(path.join(root, 'src/subject.cjs'), 'module.exports = (v) => v ? 42 : 0;\n');
    fs.writeFileSync(path.join(root, 'run.cjs'), "require('./src/subject.cjs')(true);\n");
    fs.writeFileSync(path.join(root, 'test/subject.test.cjs'), `
        const { test } = require('node:test');
        const assert = require('node:assert/strict');
        const subject = require('../src/subject.cjs');
        test('subject', () => assert.equal(subject(true), 42));
    `);
    fs.writeFileSync(path.join(root, 'mcr.config.cjs'), `module.exports = {
        test: 'test/*.test.cjs',
        outputDir: 'reports',
        reports: ['v8-json', 'raw'],
        entryFilter: (entry) => entry.url.endsWith('/src/subject.cjs')
    };`);

    const apiDir = path.join(root, 'api');
    const report = await MCR({
        logging: 'off',
        all: path.join(root, 'src'),
        outputDir: apiDir,
        reports: ['v8-json']
    }).generate();
    assert.ok(report);
    assertReport(apiDir);

    runNode([cli, JSON.stringify(process.execPath), 'run.cjs', '-o', 'command']);
    assertReport(path.join(root, 'command'));
    runNode([cli, 'test']);
    assertReport(path.join(root, 'reports'));
    runNode([cli, 'merge', '-i', 'reports/raw', '-o', 'merged', '-r', 'v8-json']);
    assertReport(path.join(root, 'merged'));
    console.log(`MCR ${pkg.version} runtime smoke tests passed on Node.js ${process.versions.node}`);
};

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}).finally(() => {
    fs.rmSync(root, {
        recursive: true, force: true
    });
});
