declare namespace CoverageReport {
    // https://playwright.dev/docs/api/class-coverage
    export type V8CoverageEntry = {
        url: string;
        // css
        text?: string;
        ranges?: any[];
        // js
        scriptId?: string;
        source?: string;
        functions?: any[];
    }

    export type Watermarks = [number, number] | {
        statements?: [number, number];
        functions?: [number, number];
        branches?: [number, number];
        lines?: [number, number];
        bytes?: [number, number];
    }

    export type ReportDescription =
        ['v8'] | ["v8", {
            outputFile?: string;
            inline?: boolean;
            assetsPath?: string;
            metrics?: Array<"bytes" | "functions" | "branches" | "lines">;
        }] |
        ['v8-json'] | ["v8-json", {
            outputFile?: string;
        }] |
        ['console-summary'] | ['console-summary', {
            metrics?: Array<"bytes" | "functions" | "branches" | "lines" | "statements">;
        }] |
        ['clover'] | ['clover', {
            file?: string;
        }] |
        ['cobertura'] | ['cobertura', {
            file?: string;
            timestamp?: string;
            projectRoot?: string;
        }] |
        ['html'] | ['html', {
            subdir?: string;
            verbose?: boolean;
            linkMapper?: any;
            skipEmpty?: boolean;
        }] |
        ['html-spa'] | ['html-spa', {
            subdir?: string;
            verbose?: boolean;
            linkMapper?: any;
            skipEmpty?: boolean;
            metricsToShow?: Array<"lines" | "branches" | "functions" | "statements">;
        }] |
        ['json'] | ['json', {
            file?: string;
        }] |
        ['json-summary'] | ['json-summary', {
            file?: string;
        }] |
        ['lcov'] | ['lcov', {
            file?: string;
            projectRoot?: string;
        }] |
        ['lcovonly'] | ['lcovonly', {
            file?: string;
            projectRoot?: string;
        }] |
        ['none'] |
        ['teamcity'] | ['teamcity', {
            file?: string;
            blockName?: string;
        }] |
        ['text'] | ['text', {
            file?: string;
            maxCols?: number;
            skipEmpty?: boolean;
            skipFull?: boolean;
        }] |
        ['text-lcov'] | ['text-lcov', {
            projectRoot?: string;
        }] |
        ['text-summary'] | ['text-summary', {
            file?: string;
        }];

    export type AddedResults = {
        id: string;
        path: string;
        type: "v8" | "istanbul";
        data: any;
    } | undefined;


    export interface MetricsSummary {
        covered: number;
        uncovered?: number;
        total: number;
        pct: number | "";
        status: "low" | "medium" | "high" | "unknown";
    }

    export interface LinesSummary extends MetricsSummary {
        // v8 only
        blank?: number;
        comment?: number;
    }

    export interface CoverageSummary {
        functions: MetricsSummary;
        branches: MetricsSummary;
        lines: LinesSummary;
        // v8 only
        bytes?: MetricsSummary;
        // istanbul only
        statements?: MetricsSummary;
    }

    export interface CoverageRange {
        start: number;
        end: number;
        count: number;
        ignored?: boolean;
        none?: boolean;
    }
    export interface CoverageFile {
        sourcePath: string;
        summary: CoverageSummary;
        // v8 only
        url?: string;
        id?: string;
        type?: string;
        source?: string;
        distFile?: string;
        js?: boolean;
        data?: {
            bytes: CoverageRange[];
            functions: CoverageRange[];
            branches: CoverageRange[];
        }
    }

    export type CoverageResults = {
        type: "v8" | "istanbul";
        reportPath: string;
        name: string;
        watermarks: Watermarks;
        summary: CoverageSummary;
        files: CoverageFile[];
    } | undefined;

    export type CoverageReportOptions = {

        // (String) logging levels: off, error, info, debug
        logging?: string;

        // (String) output dir
        outputDir?: string;

        // (String) v8 or html for istanbul by default
        // (Array) multiple reports with options
        // v8 report or istanbul supported reports
        reports?: string | ReportDescription[];

        // (String) Report name. Defaults to "Coverage Report".
        name?: string;

        // [V8 only](String) Output [sub dir/]filename. Defaults to "index.html"
        outputFile?: string;
        // [V8 only](Boolean) Inline all scripts to the single HTML file. Defaults to false.
        inline?: boolean;
        // [V8 only](String) Assets path if not inline. Defaults to "./assets"
        assetsPath?: string;

        // [V8 only](Function) A filter function to execute for each element in the V8 list.
        entryFilter?: (entry: V8CoverageEntry) => boolean;

        // [V8 only](Function) A filter function to execute for each element in the sources which unpacked from the source map.
        sourceFilter?: (sourcePath: string) => boolean;

        // [V8 only](Boolean) Enable/Disable ignoring uncovered codes with the special comments: /* v8 ignore next/next N/start/stop */
        v8Ignore?: boolean;

        // [Istanbul only] defaultSummarizer, sourceFinder

        // (Boolean) Generate lcov.info file, same as lcovonly report. Defaults to false.
        lcov?: boolean;

        // (Function) Source path handler.
        sourcePath?: (filePath: string) => string;

        // (String|Function) Specify the report path, especially when there are multiple reports. Defaults to outputDir/index.html.
        reportPath?: string | (() => string);

        // (Array) watermarks for low/medium/high. Defaults to [50, 80]
        // (Object) Istanbul: { statements:[50,80], functions:[50,80], branches:[50,80], lines:[50,80] }, V8: { bytes:[50,80] }.
        watermarks?: Watermarks;

        // (Function) onEnd hook
        onEnd?: (reportData: CoverageResults) => Promise<void>;
    }

    export function createCoverageReport(options?: CoverageReportOptions): CoverageReport;

}
declare class CoverageReport {
    constructor(options?: CoverageReport.CoverageReportOptions);

    // add coverage data: (Array) V8 format, (Object) Istanbul format
    add: (coverageData: any[] | any) => Promise<CoverageReport.AddedResults>;

    // generate report
    generate: () => Promise<CoverageReport.CoverageResults>;

    // check if cache exists
    hasCache: () => boolean;

    // clean cache
    cleanCache: () => boolean;

}

export = CoverageReport;
