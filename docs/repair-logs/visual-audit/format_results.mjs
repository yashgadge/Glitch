import fs from 'fs';
import path from 'path';

const AUDIT_DIR = 'F:\\GLITCH36_FRONTEND_REPAIR_WORKSPACE\\visual-audit';
const resultsFile = path.join(AUDIT_DIR, 'raw_results.json');
const errorsFile = path.join(AUDIT_DIR, 'raw_errors.json');

if (!fs.existsSync(resultsFile)) {
  console.error("Results not found");
  process.exit(1);
}

const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
const errors = fs.existsSync(errorsFile) ? JSON.parse(fs.readFileSync(errorsFile, 'utf8')) : [];

// Generate ROUTE_AUDIT.csv
let routeCsv = "Website,Route,Viewport,Expected Purpose,Reachable,Loaded Successfully,Redirected To,Blank/Runtime Error,Access Restricted,Screenshot\n";
results.forEach(r => {
  const isRedirect = r.loadedUrl !== r.targetUrl;
  const restricted = !r.accessible;
  const error = !r.success ? "Yes" : "No";
  
  routeCsv += `${r.site},${r.route},${r.viewport},Inspect Route,Yes,${r.success},${isRedirect ? r.loadedUrl : 'No'},${error},${restricted},${r.screenshotName}\n`;
});
fs.writeFileSync(path.join(AUDIT_DIR, 'ROUTE_AUDIT.csv'), routeCsv);

// Generate CONSOLE_AND_NETWORK_ERRORS.md
let errMd = "# Console and Network Errors\n\n";
errors.forEach(e => {
  errMd += `## Site: ${e.site} | Route: ${e.route} [${e.viewport}]\n`;
  if (e.console && e.console.length > 0) {
    errMd += `### Console Logs\n`;
    e.console.forEach(c => {
       errMd += `- **${c.type}**: ${c.text}\n`;
    });
  }
  if (e.network && e.network.length > 0) {
    errMd += `### Network Errors\n`;
    e.network.forEach(n => {
       errMd += `- HTTP ${n.status}: ${n.url}\n`;
    });
  }
  errMd += "\n";
});
if (errors.length === 0) errMd += "No errors detected.\n";
fs.writeFileSync(path.join(AUDIT_DIR, 'CONSOLE_AND_NETWORK_ERRORS.md'), errMd);

console.log("Formatting complete.");
