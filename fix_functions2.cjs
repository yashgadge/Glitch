const fs = require('fs');

let content = fs.readFileSync('f:/GLITCH 36 2.0/functions/src/index.ts', 'utf8');

// fix functions.config() TS error
content = content.replace(/functions\.config\(\)/g, '(functions.config as any)()');

fs.writeFileSync('f:/GLITCH 36 2.0/functions/src/index.ts', content, 'utf8');
console.log("Functions updated successfully");
