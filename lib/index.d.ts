
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

export type ReportDescription =
    ['v8'] |
    // html, html-spa, json, lcov and so on
    // https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/istanbul-reports/index.d.ts
    [string] | [string, any];

export type CoverageReportOptions = {

    // (String) logging levels: off, error, info, debug
    logging?: string,

    // (String) output dir
    outputDir?: string,

    // (String) v8 or html for istanbul by default
    // (Array) multiple reports with options
    // v8 report or istanbul supported reports
    reports?: string | ReportDescription[],

    // (String) Report name. Defaults to "Coverage Report".
    name?: string,

    // [V8 only](String) Output [sub dir/]filename. Defaults to "index.html"
    outputFile?: string,

    // [V8 only](Boolean) Whether inline all scripts to the single HTML file. Defaults to false.
    inline?: boolean,

    // [V8 only](String) Assets path if not inline. Defaults to "./assets"
    assetsPath?: string

    // [V8 only](Function) A filter function to execute for each element in the V8 list.
    entryFilter?: (entry: V8CoverageEntry) => boolean,

    // [V8 only](Function) A filter function to execute for each element in the sources which unpacked from the source map.
    sourceFilter?: (sourcePath: string) => boolean,

    // [Istanbul only] defaultSummarizer, sourceFinder

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
    hasCache: () => boolean;

    // clean cache
    cleanCache: () => boolean;

}

export default CoverageReport;

export function createCoverageReport(options?: CoverageReportOptions): CoverageReport;