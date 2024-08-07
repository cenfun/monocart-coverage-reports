const fs = require('fs');
const { Session } = require('inspector');
const { promisify } = require('util');
const { fileURLToPath } = require('url');

const EC = require('eight-colors');

const MCR = require('../');
const checkSnapshot = require('./check-snapshot.js');
const coverageOptions = {
    // logging: 'debug',
    // watermarks: [60, 90],
    reports: ['v8'],

    name: 'My V8 Node ins Coverage Report',
    assetsPath: '../assets',
    // lcov: true,

    outputDir: './docs/node-ins',
    onEnd: function(coverageResults) {
        checkSnapshot(coverageResults);
    }
};


// ==================================================================
// start node.js coverage
const startV8Coverage = async () => {
    const session = new Session();
    session.connect();

    const postSession = promisify(session.post.bind(session));

    await postSession('Profiler.enable');
    await postSession('Profiler.startPreciseCoverage', {
        callCount: true,
        detailed: true
    });
    return postSession;
};

const takeV8Coverage = async (postSession) => {
    const { result } = await postSession('Profiler.takePreciseCoverage');
    return result;
};

const stopV8Coverage = async (postSession) => {
    await postSession('Profiler.stopPreciseCoverage');
    await postSession('Profiler.disable');
};

// ==================================================================

const collectV8Coverage = async (postSession) => {

    let coverageList = await takeV8Coverage(postSession);
    if (!coverageList) {
        return;
    }

    // filter node internal files
    coverageList = coverageList.filter((entry) => entry.url && entry.url.startsWith('file:'));

    // console.log(coverageList);
    coverageList = coverageList.filter((entry) => entry.url.includes('test/mock/node'));

    // attach source content
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
    await MCR(coverageOptions).add(coverageList);


};


const generate = async () => {
    // clean cache first
    await MCR(coverageOptions).cleanCache();

    // =====================================================
    const postSession = await startV8Coverage();

    // =====================================================
    require('./specs/node.test.js');
    // =====================================================

    await collectV8Coverage(postSession);

    await stopV8Coverage(postSession);
    // =====================================================

    const coverageResults = await MCR(coverageOptions).generate();
    console.log('test-node-ins coverage reportPath', EC.magenta(coverageResults.reportPath));

};

generate();
