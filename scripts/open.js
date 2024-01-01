const fs = require('fs');
const path = require('path');

const openUrl = async (p) => {
    const open = await import('open');
    await open.default(p);
};

const main = async () => {
    const list = fs.readdirSync(path.resolve('docs'), {
        withFileTypes: true
    });
    for (const item of list) {
        if (item.isDirectory()) {
            const indexPath = path.resolve('docs', item.name, 'index.html');
            if (fs.existsSync(indexPath)) {
                await openUrl(indexPath);
            }
        }
    }
};

main();
