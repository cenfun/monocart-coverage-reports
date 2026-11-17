// https://eslint.org/docs/rules/

import markdown from '@eslint/markdown';
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
    ... vue.configs['flat/recommended'],
    {
        files: ['docs/**/*.md', 'README.md'],
        plugins: {
            markdown
        },
        processor: {
            ... markdown.processors.markdown,
            preprocess(source, filename) {
                return markdown.processors.markdown.preprocess(source, filename).map((block) => ({
                    ... block,
                    // VitePress allows fences such as js{1,3-5}:line-numbers.
                    filename: block.filename.replace(/\.(javascript|js|mjs|cjs)(?=[{:]).*$/, (_, extension) => `.${extension === 'javascript' ? 'js' : extension}`)
                }));
            }
        }
    },
    {
        files: ['**/*.md/**/*.{js,mjs,cjs}'],
        linterOptions: {
            noInlineConfig: true
        },
        rules: {
            // Examples may omit surrounding declarations and callers.
            'no-undef': 'off',
            'no-unused-vars': 'off'
        }
    }
];
