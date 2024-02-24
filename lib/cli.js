#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const EC = require('eight-colors');
const { fileURLToPath } = require('url');

const {
    foregroundChild,
    program
} = require('./packages/monocart-coverage-vendor.js');

const MCR = require('./index.js');
const Util = require('./utils/util.js');
const defaultOptions = require('./default/options.js');
const { resolveSourceMap } = require('./converter/collect-source-maps.js');

const version = require('../package.json').version;

const cleanDir = (dir) => {
    Util.rmSync(dir);
};

const initOptions = (cliOptions) => {
    // merge all cli options
    const configPath = cliOptions.config;
    if (configPath) {
        if (fs.existsSync(configPath)) {
            const config = require(path.resolve(configPath));
            Object.assign(cliOptions, config);
        } else {
            EC.logRed(`Not found config: ${configPath}`);
        }
    }

    // report options
    const options = {
        ... defaultOptions
    };
    Object.keys(cliOptions).forEach((k) => {
        if (Util.hasOwn(options, k)) {
            options[k] = cliOptions[k];
        }
    });

    return options;
};

const executeCommand = async (command, cliOptions) => {

    const options = initOptions(cliOptions);

    console.log('Execute:', EC.cyan(command));
    // console.log(options);

    const nodeV8CoverageDir = path.resolve(options.outputDir, '.v8-coverage');
    process.env.NODE_V8_COVERAGE = nodeV8CoverageDir;

    cleanDir(nodeV8CoverageDir);

    // console.log('nodeV8CoverageDir', nodeV8CoverageDir);

    const coverageReport = MCR(options);
    coverageReport.cleanCache();

    // on start hook
    const onStart = cliOptions.onStart;
    if (typeof onStart === 'function') {
        await onStart(coverageReport);
    }

    foregroundChild(command, {
        shell: true
    }, async () => {

        if (!fs.existsSync(nodeV8CoverageDir)) {
            EC.logRed(`Not found coverage data: ${Util.relativePath(nodeV8CoverageDir)}`);
            return 1;
        }

        const files = fs.readdirSync(nodeV8CoverageDir);
        for (const filename of files) {
            const content = fs.readFileSync(path.resolve(nodeV8CoverageDir, filename)).toString('utf-8');
            const json = JSON.parse(content);
            let coverageList = json.result;

            // for node sourcemap
            const sourceMapCache = json['source-map-cache'] || {};

            // filter node internal files
            coverageList = coverageList.filter((entry) => entry.url && entry.url.startsWith('file:'));

            if (!coverageList.length) {
                continue;
            }
            // attached source content
            coverageList.forEach((entry) => {
                // source content
                const filePath = fileURLToPath(entry.url);
                if (fs.existsSync(filePath)) {
                    entry.source = fs.readFileSync(filePath).toString('utf8');
                }

                // sourcemap data
                const sourcemapData = sourceMapCache[entry.url];
                if (sourcemapData) {
                    if (sourcemapData.data) {
                        entry.sourceMap = resolveSourceMap(sourcemapData.data, entry.url);
                    }
                    // sourcemapData.lineLengths just for fake source file (can not parse to AST)
                    if (!entry.source && sourcemapData.lineLengths) {
                        // get runtime code with ts-node
                        let source = '';
                        sourcemapData.lineLengths.forEach((length) => {
                            source += `${''.padEnd(length, '*')}\n`;
                        });
                        entry.fake = true;
                        entry.source = source;
                    }
                }
            });

            await coverageReport.add(coverageList);
        }

        await coverageReport.generate();

        // remove nodeV8CoverageDir
        if (options.logging !== 'debug') {
            cleanDir(nodeV8CoverageDir);
        }

        return process.exitCode;
    });

};

program
    .name('mcr')
    .description('CLI to generate coverage reports')
    .version(version)
    .argument('<command>', 'command to execute')
    .option('-c, --config <path>', 'config path for options')
    .option('-o, --outputDir <dir>', 'output dir for reports')
    .option('-r, --reports <name[,name]>', 'coverage reports to use')
    .option('-n, --name <name>', 'report name for title')
    .option('-i, --inputDir <dir>', 'input dir for merging raw files')

    .option('--entryFilter <pattern>', 'entry url filter')
    .option('--sourceFilter <pattern>', 'source path filter')

    .option('--outputFile <path>', 'output file for v8 report')
    .option('--inline', 'inline html for v8 report')
    .option('--assetsPath <path>', 'assets path if not inline')

    .option('--lcov', 'generate lcov.info file')

    .action((command, cliOptions) => {
        executeCommand(command, cliOptions);
    });

program.parse();
