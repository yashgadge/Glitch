import React, { useState, useEffect } from 'react';
import { Mail, MessageSquare, Send, Users, AlertCircle } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input, Label } from '../../../components/ui/Form';
import { useToast } from '../../../components/ui/ToastContext';
import { AnnouncementService } from '../../../services/AnnouncementService';
import type { Role } from '../../../types/models';
import { useAuth } from '../../../contexts/AuthContext';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Badge } from '../../../components/ui/Badge';

export default function Communications() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  
  const [activeTab, setActiveTab] = useState<'announcements' | 'email'>('announcements');
  const [isSending, setIsSending] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  // Announcement Form
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetRoles, setTargetRoles] = useState<Role[]>(['participant']);
  const [priority, setPriority] = useState<'normal' | 'high'>('normal');

  // Email Form
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailTarget, setEmailTarget] = useState('all_participants');

  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setAnnouncements(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message || targetRoles.length === 0 || !user) {
      toastError('Validation Error', 'Title, message, and target audience are required.');
      return;
    }
    
    setIsSending(true);
    try {
      await AnnouncementService.createAnnouncement({
        title,
        message,
        targetRoles,
        priority,
        authorId: user.uid
      });
      success('Announcement Posted', 'The message is now live on the selected dashboards.');
      setTitle('');
      setMessage('');
    } catch (err: any) {
      toastError('Failed to post', err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    // Simulate email sending (SendGrid/Mailgun would go here)
    setTimeout(() => {
      success('Emails Queued', `Sending to ${emailTarget} via SendGrid.`);
      setIsSending(false);
      setEmailSubject('');
      setEmailBody('');
    }, 1500);
  };

  const toggleRole = (role: Role) => {
    setTargetRoles(prev => 
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div>
        <h2 className="font-bebas text-4xl tracking-widest text-white flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-primary" /> COMMUNICATIONS
        </h2>
        <p className="font-inter text-gray-400">Manage dashboard announcements and external email campaigns.</p>
      </div>

      <div className="flex gap-4 border-b border-white/10 pb-4">
        <Button 
          variant={activeTab === 'announcements' ? 'primary' : 'outline'} 
          onClick={() => setActiveTab('announcements')}
          leftIcon={MessageSquare}
        >
          Announcements Feed
        </Button>
        <Button 
          variant={activeTab === 'email' ? 'primary' : 'outline'} 
          onClick={() => setActiveTab('email')}
          leftIcon={Mail}
        >
          Email Campaigns
        </Button>
      </div>

      {activeTab === 'announcements' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
          <Card className="flex flex-col h-full max-h-[calc(100vh-250px)]">
            <div className="p-6 border-b border-white/10 bg-white/5">
              <h3 className="font-bebas text-xl text-white tracking-widest">POST ANNOUNCEMENT</h3>
            </div>
            <div className="p-6 overflow-y-auto">
              <form onSubmit={handlePostAnnouncement} className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Round 1 Results Published" />
                </div>
                <div>
                  <Label>Message Content</Label>
                  <textarea 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary/50 font-inter text-sm min-h-[120px]"
                    placeholder="Enter the full announcement text..."
                  />
                </div>
                <div>
                  <Label>Target Audience</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(['participant', 'judge', 'mentor', 'volunteer'] as Role[]).map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => toggleRole(r)}
                        className={`px-3 py-1 rounded-full text-xs font-mono tracking-wider border transition-colors ${
                          targetRoles.includes(r) ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/20 text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        {r.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Priority</Label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="priority" checked={priority === 'normal'} onChange={() => setPriority('normal')} className="text-primary focus:ring-primary" />
                      <span className="text-sm font-inter text-gray-300">Normal</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="priority" checked={priority === 'high'} onChange={() => setPriority('high')} className="text-primary focus:ring-primary" />
                      <span className="text-sm font-inter text-red-400">High (Alert)</span>
                    </label>
                  </div>
                </div>
                <Button type="submit" isLoading={isSending} leftIcon={Send} className="w-full mt-4">POST NOW</Button>
              </form>
            </div>
          </Card>

          <Card className="flex flex-col h-full max-h-[calc(100vh-250px)]">
            <div className="p-6 border-b border-white/10 bg-white/5">
              <h3 className="font-bebas text-xl text-white tracking-widest">RECENT ANNOUNCEMENTS</h3>
            </div>
            <div className="p-4 overflow-y-auto space-y-4">
              {announcements.map(a => (
                <div key={a.id} className="p-4 border border-white/10 rounded-xl bg-black/40">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-lg font-bebas text-white flex items-center gap-2">
                      {a.priority === 'high' && <AlertCircle className="w-4 h-4 text-red-500" />}
                      {a.title}
                    </h4>
                    <span className="text-xs text-gray-500 font-mono">{new Date(a.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-sm font-inter text-gray-300 mb-3">{a.message}</p>
                  <div className="flex flex-wrap gap-1">
                    {a.targetRoles.map((r: string) => (
                      <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>
                    ))}
                  </div>
                </div>
              ))}
              {announcements.length === 0 && (
                <div className="text-center p-8 text-gray-500 font-inter text-sm">No announcements posted yet.</div>
              )}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'email' && (
        <Card className="max-w-3xl">
          <div className="p-6 border-b border-white/10 bg-white/5">
            <h3 className="font-bebas text-xl text-white tracking-widest flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" /> COMPOSE MASS EMAIL
            </h3>
          </div>
          <div className="p-6">
            <form onSubmit={handleSendEmail} className="space-y-4">
              <div>
                <Label>Recipient Segment</Label>
                <select 
                  value={emailTarget}
                  onChange={(e) => setEmailTarget(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary/50 font-inter text-sm"
                >
                  <option className="bg-[#111]" value="all_participants">All Verified Participants</option>
                  <option className="bg-[#111]" value="qualified_round_2">Qualified for Round 2</option>
                  <option className="bg-[#111]" value="all_judges">All Active Judges</option>
                  <option className="bg-[#111]" value="all_mentors">All Mentors</option>
                </select>
              </div>
              <div>
                <Label>Subject Line</Label>
                <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} required placeholder="GLITCH 36: Important Update" />
              </div>
              <div>
                <Label>Email Body (HTML Supported)</Label>
                <textarea 
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  required
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary/50 font-inter text-sm min-h-[200px]"
                  placeholder="Dear participant,<br><br>Welcome to GLITCH 36..."
                />
              </div>
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl flex gap-3 text-sm font-inter text-primary">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>Mass emails are sent via SendGrid API asynchronously. Please ensure content is finalized before sending.</p>
              </div>
              <Button type="submit" isLoading={isSending} leftIcon={Send} className="w-full">SEND CAMPAIGN</Button>
            </form>
          </div>
        </Card>
      )}

    </div>
  );
}
