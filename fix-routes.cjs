const fs = require('fs');

function fixModule(path) {
  if (!fs.existsSync(path)) return;
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(/Navigate to="\/organizer"/g, 'Navigate to="/workspace"');
  content = content.replace(/Navigate to="\/evaluation"/g, 'Navigate to="/workspace"');
  content = content.replace(/Navigate to="\/volunteer"/g, 'Navigate to="/workspace"');
  content = content.replace(/Navigate to="\/admin"/g, 'Navigate to="/workspace"');
  fs.writeFileSync(path, content);
}

fixModule('src/pages/dashboards/organizer/OrganizerModule.tsx');
fixModule('src/pages/dashboards/evaluation/EvaluationModule.tsx');
fixModule('src/pages/dashboards/volunteer/VolunteerModule.tsx');
fixModule('src/pages/dashboards/admin/AdminDashboard.tsx');
