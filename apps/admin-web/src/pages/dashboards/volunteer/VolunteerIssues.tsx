import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input, Label, Textarea, Select } from '../../../components/ui/Form';
import { AlertCircle, Plus, ShieldAlert } from 'lucide-react';
import { useAuth } from '@shared/contexts/AuthContext';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '@shared/lib/firebase';
import { useToast } from '../../../components/ui/ToastContext';
import { Modal } from '../../../components/ui/Modal';
import { Badge } from '../../../components/ui/Badge';
import { ParticipantService } from '@shared/services/ParticipantService';

interface Issue {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved';
  reporterId: string;
  reporterName: string;
  location: string;
  createdAt: any;
}

export default function VolunteerIssues() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reporterName, setReporterName] = useState('Volunteer');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [location, setLocation] = useState('');

  useEffect(() => {
    if (!user) return;
    ParticipantService.getStaffProfile(user.uid).then(p => {
      if (p) setReporterName(p.name);
    });

    const q = query(
      collection(db, 'incidents'),
      where('reporterId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Issue));
      setIssues(data);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'incidents'), {
        title,
        description,
        priority,
        location,
        status: 'open',
        reporterId: user.uid,
        reporterName,
        createdAt: serverTimestamp()
      });
      success('Issue Reported', 'Organizers have been notified.');
      setIsModalOpen(false);
      setTitle('');
      setDescription('');
      setPriority('medium');
      setLocation('');
    } catch (err: any) {
      error('Failed to report issue', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-end border-b border-white/10 pb-4">
        <div>
          <h2 className="font-bebas text-4xl tracking-widest text-white flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-primary" /> ISSUES & HELP
          </h2>
          <p className="font-inter text-gray-400">Log incidents or request help from organizers.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> REPORT ISSUE
        </Button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <p className="text-gray-500 animate-pulse font-bebas text-xl">Loading...</p>
        ) : issues.length === 0 ? (
          <Card className="p-12 text-center bg-black/20 border-dashed border-white/10">
            <ShieldAlert className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="font-bebas text-2xl text-gray-400">NO ISSUES REPORTED</h3>
            <p className="font-inter text-gray-500 mt-2 max-w-sm mx-auto">
              You haven't reported any issues yet. Click the button above to request help or report an incident.
            </p>
          </Card>
        ) : (
          issues.map(issue => (
            <Card key={issue.id} className="p-5 bg-black/40 border border-white/10 flex flex-col md:flex-row justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Badge variant={issue.status === 'open' ? 'danger' : issue.status === 'in_progress' ? 'warning' : 'success'}>
                    {issue.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className={`
                    ${issue.priority === 'critical' ? 'border-red-500 text-red-500' : ''}
                    ${issue.priority === 'high' ? 'border-orange-500 text-orange-500' : ''}
                    ${issue.priority === 'medium' ? 'border-yellow-500 text-yellow-500' : ''}
                    ${issue.priority === 'low' ? 'border-blue-500 text-blue-500' : ''}
                  `}>
                    {issue.priority.toUpperCase()} PRIORITY
                  </Badge>
                </div>
                <h4 className="font-bebas text-2xl text-white">{issue.title}</h4>
                <p className="font-inter text-sm text-gray-400 mt-1">{issue.description}</p>
                <div className="flex items-center gap-4 mt-3 text-xs font-mono text-gray-500">
                  <span>Location: {issue.location || 'Not specified'}</span>
                  {issue.createdAt && <span>Reported: {new Date(issue.createdAt.toDate()).toLocaleString()}</span>}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Report New Issue">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Issue Title</Label>
            <Input 
              required 
              placeholder="Brief summary of the issue"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>
          <div>
            <Label>Location / Gate</Label>
            <Input 
              required 
              placeholder="e.g., Main Gate, Desk 3"
              value={location}
              onChange={e => setLocation(e.target.value)}
            />
          </div>
          <div>
            <Label>Priority</Label>
            <Select 
              value={priority} 
              onChange={e => setPriority(e.target.value as any)}
            >
              <option value="low">Low - Minor inconvenience</option>
              <option value="medium">Medium - Needs attention soon</option>
              <option value="high">High - Blocking operations</option>
              <option value="critical">Critical - Emergency / Security</option>
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea 
              required
              rows={4}
              placeholder="Detailed explanation of what happened and what help is needed..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={submitting}>
              CANCEL
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              SUBMIT ISSUE
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
