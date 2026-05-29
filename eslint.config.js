// https://eslint.org/docs/rules/

const plus = require('eslint-config-plus');
const vue = require('eslint-plugin-vue');

// https://eslint.org/docs/latest/use/configure/configuration-files
module.exports = [
    {
        ignores: [
            'lib/packages/',
            '**/dist/',
            '**/node_modules/'
        ]
    },
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
