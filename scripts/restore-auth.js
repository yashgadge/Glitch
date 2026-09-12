const apiKey = "AIzaSyD81Wyfqv2pWtTeaT09gflUxeLQTNp-GhQ";
const email = "yashgadge11155@gmail.com";
const password = "password123";

async function restore() {
  // 1. Create Auth User
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email, password, returnSecureToken: true})
  });
  
  const data = await res.json();
  console.log("Auth Response:", data);
  
  if (data.error && data.error.message !== 'EMAIL_EXISTS') {
    console.error("Failed to create auth user", data.error);
    return;
  }
  
  let localId = data.localId;
  
  // If email exists, we need to sign in to get the localId
  if (data.error && data.error.message === 'EMAIL_EXISTS') {
    const signInRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email, password, returnSecureToken: true})
    });
    const signInData = await signInRes.json();
    if (signInData.localId) {
       localId = signInData.localId;
    } else {
       console.log("Email exists but wrong password. Resetting is hard via REST. Use the UI to reset.");
       return;
    }
  }

  // 2. Add to staff collection using Firestore REST API
  const projectId = "glitch-36";
  const docPath = `projects/${projectId}/databases/(default)/documents/staff/${localId}`;
  
  const staffData = {
    fields: {
      email: { stringValue: email },
      role: { stringValue: "super_admin" },
      roles: { arrayValue: { values: [{ stringValue: "super_admin" }] } },
      name: { stringValue: "Yash Gadge" },
      status: { stringValue: "active" },
      createdAt: { stringValue: new Date().toISOString() }
    }
  };

  const dbRes = await fetch(`https://firestore.googleapis.com/v1/${docPath}`, {
    method: 'PATCH', // Upsert
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(staffData)
  });
  
  console.log("Firestore Response:", await dbRes.json());
}

restore();
