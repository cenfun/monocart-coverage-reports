import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';

const projectDir = fileURLToPath(new URL('../', import.meta.url));
const readmes = ['README.md', 'README.zh-Hans.md'];

const getDisabledRanges = (source, fences) => {
    const pattern = /^[ \t]*<!-- readme-lint-(disable|enable) -->[ \t]*\r?$/gm;
    const ranges = [];
    let start = null;
    for (const marker of source.matchAll(pattern)) {
        // A marker shown inside a code block is data, not a lint directive.
        if (fences.some((fence) => marker.index >= fence.index && marker.index < fence.index + fence[0].length)) {
            continue;
        }
        const line = source.slice(0, marker.index).split('\n').length;
        if (marker[1] === 'disable') {
            if (start !== null) {
                throw new Error(`Nested readme-lint-disable at line ${line}`);
            }
            start = marker.index;
            continue;
        }
        if (start === null) {
            throw new Error(`readme-lint-enable without disable at line ${line}`);
        }
        ranges.push([start, marker.index]);
        start = null;
    }
    if (start !== null) {
        const line = source.slice(0, start).split('\n').length;
        throw new Error(`Unclosed readme-lint-disable at line ${line}`);
    }
    return ranges;
};

const getJavaScriptExamples = (source) => {
    // Recognize all fences so directives inside TS/text/Markdown examples are ignored too.
    const pattern = /^([ \t]*)(`{3,}|~{3,})([^\r\n]*)\r?\n([\s\S]*?)^\1\2[ \t]*(?=\r?$)/gm;
    const fences = [... source.matchAll(pattern)];
    const disabledRanges = getDisabledRanges(source, fences);
    return fences.filter((match) => {
        const isJavaScript = ['js', 'javascript'].includes(match[3].trim());
        return isJavaScript && !disabledRanges.some(([start, end]) => match.index >= start && match.index < end);
    }).map((match) => {
        const indent = match[1];
        const start = match.index + match[0].indexOf('\n') + 1;
        const code = match[4].replaceAll('\r\n', '\n').split('\n').map((line) => {
            return line.startsWith(indent) ? line.slice(indent.length) : line;
        }).join('\n');
        return {
            code,
            indent,
            start,
            end: start + match[4].length,
            line: source.slice(0, start).split('\n').length
        };
    });
};

const formatExample = (code, indent, eol) => {
    return code.replace(/\n$/, '').split('\n').map((line) => {
        return line ? indent + line : '';
    }).join(eol) + eol;
};

const lintDocument = async (eslint, file, fix) => {
    const filename = path.join(projectDir, file);
    let source = await fs.readFile(filename, 'utf8');
    const eol = source.includes('\r\n') ? '\r\n' : '\n';
    const examples = getJavaScriptExamples(source);
    const replacements = [];
    const diagnostics = [];
    for (const [index, example] of examples.entries()) {
        const [result] = await eslint.lintText(example.code, {
            filePath: path.join(projectDir, file, `example-${index + 1}.js`)
        });
        for (const message of result.messages) {
            diagnostics.push({
                ... message,
                file,
                line: example.line + message.line - 1,
                column: example.indent.length + message.column
            });
        }
        if (fix && result.output) {
            replacements.push({
                ... example,
                code: formatExample(result.output, example.indent, eol)
            });
        }
    }
    for (const replacement of replacements.reverse()) {
        source = source.slice(0, replacement.start) + replacement.code + source.slice(replacement.end);
    }
    if (replacements.length) {
        await fs.writeFile(filename, source);
    }
    return {
        count: examples.length, diagnostics
    };
};

const lintReadmes = async ({ fix = false } = {}) => {
    const eslint = new ESLint({
        cwd: projectDir,
        fix,
        allowInlineConfig: false,
        overrideConfig: {
            rules: {
                // Snippets intentionally omit surrounding declarations and callers.
                // Keep all syntax, style and other correctness rules unchanged.
                'no-undef': 'off',
                'no-unused-vars': 'off'
            }
        }
    });
    const diagnostics = [];
    let count = 0;
    for (const file of readmes) {
        const result = await lintDocument(eslint, file, fix);
        count += result.count;
        diagnostics.push(... result.diagnostics);
    }
    return {
        count, diagnostics
    };
};

const { count, diagnostics } = await lintReadmes({
    fix: process.argv.includes('--fix')
});
for (const diagnostic of diagnostics) {
    console.error(`${diagnostic.file}:${diagnostic.line}:${diagnostic.column} ${diagnostic.message} (${diagnostic.ruleId || 'parse'})`);
}
if (diagnostics.length) {
    process.exitCode = 1;
} else {
    console.log(`ESLint passed for ${count} README JavaScript examples.`);
}
