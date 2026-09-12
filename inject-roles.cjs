const fs = require('fs');

function injectSidebarItem(path) {
  if (!fs.existsSync(path)) return;
  let content = fs.readFileSync(path, 'utf8');

  // Add to organizer if not present
  if (!content.includes("{ title: 'Profile', path: '/workspace/profile', icon: Settings }")) {
    content = content.replace(
      "{ title: 'Audit Log', path: '/workspace/audit', icon: FileText },",
      "{ title: 'Audit Log', path: '/workspace/audit', icon: FileText },\n      { title: 'Profile', path: '/workspace/profile', icon: Settings },"
    );
    // Add to judge
    content = content.replace(
      "{ title: 'History', path: '/workspace/history', icon: FileCheck },",
      "{ title: 'History', path: '/workspace/history', icon: FileCheck },\n      { title: 'Profile', path: '/workspace/profile', icon: Settings },"
    );
    // Add to mentor
    content = content.replace(
      "{ title: 'Session Logs', path: '/workspace/sessions', icon: MessageCircle },",
      "{ title: 'Session Logs', path: '/workspace/sessions', icon: MessageCircle },\n      { title: 'Profile', path: '/workspace/profile', icon: Settings },"
    );
    // Add to super admin
    content = content.replace(
      "{ title: 'System Settings', path: '/workspace/settings', icon: Settings },",
      "{ title: 'System Settings', path: '/workspace/settings', icon: Settings },\n      { title: 'Profile', path: '/workspace/profile', icon: UserCheck },"
    );
    
    fs.writeFileSync(path, content);
  }
}

injectSidebarItem('src/config/roles.ts');
