// Regression: https://github.com/cenfun/monocart-coverage-reports/issues/142
// Loading the class must not cover instance field initializers.
class Config {
    mode = globalThis.MODE || 'dev';
    level = globalThis.LEVEL ? 1 : 0;
}

// Export the class without creating an instance.
module.exports = {
    Config
};
