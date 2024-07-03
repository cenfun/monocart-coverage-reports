const istanbulLibReport = require('istanbul-lib-report');

const ReportBase = istanbulLibReport.ReportBase;
class IstanbulSummary extends ReportBase {

    onStart(root, context) {
        this.context = context;
        this.summary = {};
        this.files = [];
    }

    addStatus(data) {
        Object.keys(data).forEach((k) => {
            const item = data[k];
            // low, medium, high, unknown
            item.status = this.context.classForPercent(k, item.pct);
        });
    }

    onSummary(node) {
        if (!node.isRoot()) {
            return;
        }
        this.summary = node.getCoverageSummary().data;
        this.addStatus(this.summary);
    }

    onDetail(node) {
        const fileSummary = node.getCoverageSummary().data;
        this.addStatus(fileSummary);
        const sourcePath = node.getQualifiedName();

        const fileCoverage = node.getFileCoverage();
        const lines = fileCoverage.getLineCoverage();
        // no extras for istanbul
        const extras = {};

        this.files.push({
            sourcePath,
            summary: fileSummary,
            data: {
                lines,
                extras
            }
        });
    }

    onEnd() {
        // console.log('onEnd');
    }

    getReport() {

        // remove branchesTrue
        delete this.summary.branchesTrue;

        // add uncovered
        Object.keys(this.summary).forEach((id) => {
            const item = this.summary[id];
            item.uncovered = item.total - item.covered;
        });

        // console.log(this.summary);

        return {
            summary: this.summary,
            files: this.files
        };
    }
}


module.exports = IstanbulSummary;
