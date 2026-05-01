const fs = require('fs');
const path = require('path');

function processDir(dir) {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            const quoteRegex = /(['"])http:\/\/localhost:5000(.*?)\1/g;
            if (quoteRegex.test(content)) {
                content = content.replace(quoteRegex, '`${process.env.NEXT_PUBLIC_API_URL || \'http://localhost:5000\'}$2`');
                modified = true;
            }

            const tickRegex = /`http:\/\/localhost:5000(.*?)`/g;
            if (tickRegex.test(content)) {
                content = content.replace(tickRegex, '`${process.env.NEXT_PUBLIC_API_URL || \'http://localhost:5000\'}$1`');
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Fixed URLs in: ${fullPath}`);
            }
        }
    }
}

console.log('Starting URL replacement...');
processDir(path.join(__dirname, 'app'));
processDir(path.join(__dirname, 'components'));
console.log('Done!');
