import React, { useState, useEffect, useMemo } from 'react';
import { ShieldCheck, UserPlus, Download, Mail, Phone, Shield, MapPin, Calendar, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { DataTable, type Column } from '../../../components/ui/DataTable';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { ParticipantService } from '@shared/services/ParticipantService';
import { AssignmentService } from '@shared/services/AssignmentService';
import { useAuth } from '@shared/contexts/AuthContext';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@shared/lib/firebase';
import { Drawer } from '../../../components/ui/Drawer';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string; // legacy fallback
  roles?: string[];
  status: string;
  staffId: string;
  assignedClassroom?: string;
  currentRound?: number;
  availabilityStatus?: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE' | 'ON_BREAK' | 'OFF_SHIFT';
  availabilityReason?: string;
}

export default function StaffManagement() {
  const { role: currentUserRole } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [roles, setRoles] = useState<string[]>(['volunteer']);
  
  // Availability Drawer State
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [availabilityReason, setAvailabilityReason] = useState('');

  const handleRoleToggle = (roleId: string) => {
    setRoles(prev => 
      prev.includes(roleId) 
        ? prev.filter(r => r !== roleId)
        : [...prev, roleId]
    );
  };

  useEffect(() => {
    const unsubscribe = ParticipantService.subscribeToAllStaff((data) => {
      setStaff(data as StaffMember[]);
    });
    return () => unsubscribe();
  }, []);

  const handleQuickAvailability = async (staffId: string, status: 'AVAILABLE' | 'BUSY') => {
    try {
      await AssignmentService.markStaffAvailability(staffId, status);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDetailedAvailability = async () => {
    if (!selectedStaff) return;
    try {
      await AssignmentService.markStaffAvailability(selectedStaff.id, 'BUSY', availabilityReason);
      setSelectedStaff(null);
      setAvailabilityReason('');
    } catch (err) {
      console.error(err);
    }
  };

  const columns: Column<StaffMember>[] = useMemo(() => [
    {
      header: 'STAFF ID',
      accessorKey: 'staffId',
      cell: (row) => <span className="font-mono text-xs text-primary">{row.staffId}</span>
    },
    {
      header: 'NAME & ASSIGNMENT',
      accessorKey: 'name',
      cell: (row) => (
        <div>
          <span className="font-inter text-white block">{row.name}</span>
          {row.assignedClassroom && (
            <span className="font-mono text-xs text-green-400 flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3" /> {row.assignedClassroom}
            </span>
          )}
          {row.currentRound && (
            <span className="font-mono text-xs text-purple-400 flex items-center gap-1 mt-1">
              <Calendar className="w-3 h-3" /> Round {row.currentRound}
            </span>
          )}
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
      header: 'AVAILABILITY',
      accessorKey: 'availabilityStatus',
      cell: (row) => {
        const s = row.availabilityStatus || 'AVAILABLE';
        return (
          <div className="flex flex-col gap-1 items-start">
            <Badge variant="outline" className={s === 'AVAILABLE' ? 'text-green-400 border-green-400/50 bg-green-400/10' : s === 'BUSY' ? 'text-yellow-400 border-yellow-400/50 bg-yellow-400/10' : 'text-red-400 border-red-400/50 bg-red-400/10'}>
              {s}
            </Badge>
            {row.availabilityReason && <span className="text-[10px] text-gray-500 font-mono">{row.availabilityReason}</span>}
          </div>
        );
      }
    },
    {
      header: 'ACTIONS',
      accessorKey: 'id',
      cell: (row) => {
        const isBusy = row.availabilityStatus === 'BUSY' || row.availabilityStatus === 'UNAVAILABLE';
        return (
          <div className="flex gap-2">
            {isBusy ? (
              <Button size="sm" variant="outline" onClick={() => handleQuickAvailability(row.id, 'AVAILABLE')}>
                <CheckCircle2 className="w-3 h-3 mr-1" /> MAKE AVAIL
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => handleQuickAvailability(row.id, 'BUSY')}>
                <XCircle className="w-3 h-3 mr-1" /> MARK BUSY
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => setSelectedStaff(row)}>
              <Clock className="w-3 h-3 mr-1" /> DETAILS
            </Button>
          </div>
        );
      }
    }
  ], []);

  if (currentUserRole !== 'super_admin') {
    return null; // or Navigate component
  }

  const handleProvisionStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsProvisioning(true);

    if (!name || !email || roles.length === 0 || !customPassword) {
      setError('Name, email, password, and at least one role are required.');
      setIsProvisioning(false);
      return;
    }

    try {
      const createStaffFn = httpsCallable(functions, 'createStaff');
      await createStaffFn({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        roles,
        password: customPassword
      });

      setSuccess('Staff account provisioned successfully.');
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
                  <h4 className="text-green-500 font-bebas text-xl">{success}</h4>
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
                  <label className="block text-xs font-inter text-gray-400 mb-1">PASSWORD</label>
                  <input 
                    type="text" 
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    required
                    placeholder="Enter permanent password"
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
                      { id: 'class_coordinator', label: 'Class Coordinator' },
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

      <Drawer 
        isOpen={!!selectedStaff} 
        onClose={() => setSelectedStaff(null)} 
        title="Manage Availability"
      >
        {selectedStaff && (
          <div className="space-y-4">
            <p className="font-inter text-sm text-gray-400 mb-4">
              Update advanced availability for {selectedStaff.name}.
            </p>
            
            <div>
              <label className="block text-xs font-inter text-gray-400 mb-1">REASON / CONFLICT</label>
              <input 
                type="text" 
                value={availabilityReason}
                onChange={(e) => setAvailabilityReason(e.target.value)}
                placeholder="e.g. VIP Desk, Break, Registration"
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary/50 font-inter text-sm"
              />
            </div>
            
            <div className="pt-4 flex gap-3">
              <Button onClick={() => handleDetailedAvailability()} className="w-full">MARK BUSY</Button>
              <Button variant="outline" onClick={() => setSelectedStaff(null)} className="w-full">CANCEL</Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
