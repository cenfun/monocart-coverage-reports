import DefaultMCR, {
    MCR, CoverageReport, getSnapshot, diffSnapshot, CDPClient, WSSession, Util,
    type CoverageReportOptions, type CoverageResults, type V8CoverageEntry
} from 'monocart-coverage-reports';

const options: CoverageReportOptions = { reports: ['v8-json'], logging: 'off' };
const factoryReport: MCR.CoverageReport = MCR(options);
const defaultReport: MCR.CoverageReport = DefaultMCR(options);
const classReport: CoverageReport = new DefaultMCR.CoverageReport(options);
const defaultSnapshot: typeof getSnapshot = DefaultMCR.getSnapshot;
const defaultDiff: typeof diffSnapshot = DefaultMCR.diffSnapshot;
const defaultClient: typeof CDPClient = DefaultMCR.CDPClient;
const defaultSession: typeof WSSession = DefaultMCR.WSSession;
const defaultUtil: typeof Util = DefaultMCR.Util;
void [defaultReport, defaultSnapshot, defaultDiff, defaultClient, defaultSession, defaultUtil];
const entries: V8CoverageEntry[] = [];
void factoryReport.add(entries);
void classReport.loadConfig();
void CDPClient({ port: 9229 });
void WSSession;
Util.initLoggingLevel('off');

async function checkResults() {
    const results = await factoryReport.generate();
    if (results) {
        const typedResults: CoverageResults = results;
        const snapshot = getSnapshot(typedResults);
        diffSnapshot(snapshot, snapshot, {});
    }
}
void checkResults;
