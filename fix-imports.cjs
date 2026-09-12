const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;

      // Fix models import
      const modelsRegex = /import\s+{([^}]+)}\s+from\s+['"]([^'"]*types\/models)['"]/g;
      content = content.replace(modelsRegex, (match, p1, p2) => {
        changed = true;
        return `import type { ${p1.trim()} } from '${p2}'`;
      });

      // Fix Sidebar NavItem import
      const sidebarRegex = /import\s+{([^}]*NavItem[^}]*)}\s+from\s+['"]([^'"]*Sidebar)['"]/g;
      content = content.replace(sidebarRegex, (match, p1, p2) => {
        changed = true;
        // If it imports both Sidebar and NavItem
        if (p1.includes('Sidebar') && p1.includes('NavItem')) {
          return `import { Sidebar } from '${p2}';\nimport type { NavItem } from '${p2}';`;
        }
        return `import type { ${p1.trim()} } from '${p2}'`;
      });

      // Fix CertificateService types import
      const certRegex = /import\s+{([^}]+)}\s+from\s+['"]([^'"]*CertificateService)['"]/g;
      content = content.replace(certRegex, (match, p1, p2) => {
        // If it imports CertificateService class AND types
        if (p1.includes('CertificateService') && (p1.includes('CertificateMetadata') || p1.includes('CertificateType'))) {
          changed = true;
          return `import { CertificateService } from '${p2}';\nimport type { CertificateMetadata, CertificateType } from '${p2}';`;
        }
        return match;
      });
      
      // Fix DataTable Column import
      const tableRegex = /import\s+{([^}]*Column[^}]*)}\s+from\s+['"]([^'"]*DataTable)['"]/g;
      content = content.replace(tableRegex, (match, p1, p2) => {
        if (p1.includes('DataTable') && p1.includes('Column')) {
          // Check if already has type Column
          if (!p1.includes('type Column')) {
             changed = true;
             return `import { DataTable, type Column } from '${p2}'`;
          }
        }
        return match;
      });

      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDir(path.join(__dirname, 'src'));
