export type IstanbulReportConfig = {
    name: string,
    options: any
}

// https://playwright.dev/docs/api/class-coverage
export type CoverageEntry = {
    url: string,
    // css
    text?: string,
    ranges?: any[]
    // js
    scriptId?: string,
    source?: string,
    functions?: any[]
}

export type CoverageReportOptions = {

    // report name (V8 only)
    name?: string,

    // output dir and filename (filename V8 only)
    outputFile?: string | (() => string),

    // logging levels: off, error, info, debug
    logging?: string,

    // (Boolean) Whether to convert to Istanbul report from V8 list. Defaults to `html-spa` report. (V8 only)
    // (String) Istanbul report name
    // (Array) multiple reports. ["report-name", { name: "report-name", options: {} }, ...]
    toIstanbul?: boolean | string | string[] | IstanbulReportConfig[],

    // (Boolean) Whether to create `lcov.info`.  (for Sonar coverage)
    lcov?: boolean,

    // (Function) A filter function to execute for each element in the V8 list. (V8 only)
    entryFilter?: (entry: CoverageEntry) => boolean,

    // (Function) A filter function to execute for each element in the sources which unpacked from the source map. (Sourcemap only)
    sourceFilter?: (sourcePath: string) => boolean,

    // (Function) source path handler. (Istanbul only)
    sourcePath?: (filePath: string) => string,

    // (Function) source finder for Istanbul HTML report. (Istanbul only)
    sourceFinder?: (filePath: string) => string,

    // (Array) watermarks for low/medium/high. Defaults to [50, 80]
    // (Object) Istanbul: { statements:[50,80], functions:[50,80], branches:[50,80], lines:[50,80] }, V8: { bytes:[50,80] }.
    watermarks?: [number, number] | {
        statements?: [number, number],
        functions?: [number, number],
        branches?: [number, number],
        lines?: [number, number],
        bytes?: [number, number]
    },

    // (Boolean) Whether inline all scripts to the single HTML file. (V8 only)
    inline?: boolean,

    // assets path if not inline. (V8 only)
    assetsPath?: string
};

export class CoverageReport {
    constructor(options?: CoverageReportOptions);
    add: (coverageData: any[] | any) => Promise<any>;
    generate: () => Promise<any>;
}

export default CoverageReport;

export function createCoverageReport(options?: CoverageReportOptions): CoverageReport;