const fs = require('fs');
const path = require('path');

const Util = require('../lib/utils/util.js');

const buildDocs = () => {

    console.log('build docs ...');

    const docsDir = path.resolve(__dirname, '../docs');
    const list = fs.readdirSync(docsDir, {
        withFileTypes: true
    });

    const html = ['<h3><a href="https://github.com/cenfun/monocart-coverage-reports">Monocart Coverage Reports</a></h3><ul>'];
    for (const item of list) {
        if (item.isDirectory()) {
            const indexPath = path.resolve(docsDir, item.name, 'index.html');
            if (fs.existsSync(indexPath)) {
                html.push(`<li><a href="${item.name}/index.html">${item.name}</a></li>`);
            }
        }
    }

    html.push('</ul>');

    const markdownTemplate = fs.readFileSync(path.resolve(__dirname, 'template/markdown.html'), {
        encoding: 'utf-8'
    });

    const content = Util.replace(markdownTemplate, {
        placeholder_title: 'Monocart Coverage Reports',
        placeholder_content: html.join('')
    });

    fs.writeFileSync(path.resolve(__dirname, '../docs/index.html'), content);

    console.log('generated docs/index.html');

};

buildDocs();
