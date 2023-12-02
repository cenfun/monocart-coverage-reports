export type IstanbulReportConfig = {
    name: string,
    options: any
}

export type CoverageReportOptions = {

    name?: string,
    outputFile?: string,

    // Whether to convert to Istanbul report
    toIstanbul?: boolean | string | string[] | IstanbulReportConfig[],

    // A filter function to execute for each element in the V8 list.
    entryFilter?: (entry: any) => boolean,

    // A filter function to execute for each element in the sources which unpacked from the source map.
    sourceFilter?: (sourcePath: string) => boolean,

    sourcePath?: (sourcePath: string) => string,

    sourceFinder?: (filePath: string) => string,

    // Whether to create `lcov.info`
    lcov?: boolean,

    watermarks?: [number, number] | {
        statements?: [number, number],
        functions?: [number, number],
        branches?: [number, number],
        lines?: [number, number],
        bytes?: [number, number]
    },

    // Whether inline all scripts to the single HTML file.
    inline?: boolean,

    logging?: string
};

export class CoverageReport {
    constructor(options?: CoverageReportOptions);
    add: (coverageData: any[] | any) => Promise<any>;
    generate: () => Promise<any>;
}

export function createCoverageReport(options?: CoverageReportOptions): CoverageReport;