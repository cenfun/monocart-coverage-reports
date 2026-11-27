// Keep these in the order of docs/pages/frameworks-and-tools.md.
export const frameworkRepos = [
    ['Node.js test runner', 'nodejs/node', 'node-test-runner', 'https://nodejs.org/docs/latest/api/test.html'],
    ['Playwright', 'microsoft/playwright', 'playwright'],
    ['Puppeteer', 'puppeteer/puppeteer', 'puppeteer'],
    ['Vitest', 'vitest-dev/vitest', 'vitest'],
    ['Jest', 'jestjs/jest', 'jest'],
    ['TypeScript', 'microsoft/TypeScript', 'typescript'],
    ['VS Code', 'microsoft/vscode', 'vscode'],
    ['Cypress', 'cypress-io/cypress', 'cypress'],
    ['WebdriverIO', 'webdriverio/webdriverio', 'webdriverio'],
    ['Storybook Test Runner', 'storybookjs/test-runner', 'storybook-test-runner'],
    ['Selenium WebDriver', 'SeleniumHQ/selenium', 'selenium-webdriver'],
    ['CodeceptJS', 'codeceptjs/CodeceptJS', 'codeceptjs'],
    ['TestCafe', 'DevExpress/testcafe', 'testcafe'],
    ['c8', 'bcoe/c8', 'c8'],
    ['Mocha', 'mochajs/mocha', 'mocha'],
    ['AVA', 'avajs/ava', 'ava']
];

// Keep these in the order of docs/pages/coverage-services.md.
export const coverageServiceRepos = [
    ['Codecov', 'codecov/codecov-action', 'codecov'],
    ['Codacy', 'codacy/codacy-coverage-reporter-action', 'codacy'],
    ['Coveralls', 'coverallsapp/github-action', 'coveralls'],
    ['SonarQube Cloud', 'SonarSource/sonarqube-scan-action', 'sonar-cloud']
];

const integrationRepos = new Set(
    frameworkRepos.concat(coverageServiceRepos).map(([, repo]) => repo.toLowerCase())
);

export const excludeIntegrationRepos = (projects) => projects.filter(({ repo }) => !integrationRepos.has(repo.toLowerCase()));
