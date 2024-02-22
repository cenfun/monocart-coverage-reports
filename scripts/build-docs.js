const fs = require('fs');
const path = require('path');

const { marked } = require('marked');

const Util = require('../lib/utils/util.js');

const buildDocs = () => {

    console.log('build docs ...');

    const assetsDir = path.resolve(__dirname, '../docs/assets');
    if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, {
            recursive: true
        });
    }

    // copy assets
    Util.forEachFile('./assets', [], (filename, fileDir) => {
        fs.copyFileSync(
            path.resolve(fileDir, filename),
            path.resolve(assetsDir, filename)
        );
    });

    // copy css
    fs.copyFileSync(
        path.resolve(__dirname, '../node_modules/github-markdown-css/github-markdown.css'),
        path.resolve(assetsDir, 'github-markdown.css')
    );

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
