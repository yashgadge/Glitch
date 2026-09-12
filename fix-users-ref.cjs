const fs = require('fs');

function replaceFile(path, oldText, newText) {
  if (!fs.existsSync(path)) return;
  let content = fs.readFileSync(path, 'utf8');
  // replace all instances
  content = content.split(oldText).join(newText);
  fs.writeFileSync(path, content);
}

replaceFile('src/pages/dashboards/participant/TeamManagement.tsx', "doc(db, 'users', uid)", "doc(db, 'participants', uid)");
replaceFile('src/pages/dashboards/participant/Profile.tsx', "doc(db, 'users', user.uid)", "doc(db, 'participants', user.uid)");
replaceFile('src/pages/dashboards/organizer/WorkflowDashboard.tsx', "collection(db, 'users')", "collection(db, 'staff')");
replaceFile('src/pages/dashboards/organizer/Participants.tsx', "collection(db, 'users')", "collection(db, 'participants')");
replaceFile('src/pages/auth/CompleteProfile.tsx', "doc(db, 'users', user.uid)", "doc(db, 'participants', user.uid)");
