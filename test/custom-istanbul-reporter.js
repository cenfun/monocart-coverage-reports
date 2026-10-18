// https://github.com/istanbuljs/istanbuljs/tree/master/packages/istanbul-reports/lib
import istanbulLibReport from 'istanbul-lib-report';

export default class CustomReporter extends istanbulLibReport.ReportBase {
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
}
