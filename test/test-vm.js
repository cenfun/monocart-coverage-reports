const fs = require('fs');
// const path = require('path');
const { Session } = require('inspector');
const { promisify } = require('util');
const { fileURLToPath } = require('url');
const { Script, createContext } = require('vm');

const EC = require('eight-colors');

const MCR = require('../');
const path = require('path');

const coverageOptions = {
    // logging: 'debug',
    // watermarks: [60, 90],
    reports: [
        'v8',
        'raw',
        'console-summary'
    ],

    name: 'My V8 Node VM Coverage Report',
    assetsPath: '../assets',
    // lcov: true,

    outputDir: './docs/vm'
};


// ==================================================================
// start node.js coverage
const startV8Coverage = async () => {
    const session = new Session();
    session.connect();

    const postSession = promisify(session.post.bind(session));

    await postSession('Profiler.enable');
    await postSession('Profiler.startPreciseCoverage', {
        callCount: true,
        detailed: true
    });
    return postSession;
};

const takeV8Coverage = async (postSession) => {
    const { result } = await postSession('Profiler.takePreciseCoverage');
    return result;
};

const stopV8Coverage = async (postSession) => {
    await postSession('Profiler.stopPreciseCoverage');
    await postSession('Profiler.disable');
};

// ==================================================================

const collectV8Coverage = async (postSession, files) => {

    let coverageList = await takeV8Coverage(postSession);
    if (!coverageList) {
        return;
    }

    // console.log(coverageList.map((entry) => entry.url));

    // filter node internal files
    coverageList = coverageList.filter((entry) => entry.url && entry.url.startsWith('file:'));

    coverageList = coverageList.filter((entry) => !entry.url.includes('test-vm.js'));

    // attach source content
    coverageList.forEach((item) => {
        const filePath = fileURLToPath(item.url);
        if (fs.existsSync(filePath)) {
            item.source = fs.readFileSync(filePath).toString('utf8');
        } else {
            // vm source file
            const vmFile = files[filePath];
            if (vmFile) {
                item.source = vmFile.source;
                item.scriptOffset = vmFile.scriptOffset;
            } else {
                EC.logRed('not found file', filePath);
            }
        }
    });

    // console.log(coverageList.map((it) => it.url));
    // add fake case
    const appItem = coverageList.find((it) => it.url.endsWith('app.js'));
    const fakeItem = {
        ... appItem,
        fake: true,
        url: `${appItem.url}.fake`,
        source: appItem.source.replace(/\S/g, '*')
    };

    coverageList.push(fakeItem);

    console.log('add node.js coverage ...');
    await MCR(coverageOptions).add(coverageList);


};

const EVAL_RESULT_VARIABLE = 'Object.<anonymous>';

const wrapCodeInModuleWrapper = (scriptSource) => {
    const args = [
        'module',
        'exports',
        'require',
        '__dirname',
        '__filename'
    ];
    const startStr = `({"${EVAL_RESULT_VARIABLE}":function(${args.join(',')}){`;

    const scriptOffset = startStr.length;

    const endStr = '\n}});';

    return {
        code: startStr + scriptSource + endStr,
        scriptOffset
    };
};

const createScriptFromCode = (scriptSource, filename) => {

    const { code, scriptOffset } = wrapCodeInModuleWrapper(scriptSource);

    const script = new Script(code, {
        columnOffset: scriptOffset,
        filename
    });

    return {
        script,
        scriptOffset
    };
};

const generate = async () => {
    // clean cache first
    await MCR(coverageOptions).cleanCache();

    // =====================================================
    const postSession = await startV8Coverage();

    // import lib after v8 coverage started
    // test lib app
    // var source1 = fs.readFileSync(path.res)

    const sourceCode = `const {
    foo, bar, app
} = require('./test/mock/node/lib/app.js');

if (require.a) {
    console.log("uncovered block a");
}

if (require.s) console.log("statement")

const uncoveredFunction = () => {
    const list = [1, 2, 3, 4, 5];
    list.forEach((v) => {
        console.log(v);
    });
};

const uncoveredArrowFunction = () => require.v

const uncovered = () => {
    // this is uncovered function in vm, test scriptOffset
    console.log("uncovered");
}

foo();
bar();
app();

function fun(a) {
    if (a) {console.log(a);}
}

if (require.b) {
    console.log("uncovered block b");
}

fun();


function useless() {
    console.log("useless");
}

/** the sourcemap url comments here ########################################################################################################### */
`;

    const filename = path.resolve('my-vm-filename.js');
    const { script, scriptOffset } = createScriptFromCode(sourceCode, filename);

    const files = {};
    files[filename] = {
        source: sourceCode,
        scriptOffset
    };


    const context = createContext({});
    const runScript = script.runInContext(context, {

    });

    const compiledFunction = runScript[EVAL_RESULT_VARIABLE];

    compiledFunction.call(
        module.exports,
        // module object
        module,
        // module exports
        module.exports,
        // require implementation
        module.require,
        // __dirname
        module.path,
        // __filename
        module.filename
    );

    // console.log(files);

    await collectV8Coverage(postSession, files);

    await stopV8Coverage(postSession);
    // =====================================================

    console.log('generate v8-node coverage reports ...');

    const coverageResults = await MCR(coverageOptions).generate();
    console.log('v8-node coverage reportPath', EC.magenta(coverageResults.reportPath));

};

generate();
