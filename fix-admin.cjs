const fs = require('fs');
let content = fs.readFileSync('src/pages/dashboards/admin/AdminHome.tsx', 'utf8');

content = content.replace('export default function AdminDashboard()', 'export default function AdminHome()');
content = content.replace(/import DashboardLayout.*?\\n/g, '');
content = content.replace('<DashboardLayout title="SUPER ADMIN">', '<>');
content = content.replace('</DashboardLayout>', '</>');

fs.writeFileSync('src/pages/dashboards/admin/AdminHome.tsx', content);
