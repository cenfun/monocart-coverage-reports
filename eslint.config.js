// https://eslint.org/docs/rules/

import plus from 'eslint-config-plus';
import vue from 'eslint-plugin-vue';

// https://eslint.org/docs/latest/use/configure/configuration-files
export default [
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
