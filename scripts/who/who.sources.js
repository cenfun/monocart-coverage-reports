// Reviewed candidates get rechecked on the repository's default branch.
const project = (repo, name, evidence, options = {}) => ({
    repo, name, evidence, ... options
});

export const reviewed = [
    project('n8n-io/n8n', 'n8n', 'packages/quality/testing/playwright/fixtures/v8-coverage.ts'),
    project('Significant-Gravitas/AutoGPT', 'AutoGPT', 'autogpt_platform/frontend/playwright.config.ts', {
        match: ['monocart-reporter', 'coverage: {']
    }),
    project('louislam/uptime-kuma', 'Uptime Kuma', 'extra/coverage-report.mjs'),
    project('mermaid-js/mermaid', 'Mermaid', 'e2e/global-teardown.ts'),
    project('grafana/grafana', 'Grafana', 'jest.config.codeowner.js', {
        match: ['jest-monocart-coverage']
    }),
    project('Kong/insomnia', 'Insomnia', 'packages/insomnia-test/misc/coverage.ts'),
    project('jhipster/generator-jhipster', 'JHipster', 'generators/cypress/templates/src/test/javascript/cypress/plugins/coverage.ts.ejs'),
    project('maplibre/maplibre-gl-js', 'MapLibre GL JS', 'test/integration/lib/puppeteer_config.ts'),
    project('OpenCTI-Platform/opencti', 'OpenCTI', 'opencti-platform/opencti-front/playwright.config.ts', {
        match: ['monocart-reporter', 'coverage: {']
    }),
    project('jely2002/youtube-dl-gui', 'youtube-dl-gui', 'tests/e2e/utils/teardown.ts'),
    project('phoenixframework/phoenix_live_view', 'Phoenix LiveView', 'test/e2e/merge-coverage.js'),
    project('wikimedia/mediawiki', 'MediaWiki', 'tests/qunit/coverage-runner.js'),
    project('bitpay/bitcore', 'Bitcore', 'packages/bitcore-build/index.js'),
    project('codeceptjs/CodeceptJS', 'CodeceptJS', 'lib/plugin/coverage.js'),
    project('pipeshub-ai/pipeshub-ai', 'PipesHub', 'frontend/playwright.config.ts', {
        match: ['monocart-reporter', 'coverage: {']
    }),
    project('Comfy-Org/ComfyUI_frontend', 'ComfyUI Frontend', 'browser_tests/fixtures/ComfyPage.ts'),
    project('bcoe/c8', 'c8', 'lib/report.js'),
    project('thkruz/keeptrack.space', 'KeepTrack.Space', 'test/e2e/coverage.ts'),
    project('mantoni/eslint_d.js', 'eslint_d', 'package.json', {
        match: ['monocart-coverage-reports', 'mcr --filter']
    }),
    project('wellwelwel/poku', 'Poku', 'src/bin/index.ts', {
        match: ['@pokujs/monocart', 'await import(pkg)']
    }),
    project('mutoe/vue3-realworld-example-app', 'Vue 3 RealWorld', 'scripts/merge-coverage.ts'),
    project('openstory-so/openstory', 'OpenStory', 'e2e/coverage.ts'),
    project('ErickWendel/localstudio', 'LocalStudio', 'tests/e2e/support/coverage-report.ts'),
    project('beaugunderson/ip-address', 'ip-address', 'package.json', {
        match: ['monocart-coverage-reports', 'c8 --experimental-monocart']
    }),
    project('jcputney/scorm-again', 'scorm-again', 'playwright.config.ts', {
        match: ['monocart-reporter', 'coverage: {']
    }),
    project('oorabona/vitest-monocart-coverage', '@oorabona/vitest-monocart-coverage', 'src/index.ts', {
        match: ['withMonocartProvider']
    }),
    project('duckduckgo/content-scope-scripts', 'DuckDuckGo Content Scope Scripts', 'injected/scripts/merge-coverage.js'),
    project('grafana/grafana-treemap-panel', 'Grafana Treemap Panel', 'jest.config.js', {
        match: ['jest-monocart-coverage']
    }),
    project('Tradeshift/tradeshift-ui', 'Tradeshift UI', 'tests/coverage.collect.js'),
    project('concord-consortium/activity-player', 'Activity Player', 'playwright/lib/coverage.ts'),
    project('jakebailey/hereby', 'Hereby', 'package.json', {
        match: ['monocart-coverage-reports', 'mcr node']
    })
];

// Manual overrides apply only to repositories in the candidate pool. They do
// not change the Star order or bypass verification and the owner filter.
// Fields: repo, name; optional evidence (repo-relative file).
// Example: { repo: 'org/project', name: 'Project', evidence: 'scripts/coverage.js' }
export const manual = [];
