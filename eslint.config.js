// https://eslint.org/docs/rules/

const plus = require('eslint-config-plus');
const vue = require('eslint-plugin-vue');

// https://eslint.org/docs/latest/use/configure/configuration-files
module.exports = [
    {
        languageOptions: {
            globals: {
                Bun: 'readonly'
            }
        }
    },
    plus,
    ... vue.configs['flat/recommended']
];
