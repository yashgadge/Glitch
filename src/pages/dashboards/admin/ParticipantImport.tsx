import React, { useState, useRef } from 'react';
import { Upload, ShieldAlert, CheckCircle2, Download, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import * as XLSX from 'xlsx';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { ParticipantService } from '../../../services/ParticipantService';
import { TeamService } from '../../../services/TeamService';
import { db, firebaseConfig } from '../../../lib/firebase';
import { logAuditAction } from '../../../lib/auditLogger';
import { guardValue } from '../../../lib/firestoreGuard';

// Secondary app for bulk account creation without logging out current user
const secondaryApp = initializeApp(firebaseConfig, 'SecondaryAppImport');
const secondaryAuth = getAuth(secondaryApp);

interface ImportedParticipant {
  name: string;
  email: string;
  mobile: string;
  registrationId: string;
  teamName: string;
  teamCode: string;
  track: string;
  status?: 'valid' | 'duplicate' | 'invalid';
}

interface ProcessedParticipant extends ImportedParticipant {
  participantId: string;
  tempPass: string;
  assignedTeamId?: string;
  status: 'valid' | 'duplicate' | 'invalid' | 'success' | 'failed' | 'skipped' | 'updated';
  error?: string;
}

export default function ParticipantImport() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [rawData, setRawData] = useState<ImportedParticipant[]>([]);
  const [processedData, setProcessedData] = useState<ProcessedParticipant[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [validationStats, setValidationStats] = useState({ valid: 0, duplicates: 0, invalid: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    // Fetch existing unique keys to prevent duplicates
    let existingEmails = new Set<string>();
    let existingPhones = new Set<string>();
    let existingRegIds = new Set<string>();
    
    try {
      const qSnapshot = await getDocs(collection(db, 'participants'));
      qSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.email) existingEmails.add(data.email.toLowerCase().trim());
        if (data.mobile) existingPhones.add(data.mobile.trim());
        if (data.registrationId) existingRegIds.add(data.registrationId.trim());
      });
    } catch (err) {
      console.error("Failed to fetch existing participants", err);
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      
      let valid = 0, duplicates = 0, invalid = 0;
      const fileEmails = new Set<string>();
      const filePhones = new Set<string>();
      const fileRegIds = new Set<string>();

      const mappedData: ImportedParticipant[] = data.map((row: any) => {
        const name = (row.Name || row.name || row['Full Name'] || '').trim();
        const email = (row.Email || row.email || row['Email Address'] || '').trim().toLowerCase();
        const mobile = (row.Mobile || row.mobile || row.Phone || '').toString().trim();
        const registrationId = (row['Registration ID'] || row.RegistrationId || row.regId || '').toString().trim();
        const teamName = (row['Team Name'] || row.teamName || row.team || '').trim();
        const teamCode = (row['Team Code'] || row.teamCode || '').toString().trim();
        const track = (row.Track || row.track || 'Web').trim();
        
        let status: 'valid' | 'duplicate' | 'invalid' = 'valid';
        
        if (!name || !email || !registrationId || !teamName || !teamCode) {
          status = 'invalid';
          invalid++;
        } else if (
          existingEmails.has(email) || fileEmails.has(email) ||
          (mobile && (existingPhones.has(mobile) || filePhones.has(mobile))) ||
          existingRegIds.has(registrationId) || fileRegIds.has(registrationId)
        ) {
          status = 'duplicate';
          duplicates++;
        } else {
          fileEmails.add(email);
          if (mobile) filePhones.add(mobile);
          fileRegIds.add(registrationId);
          valid++;
        }

        return { name, email, mobile, registrationId, teamName, teamCode, track, status };
      });

      setRawData(mappedData);
      setValidationStats({ valid, duplicates, invalid });
      setStep(2);
    };
    reader.readAsBinaryString(selectedFile);
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update'>('skip');

  const handleProcessImport = async () => {
    const validParticipants = rawData.filter(p => p.status === 'valid' || p.status === 'duplicate');
    if (validParticipants.length === 0) return;

    setStep(3);
    setProgress({ current: 0, total: validParticipants.length });

    const results: ProcessedParticipant[] = [];

    // Process one by one to avoid rate limits and handle errors cleanly
    for (let i = 0; i < validParticipants.length; i++) {
      const p = validParticipants[i];
      setProgress({ current: i + 1, total: validParticipants.length });
      
      const tempPass = `GLITCH-${Math.floor(1000 + Math.random() * 9000)}`;
      let uid = '';

      try {
        // 1. Create Auth Account
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, p.email, tempPass);
        uid = userCredential.user.uid;

        // 2. Create Firestore Profile
        const participantId = await ParticipantService.createParticipantWithCounter(uid, {
          email: p.email,
          name: p.name,
          mobile: p.mobile,
          registrationId: p.registrationId,
          role: 'participant',
          mustChangePassword: true,
          tempPass: tempPass,
          profileCompleted: false,
          status: 'imported',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        // 3. Handle Team Provisioning
        const assignedTeamId = await TeamService.adminCreateOrJoinTeam(p.teamName, p.teamCode, uid, p.track);

        results.push({ ...p, participantId, assignedTeamId, tempPass, status: 'success' });
      } catch (err: any) {
        if (err.code === 'auth/email-already-in-use') {
          if (duplicateStrategy === 'skip') {
            results.push({ ...p, participantId: '', tempPass: '', status: 'skipped', error: 'Skipped: Account already exists' });
          } else if (duplicateStrategy === 'update') {
            try {
              const validEmail = guardValue(p.email, 'email');
              const q = query(collection(db, 'participants'), where('email', '==', validEmail));
              const snap = await getDocs(q);
              if (!snap.empty) {
                const existingId = snap.docs[0].id;
                await updateDoc(doc(db, 'participants', existingId), { name: p.name, updatedAt: new Date().toISOString() });
                results.push({ ...p, participantId: existingId, tempPass: 'N/A (Existing)', status: 'updated' });
              } else {
                results.push({ ...p, participantId: '', tempPass: '', status: 'failed', error: 'Auth user exists but Firestore profile missing' });
              }
            } catch (updateErr: any) {
              results.push({ ...p, participantId: '', tempPass: '', status: 'failed', error: `Update failed: ${updateErr.message}` });
            }
          }
        } else {
          console.error(`Error importing ${p.email}:`, err);
          results.push({ ...p, participantId: '', tempPass: '', status: 'failed', error: err.message });
        }
      }

      // 1-second delay to avoid hammering the Firebase Auth API (rate limit is usually 100/min per IP)
      await new Promise(r => setTimeout(r, 1200));
    }

    // Cleanup secondary auth
    await secondaryAuth.signOut();
    const successCount = results.filter(r => r.status === 'success' || r.status === 'updated').length;
    await logAuditAction('BULK_IMPORT', `Processed ${successCount} participants securely.`);

    setProcessedData(results);
    setStep(4);
  };

  const downloadResults = () => {
    if (processedData.length === 0) return;
    
    const headers = ['Name', 'Email Address', 'Mobile', 'Registration ID', 'Team Name', 'Team Code', 'Track', 'Participant ID', 'Team ID', 'Temporary Password', 'Status', 'Error'];
    const rows = processedData.map(p => [
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${(p.email || '').replace(/"/g, '""')}"`,
      `"${(p.mobile || '').replace(/"/g, '""')}"`,
      `"${(p.registrationId || '').replace(/"/g, '""')}"`,
      `"${(p.teamName || '').replace(/"/g, '""')}"`,
      `"${(p.teamCode || '').replace(/"/g, '""')}"`,
      `"${(p.track || '').replace(/"/g, '""')}"`,
      `"${(p.participantId || '').replace(/"/g, '""')}"`,
      `"${(p.assignedTeamId || '').replace(/"/g, '""')}"`,
      `"${(p.tempPass || '').replace(/"/g, '""')}"`,
      `"${(p.status || '').replace(/"/g, '""')}"`,
      `"${(p.error || '').replace(/"/g, '""')}"`
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'glitch36_import_credentials.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="font-bebas text-4xl tracking-widest text-white mb-2 flex items-center gap-2">
            <FileSpreadsheet className="w-8 h-8 text-primary" /> DEVNOVATE IMPORT WIZARD
          </h1>
          <p className="font-inter text-gray-400">Import participants securely with duplicate detection.</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="relative">
            <div className={`h-2 rounded-full transition-all duration-500 ${step >= s ? 'bg-primary' : 'bg-white/10'}`} />
            <span className={`absolute top-4 text-xs font-mono tracking-widest ${step >= s ? 'text-primary' : 'text-gray-600'}`}>
              STEP {s}
            </span>
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Devnovate Export</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="border-2 border-dashed border-white/20 rounded-xl p-12 text-center hover:border-primary/50 transition-colors cursor-pointer bg-white/5"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bebas tracking-widest text-white mb-2">SELECT EXCEL FILE</h3>
              <p className="text-gray-400 font-inter text-sm">Upload the .xlsx or .csv export from Devnovate.</p>
              <p className="text-gray-500 font-inter text-xs mt-4">Must contain 'Name', 'Email', 'Registration ID', 'Team Name', 'Team Code'.</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".xlsx, .xls, .csv" 
                className="hidden" 
              />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Data Validation Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg flex flex-col items-center justify-center text-center">
                <CheckCircle2 className="w-8 h-8 text-primary mb-2" />
                <span className="text-2xl font-bebas text-white">{validationStats.valid}</span>
                <span className="text-xs text-gray-400 font-inter uppercase">Valid Records</span>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg flex flex-col items-center justify-center text-center">
                <AlertTriangle className="w-8 h-8 text-yellow-500 mb-2" />
                <span className="text-2xl font-bebas text-white">{validationStats.duplicates}</span>
                <span className="text-xs text-gray-400 font-inter uppercase">Duplicates Ignored</span>
              </div>
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg flex flex-col items-center justify-center text-center">
                <ShieldAlert className="w-8 h-8 text-red-500 mb-2" />
                <span className="text-2xl font-bebas text-white">{validationStats.invalid}</span>
                <span className="text-xs text-gray-400 font-inter uppercase">Invalid / Missing Data</span>
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-lg border border-white/10 bg-black/50 p-4 mb-6">
              {rawData.slice(0, 50).map((p, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                  <span className="text-white font-inter text-sm">{p.name || 'MISSING NAME'}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-gray-400 font-mono text-xs">{p.email || 'MISSING EMAIL'}</span>
                    <span className={`text-xs font-mono px-2 py-1 rounded ${
                      p.status === 'valid' ? 'bg-primary/20 text-primary' : 
                      p.status === 'duplicate' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-red-500/20 text-red-500'
                    }`}>
                      {p.status?.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
              {rawData.length > 50 && (
                <div className="text-center py-4 text-gray-500 text-xs font-mono">
                  + {rawData.length - 50} MORE RECORDS
                </div>
              )}
            </div>

            <div className="mb-6 p-4 border border-white/10 bg-white/5 rounded-lg flex items-center justify-between">
              <div>
                <h4 className="font-bebas text-white tracking-widest text-lg">DUPLICATE HANDLING STRATEGY</h4>
                <p className="text-sm font-inter text-gray-400">Choose how to handle existing email addresses during import.</p>
              </div>
              <select
                value={duplicateStrategy}
                onChange={(e) => setDuplicateStrategy(e.target.value as 'skip' | 'update')}
                className="bg-black/50 border border-white/20 text-white rounded px-4 py-2 text-sm font-inter focus:border-primary outline-none"
              >
                <option value="skip">Skip Existing Records</option>
                <option value="update">Update Existing Names</option>
              </select>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setStep(1)}>CANCEL</Button>
              <Button onClick={handleProcessImport} disabled={validationStats.valid === 0 && validationStats.duplicates === 0}>
                PROVISION {validationStats.valid + (duplicateStrategy === 'update' ? validationStats.duplicates : 0)} ACCOUNTS
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Provisioning Accounts...</CardTitle>
          </CardHeader>
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-8" />
            <h3 className="text-2xl font-bebas tracking-widest text-white mb-2">CREATING CREDENTIALS</h3>
            <p className="text-gray-400 font-inter text-sm mb-6">Generating Firebase accounts and assigning sequential IDs...</p>
            
            <div className="w-full max-w-md mx-auto bg-white/5 rounded-full h-2 mb-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            <p className="font-mono text-xs text-primary">{progress.current} / {progress.total}</p>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Import Complete</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-green-500/10 border border-green-500/20 p-6 rounded-lg text-center mb-8">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-3xl font-bebas tracking-widest text-white mb-2">PROVISIONING SUCCESSFUL</h3>
              <p className="text-green-400 font-inter text-sm">
                Successfully created {processedData.filter(d => d.status === 'success').length} accounts.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-xl text-center">
              <h4 className="text-white font-bebas text-xl tracking-widest mb-2">DOWNLOAD CREDENTIALS EXCEL</h4>
              <p className="text-gray-400 font-inter text-sm mb-6">
                You must download this file now. It contains the temporary passwords for all participants. These cannot be retrieved later.
              </p>
              
              <Button onClick={downloadResults} size="lg" className="gap-2">
                <Download className="w-5 h-5" /> EXPORT TO EXCEL
              </Button>
            </div>

            <div className="mt-8 flex justify-center">
              <Button variant="outline" onClick={() => { setStep(1); setRawData([]); setProcessedData([]); }}>
                IMPORT ANOTHER FILE
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
