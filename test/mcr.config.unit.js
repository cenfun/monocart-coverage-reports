export default {
    name: 'MCR Unit Test Coverage',
    test: 'test/unit/*.test.js',
    outputDir: '.temp/coverage-unit',
    reports: ['v8', 'console-summary'],
    entryFilter: {
        '**/node_modules/**': false,
        '**/lib/packages/**': false,
        '**/lib/**': true
    },
    sourceFilter: {
        '**/lib/packages/**': false,
        '**/lib/**': true
    }
};
