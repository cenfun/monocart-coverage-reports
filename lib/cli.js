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
const version = require('../package.json').version;

const cleanDir = (dir) => {
    if (fs.existsSync(dir)) {
        fs.rmSync(dir, {
            recursive: true,
            force: true
        });
    }
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

    // init reports to list with `,`
    const reports = cliOptions.reports;
    if (reports) {
        cliOptions.reports = reports.split(',');
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

            // filter node internal files
            coverageList = coverageList.filter((entry) => entry.url && entry.url.startsWith('file:'));

            if (!coverageList.length) {
                continue;
            }
            // attached source content
            coverageList.forEach((entry) => {
                const filePath = fileURLToPath(entry.url);
                if (fs.existsSync(filePath)) {
                    entry.source = fs.readFileSync(filePath).toString('utf8');
                } else {
                    EC.logRed('not found file', Util.relativePath(filePath));
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

    .option('--outputFile <path>', 'output file for v8 report')
    .option('--inline', 'inline html for v8 report')
    .option('--assetsPath <path>', 'assets path if not inline')

    .option('--lcov', 'generate lcov.info file')

    .action((command, cliOptions) => {
        executeCommand(command, cliOptions);
    });

program.parse();
