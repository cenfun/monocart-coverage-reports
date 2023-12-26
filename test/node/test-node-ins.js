const fs = require('fs');
const inspector = require('inspector');
const { fileURLToPath } = require('url');

const EC = require('eight-colors');

const CoverageReport = require('../../');

const {
    foo, bar, app
} = require('./app.js');


const coverageOptions = {
    // logging: 'debug',
    // watermarks: [60, 90],
    reports: 'v8',

    name: 'My V8 Node Coverage Report',
    assetsPath: '../assets',
    lcov: true,

    outputDir: './docs/v8-node-ins'
};


// ==================================================================
// start node.js coverage
const startV8Coverage = async () => {
    const session = new inspector.Session();
    session.connect();
    await session.post('Profiler.enable');
    await session.post('Profiler.startPreciseCoverage', {
        callCount: true,
        detailed: true
    });
    return session;
};

const takeV8Coverage = (session) => {
    return new Promise((resolve) => {
        session.post('Profiler.takePreciseCoverage', (error, coverage) => {
            if (error) {
                console.log(error);
                resolve();
                return;
            }
            resolve(coverage.result);
        });
    });
};
// ==================================================================

const collectV8Coverage = async (session) => {

    let coverageList = await takeV8Coverage(session);
    if (!coverageList) {
        return;
    }

    // filter node internal files
    coverageList = coverageList.filter((entry) => entry.url && !entry.url.startsWith('node:'));

    // filter node modules
    coverageList = coverageList.filter((entry) => entry.url.indexOf('node_modules') === -1);

    // attached source content
    coverageList.forEach((item) => {
        const filePath = fileURLToPath(item.url);
        if (fs.existsSync(filePath)) {
            item.source = fs.readFileSync(filePath).toString('utf8');
        } else {
            EC.logRed('not found file', filePath);
        }
    });

    // console.log(coverageList);

    console.log('add node.js coverage ...');
    await new CoverageReport(coverageOptions).add(coverageList);


};


const generate = async () => {
    // clean cache first
    await new CoverageReport(coverageOptions).cleanCache();

    // =====================================================
    const session = await startV8Coverage();

    foo();
    bar();

    await collectV8Coverage(session);

    app();

    await collectV8Coverage(session);

    // =====================================================

    console.log('generate v8-node coverage reports ...');

    const coverageResults = await new CoverageReport(coverageOptions).generate();
    console.log('reportPath', EC.magenta(coverageResults.reportPath));
    console.log('v8-node coverage generated', Object.keys(coverageResults.summary).map((k) => [k, coverageResults.summary[k].pct]));

};

generate();
