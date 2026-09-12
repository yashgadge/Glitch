import React, { useState, useEffect } from 'react';
import { ShieldCheck, UserPlus, Download, Mail, Phone, Shield } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { DataTable, type Column } from '../../../components/ui/DataTable';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { ParticipantService } from '../../../services/ParticipantService';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../../../contexts/AuthContext';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string; // legacy fallback
  roles?: string[];
  status: string;
  staffId: string;
}

const columns: Column<StaffMember>[] = [
  {
    header: 'STAFF ID',
    accessorKey: 'staffId',
    cell: (row) => <span className="font-mono text-xs text-primary">{row.staffId}</span>
  },
  {
    header: 'NAME',
    accessorKey: 'name',
    cell: (row) => <span className="font-inter text-white">{row.name}</span>
  },
  {
    header: 'CONTACT',
    accessorKey: 'email',
    cell: (row) => (
      <div className="flex flex-col gap-1">
        <span className="font-mono text-xs text-gray-400 flex items-center gap-1"><Mail className="w-3 h-3" />{row.email}</span>
        {row.phone && <span className="font-mono text-xs text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3" />{row.phone}</span>}
      </div>
    )
  },
  {
    header: 'ROLES',
    accessorKey: 'roles',
    cell: (row) => {
      const displayRoles = row.roles || (row.role ? [row.role] : []);
      return (
        <div className="flex flex-wrap gap-1">
          {displayRoles.map((r, i) => (
            <Badge key={i} variant="outline" className="uppercase font-mono tracking-wider text-[10px]">
              {r.replace('_', ' ')}
            </Badge>
          ))}
        </div>
      );
    }
  },
  {
    header: 'STATUS',
    accessorKey: 'status',
    cell: (row) => (
      <Badge variant={row.status === 'Active' ? 'default' : 'outline'} className={row.status === 'Active' ? 'bg-green-500/20 text-green-500 border-green-500/50' : 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50'}>
        {String(row.status).toUpperCase()}
      </Badge>
    )
  }
];

export default function StaffManagement() {
  const { role: currentUserRole } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newCredentials, setNewCredentials] = useState<{email: string, pass: string} | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [roles, setRoles] = useState<string[]>(['volunteer']);

  const handleRoleToggle = (roleId: string) => {
    setRoles(prev => 
      prev.includes(roleId) 
        ? prev.filter(r => r !== roleId)
        : [...prev, roleId]
    );
  };

  useEffect(() => {
    const unsubscribe = ParticipantService.subscribeToAllStaff((data) => {
      setStaff(data);
    });
    return () => unsubscribe();
  }, []);

  if (currentUserRole !== 'super_admin') {
    return <Navigate to="/workspace" replace />;
  }

  const handleProvisionStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setNewCredentials(null);
    setIsProvisioning(true);

    if (!name || !email || roles.length === 0) {
      setError('Name, email, and at least one role are required.');
      setIsProvisioning(false);
      return;
    }

    try {
      const tempPass = customPassword.trim() || `STAFF-${Math.floor(1000 + Math.random() * 9000)}`;
      
      const functions = getFunctions();
      const createStaffFn = httpsCallable(functions, 'createStaff');
      
      const result = await createStaffFn({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        roles,
        tempPass
      });

      // Verification logic: the function logs the audit entry directly


      setSuccess('Staff account provisioned successfully.');
      setNewCredentials({ email, pass: tempPass });

      // Reset form
      setName('');
      setEmail('');
      setCustomPassword('');
      setPhone('');
      setRoles(['volunteer']);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to provision staff account.');
    } finally {
      setIsProvisioning(false);
    }
  };

  const downloadCredentials = () => {
    if (!newCredentials) return;
    const csv = `Email,Temporary Password\n${newCredentials.email},${newCredentials.pass}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `staff_credentials_${newCredentials.email}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bebas text-4xl tracking-widest text-white mb-2 flex items-center gap-2">
          <ShieldCheck className="w-8 h-8 text-primary" /> STAFF MANAGEMENT
        </h1>
        <p className="font-inter text-gray-400">Securely provision and manage internal platform staff.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Provisioning Form */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" /> PROVISION ACCOUNT
              </CardTitle>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm font-inter">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
                  <h4 className="text-green-500 font-bebas text-xl mb-2">{success}</h4>
                  <div className="bg-black/50 p-3 rounded-lg mb-4">
                    <p className="text-gray-400 text-xs font-inter mb-1">TEMPORARY PASSWORD</p>
                    <p className="text-white font-mono text-lg">{newCredentials?.pass}</p>
                  </div>
                  <Button onClick={downloadCredentials} className="w-full gap-2">
                    <Download className="w-4 h-4" /> EXPORT CREDENTIALS
                  </Button>
                </div>
              )}

              <form onSubmit={handleProvisionStaff} className="space-y-4">
                <div>
                  <label className="block text-xs font-inter text-gray-400 mb-1">FULL NAME</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary/50 font-inter text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-inter text-gray-400 mb-1">EMAIL ADDRESS</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary/50 font-inter text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-inter text-gray-400 mb-1">PASSWORD (Leave blank to auto-generate)</label>
                  <input 
                    type="text" 
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    placeholder="Auto-generated if empty"
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary/50 font-inter text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-inter text-gray-400 mb-1">PHONE NUMBER (Optional)</label>
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary/50 font-inter text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-inter text-gray-400 mb-2">ACCESS ROLES (Select Multiple)</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto bg-black/20 p-3 rounded-lg border border-white/5">
                    {[
                      { id: 'volunteer', label: 'Volunteer' },
                      { id: 'mentor', label: 'Mentor' },
                      { id: 'judge', label: 'Judge' },
                      { id: 'organizer', label: 'Organizer' },
                      { id: 'super_admin', label: 'Super Admin' }
                    ].map(r => (
                      <label key={r.id} onClick={() => handleRoleToggle(r.id)} className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-2 rounded transition-colors">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${roles.includes(r.id) ? 'bg-primary border-primary' : 'border-white/20'}`}>
                          {roles.includes(r.id) && <ShieldCheck className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-sm font-inter text-gray-300">{r.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={isProvisioning}
                  className="w-full mt-6"
                >
                  {isProvisioning ? 'PROVISIONING...' : 'CREATE ACCOUNT'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Staff Table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" /> ACTIVE STAFF DIRECTORY
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable 
                columns={columns} 
                data={staff} 
                searchable 
                searchKey="name" 
              />
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
