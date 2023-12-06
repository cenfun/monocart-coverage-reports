const defaultOptions = {

    // logging levels: off, error, info, debug
    logging: 'info',

    // (String)
    outputDir: './coverage-reports',

    // (String) v8 or html for istanbul by default
    // (Array) multiple reports with options
    // reports: [
    //     ['v8', {
    //         // report name (V8 only)
    //         name: 'Coverage Report',
    //         outputFile: "index.html",
    //         // (Boolean) Whether inline all scripts to the single HTML file. (V8 only)
    //         inline: false,
    //         // assets path if not inline. (V8 only)
    //         assetsPath: './assets'
    //     }],
    //     ['html', {
    //         subdir: 'my-sub-dir'
    //     }],
    //     'lcov'
    // ],
    reports: '',

    // (Function) A filter function to execute for each element in the V8 list. (V8 only)
    // entryFilter: (entry) => {
    //     if (entry.url.indexOf('googleapis.com') !== -1) {
    //         return false;
    //     }
    //     return true;
    // },
    entryFilter: null,

    // (Function) A filter function to execute for each element in the sources which unpacked from the source map. (V8 only)
    // sourceFilter: (sourcePath) => sourcePath.search(/src\/.+/) !== -1,
    sourceFilter: null,

    // (Function) source path handler.
    // sourcePath: (filePath) => `wwwroot/${filePath}`,
    sourcePath: null,

    // (Array) watermarks for low/medium/high. Defaults to [50, 80]
    // (Object) Istanbul: { statements:[50,80], functions:[50,80], branches:[50,80], lines:[50,80] }, V8: { bytes:[50,80] }.
    watermarks: [50, 80]
};

const defaultV8ReportOptions = {
    name: 'Coverage Report',
    outputFile: 'index.html',
    inline: false,
    assetsPath: './assets'
};


module.exports = {
    defaultOptions,
    defaultV8ReportOptions
};
