module.exports = {

    // {string} logging levels: off, error, info, debug
    logging: 'info',

    // {string} Report name. Defaults to "Coverage Report".
    name: 'Coverage Report',

    // {string} v8 or html for istanbul by default
    // {array} multiple reports with options
    // v8 report or istanbul supported reports
    // reports: [
    //     ['v8'],
    //     ['html', {
    //         subdir: 'my-sub-dir'
    //     }],
    //     'lcov'
    // ],
    reports: '',

    // {string} output dir
    outputDir: './coverage-reports',

    // {string|string[]} input raw dir(s)
    inputDir: null,

    // {string} base dir for normalizing the relative source path, defaults to cwd
    baseDir: null,

    // {string} coverage data dir, alternative to method `addFromDir()`, defaults to null
    dataDir: null,

    // (V8 only) {function} A filter function to execute for each element in the V8 list.
    // entryFilter: (entry) => {
    //     if (entry.url.indexOf('googleapis.com') !== -1) {
    //         return false;
    //     }
    //     return true;
    // },
    entryFilter: null,

    // (V8 only) {function} A filter function to execute for each element in the sources which unpacked from the source map.
    // sourceFilter: (sourcePath) => sourcePath.search(/src\/.+/) !== -1,
    sourceFilter: null,

    // The combined filter for entryFilter and sourceFilter
    filter: null,

    // {function} Source path handler.
    // sourcePath: (filePath) => `wwwroot/${filePath}`,
    sourcePath: null,

    // (V8 only) {string} Output [sub dir/]filename. Defaults to "index.html"
    outputFile: 'index.html',

    // (V8 only) {boolean} Inline all scripts to the single HTML file. Defaults to false.
    inline: false,

    // (V8 only) {string} Assets path if not inline. Defaults to "./assets"
    assetsPath: './assets',

    // (Istanbul only) defaultSummarizer, sourceFinder

    // {boolean} Generate lcov.info file, same as lcovonly report. Defaults to false.
    lcov: false,

    // options for adding empty coverage for all files
    // all: {
    //     dir: ['src'],
    //     filter: (sourcePath) => true
    // },
    all: null,

    // (V8 only) {boolean} Enable/Disable ignoring uncovered codes with the special comments: v8 ignore next/next N/start/stop
    v8Ignore: true,

    // {string|function} Specify the report path, especially when there are multiple reports. Defaults to outputDir/index.html.
    reportPath: null,

    // {array} watermarks for low/medium/high. Defaults to [50, 80]
    // {object} { bytes:[50,80], statements:[50,80], branches:[50,80], functions:[50,80], lines:[50,80] }
    watermarks: [50, 80],

    // {boolean} Indicates whether to clean previous files in output dir before generating report. Defaults to true.
    clean: true,

    // {boolean} Indicates whether to clean previous cache in output dir before generating report. Defaults to false.
    cleanCache: false,

    // {function} onEntry hook
    // onEntry: async (entry) => {}
    onEntry: null,

    // {function} onEnd hook
    // onEnd: async (reportData) => {}
    onEnd: null
};
