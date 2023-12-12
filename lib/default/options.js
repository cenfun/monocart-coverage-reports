module.exports = {

    // (String) logging levels: off, error, info, debug
    logging: 'info',

    // (String) output dir
    outputDir: './coverage-reports',

    // (String) v8 or html for istanbul by default
    // (Array) multiple reports with options
    // v8 report or istanbul supported reports
    // reports: [
    //     ['v8'],
    //     ['html', {
    //         subdir: 'my-sub-dir'
    //     }],
    //     'lcov'
    // ],
    reports: '',

    // (String) Report name. Defaults to "Coverage Report".
    name: 'Coverage Report',

    // [V8 only](String) Output [sub dir/]filename. Defaults to "index.html"
    outputFile: 'index.html',

    // [V8 only](Boolean) Inline all scripts to the single HTML file. Defaults to false.
    inline: false,

    // [V8 only](String) Assets path if not inline. Defaults to "./assets"
    assetsPath: './assets',

    // [V8 only](Function) A filter function to execute for each element in the V8 list.
    // entryFilter: (entry) => {
    //     if (entry.url.indexOf('googleapis.com') !== -1) {
    //         return false;
    //     }
    //     return true;
    // },
    entryFilter: null,

    // [V8 only](Function) A filter function to execute for each element in the sources which unpacked from the source map.
    // sourceFilter: (sourcePath) => sourcePath.search(/src\/.+/) !== -1,
    sourceFilter: null,

    // [Istanbul only] defaultSummarizer, sourceFinder

    // (Boolean) Generate lcov.info file, same as lcovonly report. Defaults to false.
    lcov: false,

    // (Function) Source path handler.
    // sourcePath: (filePath) => `wwwroot/${filePath}`,
    sourcePath: null,

    // (String|Function) Specify the report path, especially when there are multiple reports. Defaults to outputDir/index.html.
    reportPath: null,

    // (Array) watermarks for low/medium/high. Defaults to [50, 80]
    // (Object) Istanbul: { statements:[50,80], functions:[50,80], branches:[50,80], lines:[50,80] }, V8: { bytes:[50,80] }.
    watermarks: [50, 80],

    // (Function) onEnd hook
    // onEnd: async (reportData) => {}
    onEnd: null
};
