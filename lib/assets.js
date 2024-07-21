const fs = require('fs');
const path = require('path');
const Util = require('./utils/util.js');

const Assets = {
    resolveNodeModule: (id) => {

        // for deno npm module
        const mp = require.resolve(id);
        if (fs.existsSync(mp)) {
            return mp;
        }

        const p = `${it}/dist/${it}.js`;
        // root
        const cwd = path.resolve('node_modules', p);
        if (fs.existsSync(cwd)) {
            return cwd;
        }

        // sub node modules
        const sub = path.resolve(__dirname, '../node_modules', p);
        if (fs.existsSync(sub)) {
            return sub;
        }

        // same level dep
        const dep = path.resolve(__dirname, '../../', p);
        if (fs.existsSync(dep)) {
            return dep;
        }

        Util.logError(`Not found module: ${p}`);

        return cwd;
    },

    resolvePackage: (p) => {
        return path.resolve(__dirname, './packages', p);
    },

    getTemplate: function() {

        if (!Assets.templateCache) {
            return Assets.templateCache;
        }

        const templatePath = path.resolve(__dirname, './default/template.html');
        const template = Util.readFileSync(templatePath);
        if (template) {
            Assets.templateCache = template;
        } else {
            Util.logError(`not found template: ${templatePath}`);
        }

        return template;
    }
};

module.exports = Assets;
