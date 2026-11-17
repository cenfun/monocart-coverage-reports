import { readFileSync } from 'node:fs';
import { normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const declarationFile = fileURLToPath(new URL('../../lib/index.d.ts', import.meta.url));
const placeholder = '<!--@type-declarations-->';

const getPublicDeclarations = (file) => file.statements.flatMap((node) => {
    if (ts.isModuleDeclaration(node) && node.name.text === 'MCR' && ts.isModuleBlock(node.body)) {
        return node.body.statements.filter((member) => member.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword));
    }
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'MCR') {
        return [node];
    }
    return [];
});

// Use the AST only for boundaries: keep the original declaration text and comments.
export const renderTypeDeclarations = (source) => {
    const file = ts.createSourceFile('index.d.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    if (file.parseDiagnostics.length) {
        throw new Error(ts.flattenDiagnosticMessageText(file.parseDiagnostics[0].messageText, '\n'));
    }
    const declarations = new Map();
    const add = (name, node) => {
        const start = node.getStart(file, true);
        const lineStart = source.lastIndexOf('\n', start - 1) + 1;
        const indent = source.slice(lineStart, start);
        const text = source.slice(start, node.end).split('\n').map((line) => (line.startsWith(indent) ? line.slice(indent.length) : line)).join('\n');
        if (!declarations.has(name)) {
            declarations.set(name, []);
        }
        declarations.get(name).push(text);
    };
    const collect = (node) => {
        if (ts.isVariableStatement(node)) {
            for (const declaration of node.declarationList.declarations) {
                if (ts.isIdentifier(declaration.name)) {
                    add(declaration.name.text, node);
                }
            }
        } else if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isClassDeclaration(node) || ts.isFunctionDeclaration(node)) {
            add(node.name.text, node);
        }
    };
    getPublicDeclarations(file).forEach(collect);
    const anchors = new Set();
    return [... declarations].map(([name, parts]) => {
        const anchor = name.toLowerCase();
        if (anchors.has(anchor)) {
            throw new Error(`Duplicate type declaration anchor: ${anchor}`);
        }
        anchors.add(anchor);
        const text = parts.join('\n\n');
        // Comments and template literal types may themselves contain code fences.
        const fence = '`'.repeat(Math.max(3, ... (text.match(/`+/g) || []).map((run) => run.length + 1)));
        return `## ${name} {#${anchor}}\n\n${fence}ts\n${text}\n${fence}`;
    }).join('\n\n');
};

// Run in Markdown rather than a Vite transform so local search sees the sections too.
export const typeDeclarations = (md, sourceFile = declarationFile) => {
    md.core.ruler.before('normalize', 'mcr-type-declarations', (state) => {
        if (!state.src.includes(placeholder)) {
            return;
        }
        const sections = renderTypeDeclarations(readFileSync(sourceFile, 'utf8'));
        state.src = state.src.replaceAll(placeholder, () => sections);
        // VitePress tracks includes for watching and invalidating Markdown render caches.
        state.env.includes ??= [];
        state.env.includes.push(sourceFile);
    });
};

// VitePress 1.x only re-indexes Markdown changes, not their imported dependencies.
// Use its normal config-restart path to rebuild search indexes, including removed sections.
export const typeDeclarationsReload = (configFile = fileURLToPath(new URL('./config.js', import.meta.url)), sourceFile = declarationFile) => ({
    name: 'mcr-type-declarations-reload',
    apply: 'serve',
    configureServer(server) {
        // Watch even when neither type page has been opened yet.
        server.watcher.add(sourceFile);
    },
    handleHotUpdate({ file, server }) {
        if (normalize(file) === normalize(sourceFile)) {
            server.watcher.emit('change', configFile);
        }
    }
});
