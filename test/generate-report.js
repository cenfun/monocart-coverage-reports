const fs = require('fs');
const path = require('path');
const { fileURLToPath } = require('url');
const EC = require('eight-colors');

const MCR = require('../');

const generate = async () => {

    const dir = '.temp/v8-coverage-env';


    const coverageOptions = {
        // logging: 'debug',
        // watermarks: [60, 90],
        reports: ['v8', 'v8-json'],

        name: 'My V8 Node env Coverage Report',
        assetsPath: '../assets',
        // lcov: true,

        outputDir: './docs/node-env'
    };

    const coverageReport = MCR(coverageOptions);

    // clean cache before add coverage data
    coverageReport.cleanCache();

    const files = fs.readdirSync(dir);
    for (const filename of files) {
        const content = fs.readFileSync(path.resolve(dir, filename)).toString('utf-8');
        const json = JSON.parse(content);
        let coverageList = json.result;

        // filter node internal files
        coverageList = coverageList.filter((entry) => entry.url && entry.url.startsWith('file:'));

        // console.log(coverageList);
        coverageList = coverageList.filter((entry) => entry.url.includes('test/mock/node'));

        if (!coverageList.length) {
            continue;
        }

        // attached source content
        coverageList.forEach((entry) => {
            const filePath = fileURLToPath(entry.url);
            if (fs.existsSync(filePath)) {
                entry.source = fs.readFileSync(filePath).toString('utf8');
            } else {
                EC.logRed('not found file', filePath);
            }
        });

        await coverageReport.add(coverageList);
    }

    const coverageResults = await coverageReport.generate();
    console.log('test-node-env coverage reportPath', EC.magenta(coverageResults.reportPath));

};

generate();
