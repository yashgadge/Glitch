import fs from 'fs';
import path from 'path';

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            
            // Replace ../lib/firebase with ../services/firebase depending on depth
            // Actually, we moved firebase to services.
            // Let's replace:
            // from '../../lib/firebase' to '../../services/firebase'
            content = content.replace(/['"](.*?)lib\/firebase['"]/g, "'$1services/firebase'");
            
            // from '../../../components/ui/...' to '../../components/ui/...'
            // Actually it's easier to just do simple string replacements for the pages
            if (fullPath.includes('pages\\dashboard')) {
              content = content.replace(/['"]\.\.\/\.\.\/\.\.\/components/g, "'../../components");
              content = content.replace(/['"]\.\.\/\.\.\/\.\.\/services/g, "'../../services");
              content = content.replace(/['"]\.\.\/\.\.\/\.\.\/contexts/g, "'../../contexts");
              content = content.replace(/['"]\.\.\/\.\.\/\.\.\/types/g, "'../../types");
              content = content.replace(/['"]\.\.\/\.\.\/\.\.\/lib/g, "'../../lib");
            }

            if (fullPath.includes('services\\')) {
              content = content.replace(/['"]\.\.\/lib\/firebase['"]/g, "'./firebase'");
            }
            
            fs.writeFileSync(fullPath, content, 'utf8');
        }
    }
}

walkDir('apps/volunteer-web/src');
