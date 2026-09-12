const fs = require('fs');

function injectProfile(path) {
  if (!fs.existsSync(path)) return;
  let content = fs.readFileSync(path, 'utf8');
  
  // Only inject if not already present
  if (content.includes('StaffProfile')) return;

  // Add import
  content = content.replace("const LoadingFallback = () => (", "const StaffProfile = React.lazy(() => import('../../../components/dashboard/StaffProfile'));\n\nconst LoadingFallback = () => (");

  // Add route before catch-all
  content = content.replace('<Route path="*"', '<Route path="/profile" element={<StaffProfile />} />\n          <Route path="*"');

  fs.writeFileSync(path, content);
}

injectProfile('src/pages/dashboards/volunteer/VolunteerModule.tsx');
injectProfile('src/pages/dashboards/evaluation/EvaluationModule.tsx');
injectProfile('src/pages/dashboards/organizer/OrganizerModule.tsx');

// For AdminDashboard, it doesn't use sub-routing right now, it renders everything in one page.
// Wait! Let me check AdminDashboard.tsx to see if I should just leave it out, or add it to WorkspaceResolver.
// Actually, Super Admin can just change it directly in Firebase Authentication via console since they are developers/admins, 
// OR I can add a /profile to AdminDashboard, but it needs a sub-router. Let's look at AdminDashboard.tsx.
