const fs = require('fs');
const path = require('path');
const { fileURLToPath } = require('url');
const EC = require('eight-colors');

const CoverageReport = require('../');


const generate = async () => {

    const dir = '.temp/v8-coverage-env';


    const coverageOptions = {
    // logging: 'debug',
    // watermarks: [60, 90],
        reports: 'v8',

        name: 'My V8 Node env Coverage Report',
        assetsPath: '../assets',
        // lcov: true,

        outputDir: './docs/v8-node-env'
    };


    const coverageReport = new CoverageReport(coverageOptions);

    const files = fs.readdirSync(dir);
    for (const filename of files) {
        const content = fs.readFileSync(path.resolve(dir, filename)).toString('utf-8');
        const json = JSON.parse(content);
        let coverageList = json.result;

        // filter node internal files
        coverageList = coverageList.filter((entry) => entry.url && entry.url.startsWith('file:'));

        // console.log(coverageList);

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

    await coverageReport.generate();

    EC.logGreen('done');

};

generate();
