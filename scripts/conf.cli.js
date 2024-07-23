// starfall-cli config
// https://github.com/cenfun/starfall-cli

const fs = require('fs');
const path = require('path');

const beforeApp = (item, Util) => {

    const EC = require('eight-colors');

    // using global coverage data
    const dataFile = 'coverage-data.js';
    const jsDataPath = path.resolve(__dirname, `../docs/v8/${dataFile}`);
    // const jsDataPath = path.resolve(__dirname, `../docs/minify/${dataFile}`);

    // typescript repo huge data example 8M
    // const jsDataPath = path.resolve(__dirname, `../../../github/TypeScript/coverage-mcr/${dataFile}`);

    const jsPath = path.resolve(item.buildPath, dataFile);
    const distDir = path.dirname(jsPath);
    if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, {
            recursive: true
        });
    }

    if (fs.existsSync(jsDataPath)) {
        fs.copyFileSync(jsDataPath, jsPath);
        EC.logGreen(`copied a coverage data file: ${dataFile}`);
    } else {
        fs.writeFileSync(jsPath, '');
        EC.logYellow(`created a empty coverage data file: ${dataFile}`);
    }

    if (!item.dependencies.files.includes(jsPath)) {
        item.dependencies.files.unshift(jsPath);
    }

    return 0;
};

const copyVendor = (EC, toPath) => {
    EC.logCyan('copy vendor ...');
    const vendorPath = path.resolve(__dirname, '../packages/vendor/dist/monocart-coverage-vendor.js');
    if (!fs.existsSync(vendorPath)) {
        EC.logRed(`ERROR: Not found dist: ${vendorPath}`);
        return;
    }

    const filename = path.basename(vendorPath);
    const toJs = path.resolve(toPath, filename);
    // console.log(distPath, toJs);
    // node 14 do not support cpSync
    fs.writeFileSync(toJs, fs.readFileSync(vendorPath));
    EC.logGreen(`copied ${toJs}`);

    return toJs;
};

const buildAssets = (EC, toPath) => {
    const { deflateSync } = require('lz-utils');

    const toJs = path.resolve(toPath, 'monocart-coverage-assets.js');

    const assetsList = [{
        id: 'template',
        path: path.resolve(__dirname, '../lib/default/template.html')
    }, {
        id: 'monocart-coverage-app',
        path: require.resolve('monocart-coverage-app')
    }];

    const assetsMap = {};
    for (const item of assetsList) {
        if (!fs.existsSync(item.path)) {
            EC.logRed(`Not found asset: ${item.path}`);
            return;
        }
        const content = fs.readFileSync(item.path).toString('utf-8');
        assetsMap[item.id] = deflateSync(content);
    }

    fs.writeFileSync(toJs, `module.exports = ${JSON.stringify(assetsMap, null, 4)};`);
    EC.logGreen(`created ${toJs}`);

    return toJs;
};

module.exports = {

    precommit: {
        gitHook: false,
        enable: 'lint + build'
    },

    outdate: {
        exclude: [
            'minimatch'
        ]
    },

    build: {

        vendors: ['vendor', 'app'],

        before: (item, Util) => {

            if (item.production) {
                item.devtool = false;
            }

            if (item.name === 'app') {
                return beforeApp(item, Util);
            }

            return 0;
        },

        afterAll: (results, Util) => {

            const production = results.jobList[0].production;
            if (!production) {
                return 0;
            }

            const EC = require('eight-colors');

            // =====================================================================
            // clean packages
            const toPath = path.resolve(__dirname, '../lib/packages');
            if (fs.existsSync(toPath)) {
                fs.rmSync(toPath, {
                    force: true,
                    recursive: true,
                    maxRetries: 10
                });
                EC.logRed(`clean packages: ${toPath}`);
            }

            fs.mkdirSync(toPath, {
                recursive: true
            });

            // =====================================================================
            // copy vendor
            const distList = [];

            const vendorPath = copyVendor(EC, toPath);
            if (!vendorPath) {
                return 1;
            }

            distList.push(vendorPath);

            // =====================================================================
            // build assets

            const assetsPath = buildAssets(EC, toPath);
            if (!assetsPath) {
                return 1;
            }

            distList.push(assetsPath);

            // =====================================================================
            // show packages
            let index = 1;
            const rows = [];

            distList.forEach((distPath) => {

                if (!distPath) {

                    rows.push({
                        innerBorder: true
                    });

                    return;
                }

                const stat = fs.statSync(distPath);

                rows.push({
                    index,
                    name: EC.green(path.basename(distPath)),
                    size: stat.size
                });
                index += 1;

            });

            let total = 0;
            rows.forEach((it) => {
                if (it.size) {
                    total += it.size;
                }
            });

            rows.push({
                innerBorder: true
            });
            rows.push({
                total: true,
                index: '',
                name: 'Total',
                size: total
            });

            EC.log('packages files:');

            const overSizeColors = {
                red: 500 * 1024,
                orange: 200 * 1024
            };

            Util.CG({
                columns: [{
                    id: 'index',
                    name: 'No.',
                    align: 'right'
                }, {
                    id: 'name',
                    name: 'Runtime packages'
                }, {
                    id: 'size',
                    name: 'Size',
                    align: 'right',
                    formatter: function(v, rowData) {
                        const sizeH = Util.BF(v);
                        if (rowData.total) {
                            return sizeH;
                        }
                        if (v > overSizeColors.red) {
                            return Util.addColor(sizeH, 'red');
                        }
                        if (v > overSizeColors.orange) {
                            return Util.addColor(sizeH, 'orange');
                        }
                        return sizeH;
                    }
                }],
                rows: rows
            });

            return 0;
        }

    },

    pack: {
        after: (item, Util) => {

            return 0;
        }
    }

};
