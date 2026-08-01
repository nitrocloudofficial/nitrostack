import fs from 'fs';
import path from 'path';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.ts')) results.push(file);
        }
    });
    return results;
}

const files = walk('./src/modules');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    if (file.endsWith('.module.ts')) {
        // Move Tools to controllers array
        content = content.replace(/providers:\s*\[(\w+Service),\s*(\w+Tools)\]/, "controllers: [$2],\n  providers: [$1]");
    }
    
    if (file.endsWith('.tools.ts')) {
        content = content.replace(/import\s*\{\s*Injectable\s*\}\s*from\s*'@nitrostack\/core';/, "import { ControllerDecorator as Controller } from '@nitrostack/core';");
        content = content.replace(/@Injectable\(\)/, "@Controller()");
    }

    fs.writeFileSync(file, content, 'utf8');
});
console.log('Fixed controllers in', files.length, 'files');
