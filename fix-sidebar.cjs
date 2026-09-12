const fs = require('fs');
let content = fs.readFileSync('src/config/roles.ts', 'utf8');

// Replace standard route prefixes for the sidebar with /workspace
content = content.replace(/'\/admin/g, "'/workspace");
content = content.replace(/'\/organizer/g, "'/workspace");
content = content.replace(/'\/evaluation/g, "'/workspace");
content = content.replace(/'\/volunteer/g, "'/workspace");

// Specifically for participant it stays /dashboard, we don't change that.
// The code above replaces prefixes. For example '/admin/participants' becomes '/workspace/participants'.

fs.writeFileSync('src/config/roles.ts', content);
