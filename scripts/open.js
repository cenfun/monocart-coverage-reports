import fs from 'node:fs';
import path from 'node:path';
import open from 'open';

const main = async () => {
    const list = fs.readdirSync(path.resolve('docs'), {
        withFileTypes: true
    });
    for (const item of list) {
        if (item.isDirectory()) {
            const indexPath = path.resolve('docs', item.name, 'index.html');
            if (fs.existsSync(indexPath)) {
                await open(indexPath);
            }
        }
    }
};

main();
