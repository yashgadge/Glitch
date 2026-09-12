const fs = require('fs');

async function restoreSuperAdmin() {
  const projectId = 'glitch-36';
  const uid = '6wQBWwYZkpaicyE5KIXyqdNRYfh1';
  
  const doc = {
    fields: {
      name: { stringValue: 'Yash Gadge' },
      email: { stringValue: 'yashgadge11155@gmail.com' },
      roles: { arrayValue: { values: [{ stringValue: 'super_admin' }] } },
      role: { stringValue: 'super_admin' },
      profileCompleted: { booleanValue: true },
      status: { stringValue: 'Active' },
      createdAt: { stringValue: new Date().toISOString() },
      activatedAt: { stringValue: new Date().toISOString() }
    }
  };

  try {
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/staff/${uid}?updateMask.fieldPaths=name&updateMask.fieldPaths=email&updateMask.fieldPaths=roles&updateMask.fieldPaths=role&updateMask.fieldPaths=profileCompleted&updateMask.fieldPaths=status&updateMask.fieldPaths=createdAt&updateMask.fieldPaths=activatedAt`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc)
    });
    
    if (res.ok) {
      console.log('Super Admin Restored Successfully!');
    } else {
      console.error('Failed to restore:', await res.text());
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

restoreSuperAdmin();
