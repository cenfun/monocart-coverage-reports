const { CDPClient, CoverageReport } = require('../');

const github = require('@actions/github');
const core = require('@actions/core');

const getPullRequestChanges = async () => {

    if (!github.context.payload.pull_request) {
        // console.log(Object.keys(github.context));
        return [];
    }

    console.log('pull_request', github.context.payload.pull_request);

    // This should be a token with access to your repository scoped in as a secret.
    // The YML workflow will need to set myToken with the GitHub Secret Token
    // myToken: ${{ secrets.GITHUB_TOKEN }}
    // https://help.github.com/en/actions/automating-your-workflow-with-github-actions/authenticating-with-the-github_token#about-the-github_token-secret
    const myToken = core.getInput('myToken');
    console.log('myToken', `${myToken}`.length);

    // const octokit = github.getOctokit(myToken);

    // // You can also pass in additional options as a second parameter to getOctokit
    // // const octokit = github.getOctokit(myToken, {userAgent: "MyActionVersion1"});

    // const { data } = await octokit.rest.pulls.get({
    //     owner: 'octokit',
    //     repo: 'rest.js',
    //     pull_number: 123,
    //     mediaType: {
    //         format: 'diff'
    //     }
    // });

    // return data;
};


const test = async () => {

    const prChanges = await getPullRequestChanges();
    console.log('prChanges', prChanges);

    const coverageOptions = {
        // logging: 'debug',
        cleanCache: true,
        reports: [
            ['console-summary', {
                // metrics: ['bytes', 'functions', 'lines']
            }],
            ['console-details', {
                // skipPercent: 100,
                metrics: ['bytes', 'lines'],
                maxCols: 30
            }],
            ['v8', {
                // metrics: ['bytes', 'functions', 'lines']
            }],
            ['markdown-summary', {
                // color: 'html'
            }],
            ['markdown-details', {
                // color: 'Tex',
                baseUrl: 'https://cenfun.github.io/monocart-coverage-reports/pr/#page=',
                metrics: ['bytes', 'lines']
            }]
        ],

        name: 'My PR Coverage Report',
        assetsPath: '../assets',

        outputDir: './docs/pr',

        sourceFilter: {
            '**/src/**': true
        },

        onEnd: (coverageResults) => {

        }
    };

    const mcr = new CoverageReport(coverageOptions);

    const client = await CDPClient({
        port: 9230
    });

    await client.startJSCoverage();

    // =====================================================
    require('./specs/node.test.js');
    // =====================================================

    const coverageData = await client.stopJSCoverage();
    // console.log('check source', coverageList.filter((it) => !it.source).map((it) => [it.scriptId, it.url]));
    // console.log(coverageList.map((it) => it.url));

    await client.close();

    if (coverageData) {
        // filter node internal files
        let coverageList = coverageData.filter((entry) => entry.url && entry.url.startsWith('file:'));

        // console.log(coverageList);
        coverageList = coverageList.filter((entry) => entry.url.includes('test/mock/node'));

        await mcr.add(coverageList);
    }

    await mcr.generate();
};

test();
