import DefaultMCR, {
    MCR, CoverageReport, CoverageClient, getSnapshot, diffSnapshot, CDPClient, WSSession, Util,
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
// named export keeps both the type and the constructor value
const clientConstructor: typeof MCR.CoverageClient = CoverageClient;
const defaultClientConstructor: typeof CoverageClient = DefaultMCR.CoverageClient;
void [defaultReport, defaultSnapshot, defaultDiff, defaultClient, defaultSession, defaultUtil, clientConstructor, defaultClientConstructor];
const entries: V8CoverageEntry[] = [];
void factoryReport.add(entries);
void classReport.loadConfig();
void CDPClient({ port: 9229, timeout: 10000, requestTimeout: 30000 });
const createSession = (ws: any) => new WSSession(ws, { timeout: 0 });
void createSession;
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
