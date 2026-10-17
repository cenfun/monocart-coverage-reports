import fs from 'node:fs';
import path from 'node:path';

import { Util } from '../lib/utils/util.js';

const buildDocs = () => {

    console.log('build docs ...');

    const docsDir = path.resolve(import.meta.dirname, '../docs');
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

    const markdownTemplate = fs.readFileSync(path.resolve(import.meta.dirname, 'template/markdown.html'), {
        encoding: 'utf-8'
    });

    const content = Util.replace(markdownTemplate, {
        placeholder_title: 'Monocart Coverage Reports',
        placeholder_content: html.join('')
    });

    fs.writeFileSync(path.resolve(import.meta.dirname, '../docs/index.html'), content);

    console.log('generated docs/index.html');

    // ship the social preview image into the built docs site (OG/Twitter cards)
    const ogImageSrc = path.resolve(import.meta.dirname, 'template/og-image.png');
    const ogImageDst = path.resolve(docsDir, 'og-image.png');
    if (fs.existsSync(ogImageSrc)) {
        fs.copyFileSync(ogImageSrc, ogImageDst);
        console.log('copied template/og-image.png -> docs/og-image.png');
    } else {
        console.warn('template/og-image.png not found; skip social preview copy');
    }

};

buildDocs();
