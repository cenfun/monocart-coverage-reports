const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const MCR = require('../');

const github = require('@actions/github');
const core = require('@actions/core');

const getPR = async () => {
    // This should be a token with access to your repository scoped in as a secret.
    // The YML workflow will need to set myToken with the GitHub Secret Token
    // myToken: ${{ secrets.GITHUB_TOKEN }}
    // https://help.github.com/en/actions/automating-your-workflow-with-github-actions/authenticating-with-the-github_token#about-the-github_token-secret
    const myToken = core.getInput('myToken');

    const octokit = github.getOctokit(myToken);

    // You can also pass in additional options as a second parameter to getOctokit
    // const octokit = github.getOctokit(myToken, {userAgent: "MyActionVersion1"});

    const { data } = await octokit.rest.pulls.get({
        owner: 'octokit',
        repo: 'rest.js',
        pull_number: 123,
        mediaType: {
            format: 'diff'
        }
    });

    return data;
};


const test = async () => {

    const pr = await getPR();
    console.log(pr);

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
                baseUrl: 'https://cenfun.github.io/monocart-coverage-reports/v8/#page=',
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

    const mcr = await MCR(coverageOptions);

    const browser = await chromium.launch();
    const page = await browser.newPage();

    await Promise.all([
        page.coverage.startJSCoverage({
            resetOnNavigation: false
        }),
        page.coverage.startCSSCoverage({
            resetOnNavigation: false
        })
    ]);

    const fileList = [
        './test/mock/v8/index.html',
        './test/mock/v8/dist/coverage-v8.js',
        './test/mock/css/style.css'
    ];
    for (const filePath of fileList) {
        const content = fs.readFileSync(filePath).toString('utf-8');
        const extname = path.extname(filePath);
        if (extname === '.html') {
            await page.setContent(content);
        } else if (extname === '.css') {
            await page.addStyleTag({
                content: `${content}\n/*# sourceURL=${filePath} */`
            });
        } else {
            await page.addScriptTag({
                content: `${content}\n//# sourceURL=${filePath}`
            });
        }
    }

    await new Promise((resolve) => {
        setTimeout(resolve, 500);
    });

    const [jsCoverage, cssCoverage] = await Promise.all([
        page.coverage.stopJSCoverage(),
        page.coverage.stopCSSCoverage()
    ]);

    await browser.close();

    const coverageList = [... jsCoverage, ... cssCoverage];

    await mcr.add(coverageList);
    await mcr.generate();
};

test();
