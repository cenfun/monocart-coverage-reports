const fs = require('fs');
const path = require('path');

module.exports = class CustomV8Reporter {
    constructor(options, globalOptions) {
        this.outputDir = globalOptions.outputDir;
        this.outputFile = options.outputFile || 'custom.json';
        console.log('custom v8 reporter', options);
    }

    generate(reportData) {

        console.log('generate custom v8 report ...', reportData.name);

        fs.writeFileSync(path.resolve(this.outputDir, this.outputFile), JSON.stringify({
            name: reportData.name
        }));

    }

};
