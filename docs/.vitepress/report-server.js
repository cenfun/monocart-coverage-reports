import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const reportsDir = fileURLToPath(new URL('../../.temp/site/reports/', import.meta.url));
const contentTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.jpg': 'image/jpeg',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.txt': 'text/plain; charset=utf-8',
    '.info': 'text/plain; charset=utf-8'
};

const isInside = (root, file) => {
    const relative = path.relative(root, file);
    return !path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`);
};

const resolveReport = async (directory, pathname) => {
    const relative = decodeURIComponent(pathname);
    if (relative.includes('\0') || relative.split(/[\\/]/).some((part) => part.startsWith('.'))) {
        return;
    }
    const root = await realpath(directory);
    let file = await realpath(path.join(root, relative));
    if (!isInside(root, file)) {
        return;
    }
    if ((await stat(file)).isDirectory()) {
        if (!pathname.endsWith('/')) {
            return {
                redirect: true
            };
        }
        file = await realpath(path.join(file, 'index.html'));
    }
    if (isInside(root, file) && (await stat(file)).isFile()) {
        return {
            file
        };
    }
};

const notFound = (res) => {
    res.writeHead(404, {
        'Content-Type': 'text/plain; charset=utf-8'
    });
    res.end('Report not found. Run the corresponding repository test to generate it in .temp/site/reports/.');
};

const serveReport = async (directory, prefix, url, req, res, next) => {
    const report = await resolveReport(directory, url.pathname.slice(prefix.length));
    if (!report) {
        notFound(res);
        return;
    }
    if (report.redirect) {
        res.writeHead(302, {
            Location: `${url.pathname}/${url.search}`
        });
        res.end();
        return;
    }
    res.setHeader('Content-Type', contentTypes[path.extname(report.file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'HEAD') {
        res.end();
        return;
    }
    createReadStream(report.file).on('error', next).pipe(res);
};

// Serve report HTML and assets unchanged, before Vite's Markdown/SPA handling.
export const reportServer = (directory = reportsDir) => ({
    name: 'mcr-documentation-reports',
    configureServer(server) {
        const prefix = `${server.config.base}reports`;
        server.middlewares.use((req, res, next) => {
            const url = new URL(req.url, 'http://localhost');
            if (url.pathname !== prefix && !url.pathname.startsWith(`${prefix}/`)) {
                next();
                return;
            }
            if (req.method !== 'GET' && req.method !== 'HEAD') {
                res.writeHead(405, {
                    Allow: 'GET, HEAD'
                });
                res.end();
                return;
            }
            serveReport(directory, prefix, url, req, res, next).catch((error) => {
                if (error instanceof URIError || ['ENOENT', 'ENOTDIR'].includes(error.code)) {
                    notFound(res);
                    return;
                }
                next(error);
            });
        });
    }
});
