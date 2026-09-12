const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'apps/admin-web/src/App.tsx',
  'apps/admin-web/src/components/auth/WorkspaceResolver.tsx',
  'apps/admin-web/src/pages/dashboards/coordinator/CoordinatorModule.tsx',
  'apps/admin-web/src/pages/dashboards/judge/JudgeModule.tsx',
  'apps/admin-web/src/pages/dashboards/volunteer/VolunteerModule.tsx',
  'apps/participant-web/src/App.tsx',
  'apps/participant-web/src/components/auth/WorkspaceResolver.tsx'
];

const oldFallback = `const LoadingFallback = () => (
  <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
  </div>
);`;

filesToUpdate.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Determine relative path to LoadingScreen
    const isApp = file.endsWith('App.tsx');
    const isWorkspaceResolver = file.endsWith('WorkspaceResolver.tsx');
    const isModule = file.endsWith('Module.tsx');
    
    let importPath = '';
    if (isApp) importPath = './components/ui/LoadingScreen';
    else if (isWorkspaceResolver) importPath = '../ui/LoadingScreen';
    else if (isModule) importPath = '../../../components/ui/LoadingScreen';
    
    const importStatement = `import { LoadingScreen as LoadingFallback } from '${importPath}';`;
    
    if (content.includes(oldFallback)) {
      content = content.replace(oldFallback, importStatement);
      fs.writeFileSync(fullPath, content);
      console.log(`Updated ${file}`);
    } else {
      console.log(`Fallback not found exactly in ${file}`);
    }
  } else {
    console.log(`File not found: ${file}`);
  }
});
