const fs = require('fs');
const path = require('path');

const { marked } = require('marked');

const Util = require('../lib/utils/util.js');

const buildDocs = () => {

    // copy css
    const cssDir = path.resolve(__dirname, '../docs/assets');
    if (!fs.existsSync(cssDir)) {
        fs.mkdirSync(cssDir);
    }
    fs.copyFileSync(
        path.resolve(__dirname, '../node_modules/github-markdown-css/github-markdown.css'),
        path.resolve(cssDir, 'github-markdown.css')
    );

    const markdownTemplate = fs.readFileSync(path.resolve(__dirname, 'template/markdown.html'), {
        encoding: 'utf-8'
    });

    // add target="_blank" for link
    const renderer = new marked.Renderer();
    renderer.link = function(href, title, text) {
        const link = marked.Renderer.prototype.link.apply(this, arguments);
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

    const content = Util.replace(markdownTemplate, {
        placeholder_title: 'Monocart Coverage Reports',
        placeholder_content: html
    });

    fs.writeFileSync(path.resolve(__dirname, '../docs/index.html'), content);

    console.log('generated docs/index.html');

};

buildDocs();
