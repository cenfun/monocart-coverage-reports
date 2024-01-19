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

const executeCommand = (command, options) => {
    console.log('Execute:', EC.cyan(command));
    // console.log(options);

    const nodeV8CoverageDir = path.resolve(options.outputDir, '.v8-coverage');
    process.env.NODE_V8_COVERAGE = nodeV8CoverageDir;

    cleanDir(nodeV8CoverageDir);

    // console.log('nodeV8CoverageDir', nodeV8CoverageDir);

    foregroundChild(command, {
        shell: true
    }, async () => {

        if (!fs.existsSync(nodeV8CoverageDir)) {
            EC.logRed(`Not found coverage data: ${Util.relativePath(nodeV8CoverageDir)}`);
            return 1;
        }

        const coverageReport = MCR(options);
        coverageReport.cleanCache();

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

const initOptions = (cliOptions) => {
    const options = {
        ... defaultOptions
    };

    const configPath = cliOptions.config;
    if (configPath) {
        if (fs.existsSync(configPath)) {
            const config = require(configPath);
            Object.assign(options, config);
        } else {
            EC.logRed(`Not found config: ${configPath}`);
        }
    }

    Object.keys(cliOptions).forEach((k) => {
        if (Util.hasOwn(options, k)) {
            options[k] = cliOptions[k];
        }
    });

    return options;
};

program
    .description('CLI to generate coverage reports')
    .version(version)
    .argument('<command>', 'command to execute')
    .option('-c, --config <path>')
    .option('-o, --outputDir <dir>')
    .action((command, cliOptions) => {
        const options = initOptions(cliOptions);
        executeCommand(command, options);
    });

program.parse();
