const fs = require('fs');
const path = require('path');

const { marked } = require('marked');

const Util = require('../lib/utils/util.js');

const buildDocs = () => {

    console.log('build docs ...');

    // copy css
    const cssDir = path.resolve(__dirname, '../docs/assets');
    if (!fs.existsSync(cssDir)) {
        fs.mkdirSync(cssDir, {
            recursive: true
        });
    }
    fs.copyFileSync(
        path.resolve(__dirname, '../node_modules/github-markdown-css/github-markdown.css'),
        path.resolve(cssDir, 'github-markdown.css')
    );

    // copy images
    const imagesDir = path.resolve(__dirname, '../docs/test');
    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir);
    }

    Util.forEachFile('./test', ['.png', '.gif'], (filename, fileDir) => {
        fs.copyFileSync(
            path.resolve(fileDir, filename),
            path.resolve(imagesDir, filename)
        );
    });

    const markdownTemplate = fs.readFileSync(path.resolve(__dirname, 'template/markdown.html'), {
        encoding: 'utf-8'
    });

    // add target="_blank" for link
    const renderer = new marked.Renderer();
    renderer.link = function(href, title, text) {
        const link = marked.Renderer.prototype.link.apply(this, arguments);
        if (href.startsWith('#')) {
            return link;
        }
        return link.replace('<a', '<a target="_blank"');
    };
    marked.setOptions({
        renderer: renderer
    });

    const markedOptions = {
        mangle: false,
        headerIds: false
    };

    const md = fs.readFileSync(path.resolve(__dirname, '../README.md'), {
        encoding: 'utf-8'
    });

    const html = marked.parse(md, markedOptions);

    let content = Util.replace(markdownTemplate, {
        placeholder_title: 'Monocart Coverage Reports',
        placeholder_content: html
    });

    content = content.split('href="https://cenfun.github.io/monocart-coverage-reports/').join('href="./');

    fs.writeFileSync(path.resolve(__dirname, '../docs/index.html'), content);

    console.log('generated docs/index.html');

};

buildDocs();
