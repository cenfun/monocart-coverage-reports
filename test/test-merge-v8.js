const fs = require('fs');
const MCR = require('../');
const coverageOptions = {
    // logging: 'debug',
    reports: [
        ['v8', {
            metrics: ['lines']
        }],
        ['raw', {
            // zip: true,
            merge: true
        }]
    ],

    cleanCache: false,
    // clean: false,
    inputDir: './.temp/code-coverage/raw',

    filter: {
        '**/webpack/**': false,
        '**/playground/$*': false,
        '**/node_modules/**': false,
        '**/*': true
    },

    name: 'My Merge V8 Coverage Report',
    outputDir: './.temp/merge-v8',
    onEnd: function(coverageResults) {
        console.log('end');
    }
};

const generate = async () => {

    fs.mkdirSync('./.temp/merge-v8/.cache');
    fs.readdirSync('./.temp/code-coverage/raw').forEach((n) => {
        fs.copyFileSync(`./.temp/code-coverage/raw/${n}`, `./.temp/merge-v8/.cache/${n}`);
    });

    const mcr = MCR(coverageOptions);
    await mcr.generate();


};

generate();
