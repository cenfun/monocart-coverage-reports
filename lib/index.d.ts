declare namespace MCR {

    export interface V8CoverageEntry {
        url: string;

        /** entry type */
        type?: "js" | "css";

        /** css only */
        text?: string;
        /** css only */
        ranges?: any[];

        /** js only */
        source?: string;
        /** js only */
        scriptId?: string;
        /** js only */
        functions?: any[];

        /** js only */
        sourceMap?: any;
        /** js only */
        scriptOffset?: number;
        /** js only */
        distFile?: string;

        /** empty coverage */
        empty?: boolean;
        /** fake source */
        fake?: boolean;

        [key: string]: any;
    }

    export type Watermarks = [number, number] | {
        /** V8 only */
        bytes?: [number, number];
        statements: [number, number];
        branches?: [number, number];
        functions?: [number, number];
        lines?: [number, number];
    }

    export type ReportDescription =
        ['v8'] | ["v8", {
            /**
             * defaults to `index.html`
             */
            outputFile?: string;
            inline?: boolean;
            assetsPath?: string;
            metrics?: Array<"bytes" | "statements" | "branches" | "functions" | "lines">;
        }] |
        ['v8-json'] | ["v8-json", {
            /**
             * defaults to `coverage-report.json`
             */
            outputFile?: string;
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
            metricsToShow?: Array<"statements" | "branches" | "functions" | "lines">;
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
        ['codecov'] | ["codecov", {
            /**
             * defaults to `codecov.json`
             */
            outputFile?: string;
        }] |
        ['codacy'] | ["codacy", {
            /**
             * defaults to `codacy.json`
             */
            outputFile?: string;
        }] |
        ['console-summary'] | ['console-summary', {
            metrics?: Array<"bytes" | "statements" | "branches" | "functions" | "lines">;
        }] |
        ['console-details'] | ['console-details', {
            maxCols?: number;
            skipPercent?: number;
            metrics?: Array<"bytes" | "statements" | "branches" | "functions" | "lines">;
            filter?: string | {
                [pattern: string]: boolean;
            } | ((file: CoverageFile) => boolean);
        }] |
        ['markdown-summary'] | ['markdown-summary', {
            color: 'unicode' | 'html' | 'tex' | string;
            metrics?: Array<"bytes" | "statements" | "branches" | "functions" | "lines">;
            /**
             * defaults to `coverage-summary.md`
             */
            outputFile?: string;
        }] |
        ['markdown-details'] | ['markdown-details', {
            baseUrl?: string;
            color: 'unicode' | 'html' | 'tex' | string;
            maxCols?: number;
            skipPercent?: number;
            metrics?: Array<"bytes" | "statements" | "branches" | "functions" | "lines">;
            filter?: string | {
                [pattern: string]: boolean;
            } | ((file: CoverageFile) => boolean);
            /**
             * defaults to `coverage-details.md`
             */
            outputFile?: string;
        }] |
        ['raw'] | ['raw', {
            merge?: boolean;
            zip?: boolean;
            outputDir?: string;
        }] |
        [string] | [string, {
            type?: "v8" | "istanbul" | "both" | string;
            [key: string]: any;
        }];

    export type AddedResults = {
        id: string;
        path: string;
        type: "v8" | "istanbul";
        data: any;
    };


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
        /** V8 only */
        bytes?: MetricsSummary;
        statements: MetricsSummary;
        branches: MetricsSummary;
        functions: MetricsSummary;
        lines: MetricsSummary;
    }

    /** V8 only */
    export interface CoverageRange {
        start: number;
        end: number;
        count: number;
        /** ignored by special comment which starts with `v8 ignore` */
        ignored?: boolean;
        /** 
         * branch only, for example: 
         * there is only `if` branch but no `else` branch, then `none` will be true, it shows `else path uncovered`
         */
        none?: boolean;
        /**  function only, function name */
        name?: boolean;
    }

    export interface IgnoredRange {
        start: number;
        end: number;
        /** ignore type: `next` or `range` */
        type: string;
        /** n lines for `next` type */
        n?: number;
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
            bytes?: CoverageRange[];
            statements?: CoverageRange[];
            branches?: CoverageRange[];
            functions?: CoverageRange[];
            ignores?: IgnoredRange[];
            lines?: {
                /** 
                 * key: line number;
                 * number: hits (0 means uncovered);
                 * string: partial covered 
                 */
                [key: string]: number | string;
            };
            extras?: {
                /** 
                 * key: line number;
                 * b: blank;
                 * c: comment;
                 * i: ignored;
                 */
                [key: string]: "b" | "c" | "i";
            }
        }
    }

    export type CoverageResults = {
        type: "v8" | "istanbul";
        reportPath: string;
        version: string;
        name: string;
        watermarks: Watermarks;
        summary: CoverageSummary;
        files: CoverageFile[];
    };

    export type LoggingType = "off" | "error" | "info" | "debug";
    export interface CoverageReportOptions {

        /** {string} logging levels: off, error, info, debug */
        logging?: LoggingType;

        /** {string} Report name. Defaults to "Coverage Report". */
        name?: string;

        /** 
         * 
         * {string} 'v8', 'v8,console-details'
         * 
         * {array} ['v8'], ['v8', ['console-details', { skipPercent: 80 }]]
         * 
         * By default, `v8` for V8 data, `html` for Istanbul data
         */
        reports?: string | (string | ReportDescription)[];

        /** {string} output dir */
        outputDir?: string;

        /** {string|string[]} input raw dir(s) */
        inputDir?: string | string[];

        /** {string} base dir for normalizing the relative source path, defaults to cwd */
        baseDir?: string;

        /** {string} coverage data dir, alternative to method `addFromDir()`, defaults to null */
        dataDir?: string;

        /** (V8 only) 
         * 
         * {string} `minimatch` pattern for entry url; 
         * {object} multiple patterns;
         * {function} A filter function for each entry file in the V8 list.
         */
        entryFilter?: string | {
            [pattern: string]: boolean;
        } | ((entry: V8CoverageEntry) => boolean);

        /** (V8 only) 
         * 
         * {string} `minimatch` pattern for source path; 
         * {object} multiple patterns;
         * {function} A filter function for each source path when the source is unpacked from the source map. 
         */
        sourceFilter?: string | {
            [pattern: string]: boolean;
        } | ((sourcePath: string) => boolean);

        /**
         * The combined filter for entryFilter and sourceFilter
         */
        filter?: string | {
            [pattern: string]: boolean;
        } | ((input: string | V8CoverageEntry) => boolean);

        /** 
         * {function} Source path handler. 
         * 
         * {object} Replace key with value.
         * */
        sourcePath?: ((filePath: string, info: {
            /** the related dist file of current source file */
            distFile?: string;
            [key: string]: any;
        }) => string) | {
            [key: string]: string;
        };


        /** (V8 only) {string} Output [sub dir/]filename. Defaults to "index.html" */
        outputFile?: string;
        /** (V8 only) {boolean} Inline all scripts to the single HTML file. Defaults to false. */
        inline?: boolean;
        /** (V8 only) {string} Assets path if not inline. Defaults to "./assets" */
        assetsPath?: string;

        /** (Istanbul only) defaultSummarizer, sourceFinder  */

        /** {boolean} Generate lcov.info file, same as lcovonly report. Defaults to false.  */
        lcov?: boolean;

        /**
         * options for adding empty coverage for all files
         */
        all?: string | string[] | {
            /** the dir(s) of all files */
            dir: string | string[];

            /** 
             * the file filter is triggered before `sourceFilter`, no need to use it in normal case
             * the filter could return the file type, if true, defaults to css if ".css" otherwise is js 
             * {string} `minimatch` pattern for file path; {object} multiple patterns; {function} A filter function for file path;
            */
            filter?: string | {
                [pattern: string]: "js" | "css" | boolean;
            } | ((filePath: string) => "js" | "css" | boolean);

            /**
             * the file transformer for source and sourceMap
             * some of untested files like .ts/.jsx/.vue can not be parsed to AST directly by acorn
             * so this is the function which can transform the original source to generated source and sourceMap
             */
            transformer?: (entry: any) => Promise<void>;

        };

        /** (V8 only) {boolean} Enable/Disable ignoring uncovered codes with the special comments: v8 ignore next/next N/start/stop */
        v8Ignore?: boolean;

        /** {string|function} Specify the report path, especially when there are multiple reports. Defaults to outputDir/index.html. */
        reportPath?: string | (() => string);

        /** {array} watermarks for low/medium/high. Defaults to [50, 80]
        * {object} { bytes:[50,80], statements:[50,80], branches:[50,80], functions:[50,80], lines:[50,80] } */
        watermarks?: Watermarks;

        /** 
         * {boolean} Indicates whether to clean previous reports in output dir before generating new reports. Defaults to true. 
         * 
         * If true, the API `clean()` will execute automatically.
         * */
        clean?: boolean;

        /**
         * {boolean} Indicates whether to clean previous cache in output dir on start. Defaults to false. 
         * 
         * If true, the API `cleanCache()` will execute automatically.
        */
        cleanCache?: boolean;

        /**
         * {number} gc threshold
         * for example: sets gc to 1024 means that force gc when the memory > 1024M at certain critical stages
         * https://nodejs.org/docs/latest/api/v8.html#v8setflagsfromstringflags
         */
        gc?: number;

        /** (V8 only) {function} onEntry hook */
        onEntry?: (entry: V8CoverageEntry) => Promise<void>;

        /** {function} onEnd hook */
        onEnd?: (coverageResults: CoverageResults | undefined) => Promise<void>;

        [key: string]: any;
    }

    export interface McrCliOptions extends CoverageReportOptions {

        /** (CLI only) {function} onStart hook */
        onStart?: (coverageReport: CoverageReport) => Promise<void>;

        /** (CLI only) {function} onReady hook before adding coverage data.
         * 
         * Sometimes, the child process has not yet finished writing the coverage data, and it needs to wait here.
        */
        onReady?: (coverageReport: CoverageReport, nodeV8CoverageDir: string, subprocess: any) => Promise<void>;

    }

    export class CoverageReport {

        /**
         * @param options coverage report options
         */
        constructor(options?: CoverageReportOptions);

        /** add coverage data
         * 
         * @param coverageData {array} V8 format, {object} Istanbul format */
        add: (coverageData: any[] | any) => Promise<AddedResults | undefined>;

        /**
         * add V8 coverage from a dir
         * @param dir node v8 coverage dir
         */
        addFromDir: (dir: string) => Promise<void>;

        /** generate report */
        generate: () => Promise<CoverageResults | undefined>;

        /** check if cache exists */
        hasCache: () => boolean;

        /** clean previous cache, return `false` if no cache */
        cleanCache: () => boolean;

        /** clean previous reports except cache dir and v8 coverage dir */
        clean: () => void;

        /** get entry filter handler, it can be used to filter the coverage data list before adding it. */
        getEntryFilter: () => ((entry: V8CoverageEntry) => boolean);

        /** load config file. 
         * 
         * @param configFile custom config file path
         * 
         * Supports loading default config file if no custom config specified: 
            'mcr.config.js',
            'mcr.config.cjs',
            'mcr.config.mjs',
            'mcr.config.json',
            'mcr.config.ts'
         */
        loadConfig: (configFile?: string) => Promise<void>;
    }

    //=====================================================================================================

    export interface CoverageSnapshot {
        type: "v8" | "istanbul";
        summary: {
            bytes?: string;
            statements: string;
            branches: string;
            functions: string;
            lines: string;
        },
        files: {
            [sourcePath: string]: {
                bytes?: string;
                statements: string;
                branches: string;
                functions: string;
                lines: string;
                uncoveredLines: string;
                extras: string;
            }
        }
    }

    /** get snapshot from coverage report data */
    export function getSnapshot(coverageResults: CoverageResults): CoverageSnapshot;

    /** diff two snapshots  */
    export function diffSnapshot(oldData: CoverageSnapshot, newData: CoverageSnapshot, diffOptions: {
        skipEqual?: boolean;
        showSummary?: boolean;
        maxCols?: number;
        metrics?: Array<"bytes" | "statements" | "branches" | "functions" | "lines">;
    }): {
        change: boolean;
        results: any[];
        message: string;
    };

    //=====================================================================================================

    export class CoverageClient {
        /** start js coverage */
        startJSCoverage: () => Promise<void>;
        /** stop and return js coverage */
        stopJSCoverage: () => Promise<V8CoverageEntry[]>;

        /** start css coverage */
        startCSSCoverage: () => Promise<void>;
        /** stop and return css coverage */
        stopCSSCoverage: () => Promise<V8CoverageEntry[]>;

        /** start both js and css coverage */
        startCoverage: () => Promise<void>;
        /** stop and return both js and css coverage */
        stopCoverage: () => Promise<V8CoverageEntry[]>;

        /** write the coverage started by NODE_V8_COVERAGE to disk on demand, returns v8 coverage dir */
        writeCoverage: () => Promise<string>;

        /** get istanbul coverage data
         * @param coverageKey defaults to `__coverage__`
         */
        getIstanbulCoverage: (coverageKey?: string) => Promise<any>;

        close: () => Promise<void>
    }

    /** Adapt to the CDPSession of Playwright or Puppeteer */
    export interface CDPSession {
        send: (method: string, params?: any) => Promise<any>;
        on: (type: string, handler: (e: any) => void) => void;
        detach: () => Promise<void>;
    }

    /** custom websocket CDPSession */
    export class WSSession implements CDPSession {
        constructor(ws: any);
        send: (method: string, params?: any) => Promise<any>;
        on: (type: string, handler: (e: any) => void) => void;
        detach: () => Promise<void>;
    }

    export interface CDPOptions {
        /** Adapt to the CDPSession of Playwright or Puppeteer */
        session?: CDPSession;
        /** websocket debugger url */
        url?: string;
        /** debugger port, defaults to 9222 */
        port?: number;
        /** debugger host, defaults to localhost */
        host?: string;
        /** enable https, defaults to false (http) */
        secure?: boolean;
        /** target filter, defaults to first page */
        target?: (targets: any) => any;
        /** websocket options */
        ws?: any;
        /** timeout, defaults to 10 * 1000 */
        timeout?: number;
    }

    export function CDPClient(cdpOptions: CDPOptions): Promise<CoverageClient | undefined>;

    export const Util: {
        initLoggingLevel: (logging: LoggingType) => string;
    };

}

/** create coverage report */
declare function MCR(options?: MCR.CoverageReportOptions): MCR.CoverageReport;

export = MCR;
