const { CDPClient, CoverageReport } = require('../');

const github = require('@actions/github');
const core = require('@actions/core');

const getPullRequestChanges = async () => {

    if (!github.context.payload.pull_request) {
        // console.log(Object.keys(github.context));
        return [];
    }

    // console.log('pull_request', github.context.payload.pull_request);

    /**
     * env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
     */

    const octokit = github.getOctokit(process.env.GITHUB_TOKEN);
    const prNumber = github.context.payload.pull_request.number;
    core.startGroup(`Fetching list of changed files for PR#${prNumber} from Github API`);

    const iterator = octokit.paginate.iterator(
        octokit.rest.pulls.listFiles, {
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            pull_number: prNumber,
            per_page: 100
        }
    );

    const files = [];
    for await (const response of iterator) {
        core.info(`Received ${response.data.length} items`);

        for (const file of response.data) {
            core.debug(`[${file.status}] ${file.filename}`);
            if (['added', 'modified'].includes(file.status)) {
                files.push(file.filename);
            }
        }
    }

    return files;
};


const test = async () => {

    const prChanges = await getPullRequestChanges();
    console.log('prChanges', prChanges);

    const filter = (file) => {
        //  console.log(file.sourcePath);

        return true;
    };

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
                maxCols: 30,
                filter
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
                metrics: ['bytes', 'lines'],
                filter
            }]
        ],

        name: 'My PR Coverage Report',
        assetsPath: '../assets',

        outputDir: './docs/pr',

        sourceFilter: {
            '**/src/**': true
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
