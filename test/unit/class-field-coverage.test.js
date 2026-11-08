import { it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encode } from '@jridgewell/sourcemap-codec';
import { createTempRoot } from './unit-utils.js';
import { convertV8List } from '../../lib/converter/converter.js';
import { defaultOptions } from '../../lib/default/options.js';

// Profile in a child process without resetting the test runner's coverage.
const collect = (source) => {
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', `
        import vm from 'node:vm';
        import { Session } from 'node:inspector/promises';
        const session = new Session();
        session.connect();
        try {
            await session.post('Profiler.enable');
            await session.post('Profiler.startPreciseCoverage', { callCount: true, detailed: true });
            vm.runInNewContext(${JSON.stringify(source)}, {
                process: { env: {} }, module: { exports: {} }
            }, { filename: 'field.js' });
            const { result } = await session.post('Profiler.takePreciseCoverage');
            const script = result.find((entry) => entry.url === 'field.js');
            if (!script) throw new Error('Missing class field coverage');
            process.stdout.write(JSON.stringify(script.functions));
            await session.post('Profiler.stopPreciseCoverage');
        } finally {
            session.disconnect();
        }
    `], {
        encoding: 'utf8', timeout: 10000
    });
    assert.ifError(child.error);
    assert.equal(child.status, 0, child.stderr);
    return JSON.parse(child.stdout);
};

const convert = (source, functions = collect(source), extra = {}) => convertV8List([{
    id: 'field', type: 'js', sourcePath: 'field.js', url: 'field.js', source, functions, ... extra
}], {
    ... defaultOptions, logging: 'off'
});

// https://github.com/cenfun/monocart-coverage-reports/issues/142
const source = `// field.js
class Config {
  mode = process.env.MODE || "dev";
  level = process.env.LEVEL ? 1 : 0;
}
module.exports = { Config };
`;

it('does not cover class field branches when no instance is created (issue #142)', async () => {
    const functions = collect(source);
    const initializer = functions.find((item) => item.functionName === '<instance_members_initializer>');
    assert.ok(initializer, 'V8 reports the instance initializer');
    assert.equal(initializer.ranges[0].count, 0);
    const result = await convert(source, functions);
    assert.deepEqual(result.coverageData['field.js'].b, {
        0: [0, 0], 1: [0, 0]
    });
    assert.equal(result.v8DataList[0].summary.branches.covered, 0);
    assert.equal(result.v8DataList[0].summary.branches.total, 4);
    assert.deepEqual(result.coverageData['field.js'].f, {}, 'initializers are not explicit functions');
});

for (const count of [1, 2]) {
    it(`uses the initializer count after ${count} instance(s), not the module count`, async () => {
        const result = await convert(source + 'new Config();\n'.repeat(count));
        assert.deepEqual(result.coverageData['field.js'].b, {
            0: [count, count], 1: [0, count]
        });
    });
}

it('uses initializer block ranges when instances take different branches', async () => {
    const result = await convert(`${source}
new Config();
process.env.MODE = 'prod';
process.env.LEVEL = '1';
new Config();
`);
    assert.deepEqual(result.coverageData['field.js'].b, {
        0: [2, 1], 1: [1, 1]
    });
});

const cases = [{
    name: 'separates static and instance fields, including private fields',
    source: `class Config {
    static mode = process.env.MODE || 'dev';
    #level = process.env.LEVEL ? 1 : 0;
    static #staticLevel = process.env.LEVEL ? 1 : 0;
    mode = process.env.MODE || 'dev';
}`,
    counts: [[1, 1], [0, 0], [0, 1], [0, 0]]
}, {
    name: 'does not cover static fields in a class that is never defined',
    source: `function unused() {
    class Config { static value = true ? 1 : 0; value = true ? 1 : 0; }
}`,
    counts: [[0, 0], [0, 0]]
}, {
    name: 'evaluates computed keys even when instance values never run',
    source: `class Config {
    [process.env.MODE || 'dev'] = process.env.LEVEL ? 1 : 0;
}`,
    counts: [[1, 1], [0, 0]]
}, {
    name: 'matches nested class initializers rather than the enclosing initializer',
    source: `class Outer {
    inner = class Inner {
        [true ? 'value' : 'other'] = true ? 1 : 0;
        static value = true ? 1 : 0;
    };
}
new Outer();
new Outer();`,
    counts: [[2, 0], [0, 0], [2, 0]]
}, {
    name: 'keeps an uncalled arrow-valued field uncovered after instantiation',
    source: `class Config { value = () => process.env.LEVEL ? 1 : 0; }
new Config();`,
    counts: [[0, 0]],
    functionCounts: [0]
}, {
    name: 'keeps explicit functions inside field values on their own execution count',
    source: `class Config { value = (() => process.env.LEVEL ? 1 : 0)(); }
new Config();
new Config();`,
    counts: [[0, 2]]
}, {
    name: 'preserves static block coverage alongside static and instance fields',
    source: `class Config {
    static { globalThis.value = true ? 1 : 0; }
    value = true ? 1 : 0;
    static value = true ? 1 : 0;
}`,
    counts: [[1, 0], [0, 0], [1, 0]]
}];

for (const fixture of cases) {
    it(fixture.name, async () => {
        const result = await convert(fixture.source);
        assert.deepEqual(Object.values(result.coverageData['field.js'].b), fixture.counts);
        if (fixture.functionCounts) {
            assert.deepEqual(Object.values(result.coverageData['field.js'].f), fixture.functionCounts);
        }
    });
}

it('preserves uncovered field branches through a source map', async () => {
    const result = await convert(source, collect(source), {
        sourceMap: {
            version: 3,
            sources: ['original.js'],
            sourcesContent: [source],
            names: [],
            mappings: encode(source.split('\n').map((line, index) => Array.from({
                length: line.length
            }, (_, column) => [column, 0, index, column])))
        }
    });
    assert.deepEqual(result.coverageData['original.js'].b, {
        0: [0, 0], 1: [0, 0]
    });
    assert.equal(result.v8DataList[0].summary.branches.covered, 0);
});

it('writes zero branch hits to CLI JSON and LCOV reports (issue #142)', () => {
    const root = createTempRoot('mcr-class-fields-');
    try {
        // Use CommonJS explicitly: this repository itself is native ESM.
        fs.writeFileSync(path.join(root, 'field.cjs'), source);
        const env = {
            ... process.env
        };
        delete env.NODE_TEST_CONTEXT;
        const child = spawnSync(process.execPath, [
            fileURLToPath(import.meta.resolve('../../lib/cli.js')),
            'node',
            'field.cjs',
            '-r',
            'json,lcovonly',
            '--outputDir',
            'reports'
        ], {
            cwd: root, env, encoding: 'utf8', timeout: 20000
        });
        assert.ifError(child.error);
        assert.equal(child.status, 0, child.stdout + child.stderr);
        const data = JSON.parse(fs.readFileSync(path.join(root, 'reports/coverage-final.json'), 'utf8'));
        const file = Object.values(data).find((item) => item.path.endsWith('field.cjs'));
        assert.ok(file, 'JSON contains the reproduction file');
        assert.deepEqual(file.b, {
            0: [0, 0], 1: [0, 0]
        });
        const lcov = fs.readFileSync(path.join(root, 'reports/lcov.info'), 'utf8');
        const record = lcov.split('end_of_record').find((item) => (/^SF:.*field\.cjs$/m).test(item));
        assert.ok(record, 'LCOV contains the reproduction file');
        assert.match(record, /^BRF:4$/m);
        assert.match(record, /^BRH:0$/m);
        assert.deepEqual(record.match(/^BRDA:.*$/gm), [
            'BRDA:3,0,0,0', 'BRDA:3,0,1,0', 'BRDA:4,1,0,0', 'BRDA:4,1,1,0'
        ]);
    } finally {
        fs.rmSync(root, {
            recursive: true, force: true
        });
    }
});
