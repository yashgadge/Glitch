const fs = require('fs');

let content = fs.readFileSync('f:/GLITCH 36 2.0/functions/src/index.ts', 'utf8');

content = content.replace(/functions\.https\.onCall\(async \((data),\s*(context)\)\s*=>\s*\{/g, 
  'functions.https.onCall(async (request) => {\n  const data = request.data;\n  const context = { auth: request.auth };');

fs.writeFileSync('f:/GLITCH 36 2.0/functions/src/index.ts', content, 'utf8');
console.log("Functions updated successfully");
