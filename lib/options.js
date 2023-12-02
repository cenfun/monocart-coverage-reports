module.exports = {

    // report name (V8 only)
    name: 'Coverage Report',

    // output dir and filename (filename V8 only)
    outputFile: './coverage-reports/index.html',

    // logging levels: off, error, info, debug
    logging: 'info',

    // (Boolean) Whether to convert to Istanbul report from V8 list. Defaults to `html-spa` report. (V8 only)
    // (String) Istanbul report name
    // (Array) multiple reports. ["report-name", { name: "report-name", options: {} }, ...]
    toIstanbul: false,

    // (Boolean) Whether to create `lcov.info`.  (for Sonar coverage)
    lcov: false,

    // (Function) A filter function to execute for each element in the V8 list. (V8 only)
    entryFilter: null,

    // (Function) A filter function to execute for each element in the sources which unpacked from the source map. (Sourcemap only)
    sourceFilter: null,

    // source path handler. (Istanbul only)
    sourcePath: null,

    // (usually not used) source finder for Istanbul HTML report. (Istanbul only)
    sourceFinder: null,

    // (Array) watermarks for low/medium/high. Defaults to [50, 80]
    // (Object) Istanbul: { statements:[50,80], functions:[50,80], branches:[50,80], lines:[50,80] }, V8: { bytes:[50,80] }.
    watermarks: [50, 80],

    // (Boolean) Whether inline all scripts to the single HTML file. (V8 only)
    inline: false,

    // assets path if not inline. (V8 only)
    assetsPath: './assets'
};
