const MCR = require('../');

const coverageOptions = {
    // logging: 'debug',

    reports: [
        'v8'
    ],

    name: 'My Empty Coverage Report',
    assetsPath: '../assets',

    outputDir: './docs/demo'
};


const generate = async () => {

    const coverageReport = MCR(coverageOptions);
    coverageReport.cleanCache();

    const mockData = [{
        url: 'mock.js',
        source: 'const mock = 1;',
        functions: []
    }];

    await coverageReport.add(mockData);

    await coverageReport.generate();

};

generate();
