// https://github.com/istanbuljs/istanbuljs/tree/master/packages/istanbul-reports/lib
const { ReportBase } = require('istanbul-lib-report');

module.exports = class CustomReporter extends ReportBase {
    constructor(opts) {
        super();
        console.log('custom istanbul reporter', opts);
        this.file = opts.file || 'custom.text';
    }

    onStart(root, context) {
        this.contentWriter = context.writer.writeFile(this.file);
        this.contentWriter.println('Start of custom coverage report');
    }

    onEnd() {
        this.contentWriter.println('End of custom coverage report');
        this.contentWriter.close();
    }
};
