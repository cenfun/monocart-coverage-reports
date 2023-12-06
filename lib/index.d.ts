
// https://playwright.dev/docs/api/class-coverage
export type V8CoverageEntry = {
    url: string,
    // css
    text?: string,
    ranges?: any[]
    // js
    scriptId?: string,
    source?: string,
    functions?: any[]
}

export type V8ReportOptions = {
    // report name. Defaults to "Coverage Report".
    name?: string,

    // output dir and filename. Defaults to "index.html"
    outputFile?: string,

    // Whether inline all scripts to the single HTML file. Defaults to false.
    inline?: boolean,

    // assets path if not inline. Defaults to "./assets"
    assetsPath?: string
}

export type ReportDescription =
    ['v8'] | ['v8', V8ReportOptions] |
    // html, html-spa, json, lcov and so on
    // https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/istanbul-reports/index.d.ts
    [string] | [string, any];

export type CoverageReportOptions = {

    // logging levels: off, error, info, debug
    logging?: string,

    outputDir?: string,

    // v8 report or istanbul supported reports
    reports?: string | ReportDescription[],

    // (Function) A filter function to execute for each element in the V8 list. (V8 only)
    entryFilter?: (entry: V8CoverageEntry) => boolean,

    // (Function) A filter function to execute for each element in the sources which unpacked from the source map. (V8 only)
    sourceFilter?: (sourcePath: string) => boolean,

    // (Function) source path handler.
    sourcePath?: (filePath: string) => string,

    // (Array) watermarks for low/medium/high. Defaults to [50, 80]
    // (Object) Istanbul: { statements:[50,80], functions:[50,80], branches:[50,80], lines:[50,80] }, V8: { bytes:[50,80] }.
    watermarks?: [number, number] | {
        statements?: [number, number],
        functions?: [number, number],
        branches?: [number, number],
        lines?: [number, number],
        bytes?: [number, number]
    }
};

export class CoverageReport {
    constructor(options?: CoverageReportOptions);

    // add coverage data: (Array) V8 format, (Object) Istanbul format
    add: (coverageData: any[] | any) => Promise<any>;

    // generate report
    generate: () => Promise<any>;

    // check if cache exists
    hasCache: () => Promise<boolean>;

    // clean cache
    cleanCache: () => Promise<void>;

}

export default CoverageReport;

export function createCoverageReport(options?: CoverageReportOptions): CoverageReport;