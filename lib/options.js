module.exports = {

    // report name
    name: 'Coverage Report',

    // output dir and filename
    outputFile: './coverage-reports/index.html',

    // logging levels: off, error, info, debug
    logging: 'info',

    // (Boolean) Whether to convert to Istanbul report from V8 list. Defaults to `html-spa` report
    // (String) Istanbul report name
    // (Array) multiple reports. ["report-name", { name: "report-name", options: {} }, ...]
    toIstanbul: false,

    // (Boolean) Whether to create `lcov.info`
    lcov: false,

    // (Function) A filter function to execute for each element in the V8 list.
    entryFilter: null,

    // (Function) A filter function to execute for each element in the sources which unpacked from the source map.
    sourceFilter: null,

    // source path handler. (Istanbul only)
    sourcePath: null,

    // (usually not used) source finder for Istanbul HTML report. (Istanbul only)
    sourceFinder: null,

    // (Array) watermarks for low/medium/high. Defaults to [50, 80]
    // (Object) Istanbul: { statements:[50,80], functions:[50,80], branches:[50,80], lines:[50,80] }, V8: { bytes:[50,80] }.
    watermarks: [50, 80],

    // (Boolean) Whether inline all scripts to the single HTML file. (V8 only)
    inline: false
};
