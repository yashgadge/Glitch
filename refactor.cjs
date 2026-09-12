const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const appsDir = path.join(rootDir, 'apps');
const sharedSrcDir = path.join(rootDir, 'packages', 'shared', 'src');

// 1. Move folders to shared
const foldersToMove = ['services', 'types', 'lib', 'contexts', 'config'];
foldersToMove.forEach(folder => {
    const srcPath = path.join(rootDir, 'src', folder);
    const destPath = path.join(sharedSrcDir, folder);
    
    if (fs.existsSync(srcPath)) {
        console.log(`Moving ${folder} to shared...`);
        // We use fs.cpSync then rmSync to avoid cross-device link errors, though renameSync usually works
        fs.cpSync(srcPath, destPath, { recursive: true });
    }
});

// 2. Rewrite imports in apps
const rewriteImports = (dir) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            if (file !== 'node_modules') {
                rewriteImports(fullPath);
            }
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            // Regex to match relative imports that point to the shared folders
            // Example: import { db } from '../../../lib/firebase';
            // Becomes: import { db } from '@shared/lib/firebase';
            
            const regex = /from\s+['"](\.\.\/)+((services|types|lib|contexts|config)(\/.*)?)['"]/g;
            if (regex.test(content)) {
                content = content.replace(regex, "from '@shared/$2'");
                modified = true;
            }
            
            // Also handle same-directory or child-directory imports if we are inside shared!
            // Wait, this function only runs on apps/ so we are fine.
            
            // Handle cases where the relative import is just '../services/X' or './services/X'
            const regex2 = /from\s+['"](\.\/|\.\.\/)+((services|types|lib|contexts|config)(\/.*)?)['"]/g;
            if (regex2.test(content)) {
                content = content.replace(regex2, "from '@shared/$2'");
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(fullPath, content);
                console.log(`Updated imports in ${fullPath}`);
            }
        }
    }
};

console.log('Rewriting participant-web imports...');
if (fs.existsSync(path.join(appsDir, 'participant-web', 'src'))) {
    rewriteImports(path.join(appsDir, 'participant-web', 'src'));
}

console.log('Rewriting admin-web imports...');
if (fs.existsSync(path.join(appsDir, 'admin-web', 'src'))) {
    rewriteImports(path.join(appsDir, 'admin-web', 'src'));
}

// 3. Remove the shared folders from the apps to avoid duplication
foldersToMove.forEach(folder => {
    const pWebPath = path.join(appsDir, 'participant-web', 'src', folder);
    const aWebPath = path.join(appsDir, 'admin-web', 'src', folder);
    
    if (fs.existsSync(pWebPath)) fs.rmSync(pWebPath, { recursive: true, force: true });
    if (fs.existsSync(aWebPath)) fs.rmSync(aWebPath, { recursive: true, force: true });
});

console.log('Refactor complete!');
