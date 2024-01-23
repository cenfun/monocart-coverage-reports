declare namespace MCR {

    export interface V8CoverageEntry {
        url: string;
        /** css only */
        text?: string;
        /** css only */
        ranges?: any[];
        /** js only */
        scriptId?: string;
        /** js only */
        source?: string;
        /** js only */
        functions?: any[];
    }

    export type Watermarks = [number, number] | {
        functions?: [number, number];
        branches?: [number, number];
        lines?: [number, number];
        /** V8 only */
        bytes?: [number, number];
        /** Istanbul only */
        statements?: [number, number];
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
        ['codecov'] | ["codecov", {
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
        }] |
        [string] | [string, {
            type?: "v8" | "istanbul" | "both";
            [key: string]: any;
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
        /** V8 lines only */
        blank?: number;
        /** V8 lines only */
        comment?: number;
    }

    export interface CoverageSummary {
        functions: MetricsSummary;
        branches: MetricsSummary;
        lines: MetricsSummary;
        /** V8 only */
        bytes?: MetricsSummary;
        /** Istanbul only */
        statements?: MetricsSummary;
    }

    /** V8 only */
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
        /** V8 only */
        url?: string;
        /** V8 only */
        id?: string;
        /** V8 only */
        type?: string;
        /** V8 only */
        source?: string;
        /** V8 only */
        distFile?: string;
        /** V8 only */
        js?: boolean;
        /** V8 only */
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

    export interface CoverageReportOptions {

        /** {string} logging levels: off, error, info, debug */
        logging?: string;

        /** {string} output dir */
        outputDir?: string;

        /** {string|string[]} input raw dir(s) */
        inputDir?: string | string[];

        /** {string} v8 or html for istanbul by default
        * {array} multiple reports with options
        * v8 report or istanbul supported reports */
        reports?: string | ReportDescription[];

        /** {string} Report name. Defaults to "Coverage Report". */
        name?: string;

        /** (V8 only) {string} Output [sub dir/]filename. Defaults to "index.html" */
        outputFile?: string;
        /** (V8 only) {boolean} Inline all scripts to the single HTML file. Defaults to false. */
        inline?: boolean;
        /** (V8 only) {string} Assets path if not inline. Defaults to "./assets" */
        assetsPath?: string;

        /** (V8 only) {function} A filter function to execute for each element in the V8 list. */
        entryFilter?: (entry: V8CoverageEntry) => boolean;

        /** (V8 only) {function} A filter function to execute for each element in the sources which unpacked from the source map. */
        sourceFilter?: (sourcePath: string) => boolean;

        /** (V8 only) {boolean} Enable/Disable ignoring uncovered codes with the special comments: v8 ignore next/next N/start/stop */
        v8Ignore?: boolean;

        /** (Istanbul only) defaultSummarizer, sourceFinder  */

        /** {boolean} Generate lcov.info file, same as lcovonly report. Defaults to false.  */
        lcov?: boolean;

        /** {function} Source path handler. */
        sourcePath?: (filePath: string) => string;

        /** {string|function} Specify the report path, especially when there are multiple reports. Defaults to outputDir/index.html. */
        reportPath?: string | (() => string);

        /** {array} watermarks for low/medium/high. Defaults to [50, 80]
        * {object} { statements:[50,80], functions:[50,80], branches:[50,80], lines:[50,80] }, V8: { bytes:[50,80] } */
        watermarks?: Watermarks;

        /** {function} onEnd hook */
        onEnd?: (reportData: CoverageResults) => Promise<void>;
    }

    export class CoverageReport {

        constructor(options?: CoverageReportOptions);

        /** add coverage data: {array} V8 format, {object} Istanbul format */
        add: (coverageData: any[] | any) => Promise<AddedResults>;

        /** generate report */
        generate: () => Promise<CoverageResults>;

        /** check if cache exists */
        hasCache: () => boolean;

        /** clean previous cache, return `false` if no cache */
        cleanCache: () => boolean;
    }

    export interface McrCliOptions extends CoverageReportOptions {
        /** {function} onStart hook */
        onStart?: (coverageReport: CoverageReport) => Promise<void>;
    }

}

/** create coverage report */
declare function MCR(options?: MCR.CoverageReportOptions): MCR.CoverageReport;

export = MCR;
