import React, { useEffect, useState } from 'react';
import { Settings, Save, AlertTriangle, Plus, Edit2, Trash2, ShoppingBag, Clock } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input, Label } from '../../../components/ui/Form';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/ToastContext';
import { EventConfigService } from '@shared/services/EventConfigService';
import { useAuth } from '@shared/contexts/AuthContext';
import type { CatalogItem, CatalogItemType, EventTimelineItem } from '@shared/types/models';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, storage } from '@shared/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export default function EventSettings() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [generatedIds, setGeneratedIds] = useState<Array<{ name: string, email: string, newId: string }> | null>(null);
  
  // Local form state
  const [formData, setFormData] = useState({
    activeRoundId: '',
    isRegistrationOpen: false,
    registrationFeeAmount: 1500,
    registrationDeadline: '',
    hackathonDateDisplay: '',
    day1DateDisplay: '',
    day2DateDisplay: '',
    isHackathonActive: false,
    announcementsEnabled: false,
    trackSelectionLocked: false,
    showFoodIncluded: false,
  });
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [timeline, setTimeline] = useState<EventTimelineItem[]>([]);
  
  // Catalog Modal State
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Timeline Modal State
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [editingTimelineItem, setEditingTimelineItem] = useState<EventTimelineItem | null>(null);

  useEffect(() => {
    const unsubConfig = EventConfigService.subscribeToConfig((config) => {
      if (config) {
        setFormData({
          activeRoundId: config.activeRoundId || '',
          isRegistrationOpen: config.isRegistrationOpen || false,
          registrationFeeAmount: config.registrationFeeAmount || 1500,
          registrationDeadline: config.registrationDeadline || '',
          hackathonDateDisplay: config.hackathonDateDisplay || '',
          day1DateDisplay: config.day1DateDisplay || '',
          day2DateDisplay: config.day2DateDisplay || '',
          isHackathonActive: config.isHackathonActive || false,
          announcementsEnabled: config.announcementsEnabled || false,
          trackSelectionLocked: config.trackSelectionLocked || false,
          showFoodIncluded: config.showFoodIncluded || false,
        });
        setTimeline(config.timeline || []);
      }
    });
    
    const unsubCatalog = onSnapshot(collection(db, 'eventProducts'), (snap) => {
      const prods: CatalogItem[] = [];
      snap.forEach(document => {
        prods.push({ id: document.id, ...document.data() } as CatalogItem);
      });
      setCatalog(prods);
    });
    
    return () => {
      unsubConfig();
      unsubCatalog();
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    try {
      await EventConfigService.updateConfig({
        activeRoundId: formData.activeRoundId,
        isRegistrationOpen: formData.isRegistrationOpen,
        registrationFeeAmount: formData.registrationFeeAmount,
        registrationDeadline: formData.registrationDeadline,
        hackathonDateDisplay: formData.hackathonDateDisplay,
        day1DateDisplay: formData.day1DateDisplay,
        day2DateDisplay: formData.day2DateDisplay,
        isHackathonActive: formData.isHackathonActive,
        announcementsEnabled: formData.announcementsEnabled,
        trackSelectionLocked: formData.trackSelectionLocked,
        showFoodIncluded: formData.showFoodIncluded,
        timeline: timeline
      }, user.uid);
      success('Event settings updated successfully');
    } catch (err: any) {
      toastError('Failed to update settings', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCatalogItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    
    const itemToSave = {
      ...editingItem,
      id: editingItem.id || `${editingItem.type}-${editingItem.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now().toString().slice(-4)}`,
      isActive: true,
      purchaseEnabled: true,
      redemptionEnabled: true
    };

    try {
      await setDoc(doc(db, 'eventProducts', itemToSave.id), itemToSave, { merge: true });
      success('Catalog item saved to live catalog');
      setIsCatalogModalOpen(false);
      setEditingItem(null);
    } catch (err: any) {
      toastError('Failed to save item', err.message);
    }
  };

  const handleDeleteCatalogItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this catalog item? This may affect pending payments.')) return;
    try {
      await deleteDoc(doc(db, 'eventProducts', id));
      success('Catalog item removed');
    } catch (err: any) {
      toastError('Failed to delete item', err.message);
    }
  };

  const handleSaveTimelineItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTimelineItem) return;
    
    const itemToSave = {
      ...editingTimelineItem,
      id: editingTimelineItem.id || `timeline-${Date.now().toString()}`
    };

    setTimeline(prev => {
      const exists = prev.find(i => i.id === itemToSave.id);
      if (exists) return prev.map(i => i.id === itemToSave.id ? itemToSave : i);
      return [...prev, itemToSave].sort((a, b) => {
        const timeA = a.time.includes('T') ? a.time.split('T')[1] : a.time;
        const timeB = b.time.includes('T') ? b.time.split('T')[1] : b.time;
        return timeA.localeCompare(timeB);
      });
    });
    
    setIsTimelineModalOpen(false);
    setEditingTimelineItem(null);
  };

  const handleDeleteTimelineItem = (id: string) => {
    if (!confirm('Are you sure you want to delete this timeline event?')) return;
    setTimeline(prev => prev.filter(i => i.id !== id));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingItem) return;
    
    setIsUploadingImage(true);
    try {
      const storageRef = ref(storage, `catalog/${Date.now()}_${file.name.replace(/\s+/g, '_')}`);
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on('state_changed', 
        () => {}, 
        (error) => {
          toastError('Upload failed', error.message);
          setIsUploadingImage(false);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setEditingItem({ ...editingItem, imageUrl: downloadURL });
          setIsUploadingImage(false);
        }
      );
    } catch (err: any) {
      toastError('Upload error', err.message);
      setIsUploadingImage(false);
    }
  };

  const openNewCatalogModal = () => {
    setEditingItem({ id: '', name: '', price: 0, type: 'addon', description: '', imageUrl: '' });
    setIsCatalogModalOpen(true);
  };

  const openNewTimelineModal = () => {
    setEditingTimelineItem({ id: '', title: '', description: '', time: '', day: 1 });
    setIsTimelineModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-bebas text-4xl tracking-widest text-white">EVENT <span className="text-primary">SETTINGS</span></h2>
        <p className="font-inter text-gray-400">Manage global configuration for GLITCH 36</p>
      </div>

      <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 shrink-0" />
        <div>
          <h4 className="text-sm font-medium text-yellow-500 font-inter mb-1">Architecture Frozen</h4>
          <p className="text-sm text-yellow-500/80 font-inter">
            Extended event metadata (Name, Edition, Venue, Tracks) cannot be configured because the backend architecture is frozen. Date display strings can now be configured below.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-medium text-white font-inter">Core Toggles</h3>
          </div>
          
          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
              <div>
                <span className="block text-sm font-medium text-white font-inter">Registration Open</span>
                <span className="block text-xs text-gray-400 mt-0.5 font-inter">Allow new participants to register and form teams</span>
              </div>
              <div className="relative inline-block w-12 h-6 rounded-full transition-colors">
                <input type="checkbox" name="isRegistrationOpen" checked={formData.isRegistrationOpen} onChange={handleChange} className="peer sr-only" />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </div>
            </label>


            <label className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
              <div>
                <span className="block text-sm font-medium text-white font-inter">Announcements Enabled</span>
                <span className="block text-xs text-gray-400 mt-0.5 font-inter">Allow push of global announcements to dashboards</span>
              </div>
              <div className="relative inline-block w-12 h-6 rounded-full transition-colors">
                <input type="checkbox" name="announcementsEnabled" checked={formData.announcementsEnabled} onChange={handleChange} className="peer sr-only" />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </div>
            </label>

            <label className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
              <div>
                <span className="block text-sm font-medium text-white font-inter">Lock Track Selection</span>
                <span className="block text-xs text-gray-400 mt-0.5 font-inter">Prevent teams from selecting or changing tracks.</span>
              </div>
              <div className="relative inline-block w-12 h-6 rounded-full transition-colors">
                <input type="checkbox" name="trackSelectionLocked" checked={formData.trackSelectionLocked} onChange={handleChange} className="peer sr-only" />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </div>
            </label>

            <label className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
              <div>
                <span className="block text-sm font-medium text-white font-inter">Show Food Included Notice</span>
                <span className="block text-xs text-gray-400 mt-0.5 font-inter">Display '1 Breakfast & 1 Dinner Included' on registration and landing pages.</span>
              </div>
              <div className="relative inline-block w-12 h-6 rounded-full transition-colors">
                <input 
                  type="checkbox" 
                  name="showFoodIncluded"
                  checked={formData.showFoodIncluded}
                  onChange={handleChange}
                  className="peer sr-only" 
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </div>
            </label>

            <div className="flex items-center justify-between p-4 bg-black/50 rounded-lg border border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <h4 className="font-bebas text-xl text-white tracking-wider">Registration Fee (INR)</h4>
                  <p className="text-sm text-gray-400 font-inter">Base price a team must pay to register.</p>
                </div>
              </div>
              <div className="w-32">
                <Input 
                  type="number"
                  min={0}
                  value={formData.registrationFeeAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, registrationFeeAmount: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-black/50 rounded-lg border border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h4 className="font-bebas text-xl text-white tracking-wider">REGISTRATION DEADLINE</h4>
                  <p className="text-sm text-gray-400 font-inter">Global deadline for participants. Empty means no visible deadline.</p>
                </div>
              </div>
              <div className="w-48">
                <Input 
                  type="datetime-local"
                  name="registrationDeadline"
                  value={
                    formData.registrationDeadline 
                      ? new Date(new Date(formData.registrationDeadline).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) 
                      : ''
                  }
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    registrationDeadline: e.target.value ? new Date(e.target.value).toISOString() : '' 
                  }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-black/50 rounded-lg border border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h4 className="font-bebas text-xl text-white tracking-wider">HACKATHON DATE DISPLAY</h4>
                  <p className="text-sm text-gray-400 font-inter">The date string shown in the UI (e.g. "OCTOBER 10-11, 2026").</p>
                </div>
              </div>
              <div className="w-48">
                <Input 
                  type="text"
                  name="hackathonDateDisplay"
                  value={formData.hackathonDateDisplay}
                  onChange={handleChange}
                  placeholder="OCTOBER 24-25, 2026"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-black/50 rounded-lg border border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h4 className="font-bebas text-xl text-white tracking-wider">DAY 1 DATE DISPLAY</h4>
                  <p className="text-sm text-gray-400 font-inter">Shown in Timeline (e.g. "(OCT 24)")</p>
                </div>
              </div>
              <div className="w-48">
                <Input 
                  type="text"
                  name="day1DateDisplay"
                  value={formData.day1DateDisplay}
                  onChange={handleChange}
                  placeholder="(OCT 24)"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-black/50 rounded-lg border border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h4 className="font-bebas text-xl text-white tracking-wider">DAY 2 DATE DISPLAY</h4>
                  <p className="text-sm text-gray-400 font-inter">Shown in Timeline (e.g. "(OCT 25)")</p>
                </div>
              </div>
              <div className="w-48">
                <Input 
                  type="text"
                  name="day2DateDisplay"
                  value={formData.day2DateDisplay}
                  onChange={handleChange}
                  placeholder="(OCT 25)"
                />
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-white/10 flex justify-end">
             <Button type="submit" variant="primary" leftIcon={Save} isLoading={isSaving}>
               Save Configuration
             </Button>
          </div>
        </Card>
      </form>

      {/* Timeline Manager */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-medium text-white font-inter">Event Timeline</h3>
          </div>
          <Button variant="primary" size="sm" leftIcon={Plus} onClick={openNewTimelineModal}>Add Event</Button>
        </div>
        
        <div className="space-y-4">
          {timeline.length > 0 ? (
            timeline.map(item => {
              const d = new Date(item.time);
              const formattedTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const formattedDate = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
              
              return (
                <div key={item.id} className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-black/40 rounded-lg text-center min-w-[80px]">
                      <div className="text-xs text-gray-400 uppercase tracking-widest">DAY {item.day}</div>
                      <div className="text-lg font-bebas text-primary mt-1">{formattedTime}</div>
                      <div className="text-xs text-gray-500 font-inter">{formattedDate}</div>
                    </div>
                    <div>
                      <h4 className="font-bebas text-xl text-white tracking-wide">{item.title}</h4>
                      <p className="text-sm text-gray-400 font-inter mt-1">{item.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => { setEditingTimelineItem(item); setIsTimelineModalOpen(true); }} className="p-2 bg-black/50 text-blue-400 hover:text-blue-300 rounded">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => handleDeleteTimelineItem(item.id)} className="p-2 bg-black/50 text-red-400 hover:text-red-300 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-gray-500 font-inter border border-dashed border-white/10 rounded-xl flex flex-col items-center gap-4">
              <p>No timeline events configured. Click "Add Event" to create your schedule.</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  const defaultEvents: EventTimelineItem[] = [
                    { id: '1', time: '2026-01-01T08:00', day: 1, title: 'Registration & Check-In', description: 'Get your swag bags, ID badges, and find your designated hacking stations.' },
                    { id: '2', time: '2026-01-01T09:00', day: 1, title: 'Opening Ceremony', description: 'Keynote speakers, track announcements, and the official start countdown.' },
                    { id: '3', time: '2026-01-01T10:00', day: 1, title: 'Problem Statement Release', description: 'The official problem statements are revealed to all participants.' },
                    { id: '4', time: '2026-01-01T10:30', day: 1, title: 'Hackathon Begins 🚀', description: '36 hours on the clock. Start building.' },
                    { id: '5', time: '2026-01-01T15:00', day: 1, title: 'Mentorship Session', description: 'Industry experts will circulate to provide feedback on initial architecture.' },
                    { id: '6', time: '2026-01-01T19:00', day: 1, title: 'Dinner Break 🍽️', description: 'Fuel up for the night shift.' },
                    { id: '7', time: '2026-01-01T21:00', day: 1, title: 'Progress Checkpoint', description: 'Quick check-in on your team\'s progress.' },
                    { id: '8', time: '2026-01-01T23:00', day: 1, title: 'Fun & Networking Session 🎉', description: 'Take a break, play some games, and network with other hackers.' },
                    { id: '9', time: '2026-01-01T08:00', day: 2, title: 'Breakfast & Refresh', description: 'Morning fuel to push through the final stretch.' },
                    { id: '10', time: '2026-01-01T11:00', day: 2, title: 'Final Checkpoint', description: 'Last mentor feedback before submissions.' },
                    { id: '11', time: '2026-01-01T13:00', day: 2, title: 'Final Submission 📥', description: 'Keyboards down. Code freeze and project submissions.' },
                    { id: '12', time: '2026-01-01T14:00', day: 2, title: 'Project Evaluation ⚖️', description: 'Present your solutions to the judges.' },
                    { id: '13', time: '2026-01-01T17:30', day: 2, title: 'Results & Prize Distribution 🏆', description: 'Winners announced and prizes distributed.' },
                    { id: '14', time: '2026-01-01T20:30', day: 2, title: 'Closing Ceremony 🎊', description: 'Official closing of the hackathon.' },
                  ];
                  setTimeline(defaultEvents);
                  toastError('Timeline Loaded', 'Click Save Timeline Changes to confirm.');
                }}
              >
                Load Default Timeline Data
              </Button>
            </div>
          )}
        </div>
        
        <div className="mt-6 flex justify-end">
          <Button onClick={() => handleSave()} variant="primary" leftIcon={Save} isLoading={isSaving}>
            Save Timeline Changes
          </Button>
        </div>
      </Card>

      {/* Catalog Manager */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-medium text-white font-inter">Add-on Catalog (Payments)</h3>
          </div>
          <Button variant="primary" size="sm" leftIcon={Plus} onClick={openNewCatalogModal}>Add Item</Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {catalog.map(item => (
            <div key={item.id} className="p-4 bg-white/5 border border-white/10 rounded-xl relative group">
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button type="button" onClick={() => { setEditingItem(item); setIsCatalogModalOpen(true); }} className="p-1.5 bg-black/50 text-blue-400 hover:text-blue-300 rounded">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => handleDeleteCatalogItem(item.id)} className="p-1.5 bg-black/50 text-red-400 hover:text-red-300 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              {item.imageUrl && (
                <div className="w-full h-32 bg-black/50 rounded-lg mb-3 overflow-hidden">
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity" />
                </div>
              )}
              
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bebas text-xl text-white tracking-wide">{item.name}</h4>
              </div>
              
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm font-mono text-gray-400">{item.id}</span>
                <span className="font-inter text-green-400 font-medium">₹{item.price}</span>
              </div>
              
              <div className="mt-2 text-xs font-inter text-gray-500 uppercase tracking-widest bg-white/10 w-max px-2 py-1 rounded">
                {item.type}
              </div>
            </div>
          ))}
          {catalog.length === 0 && (
            <div className="col-span-full p-8 text-center text-gray-500 font-inter border border-dashed border-white/10 rounded-xl">
              No catalog items configured. Click "Add Item" to create one.
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={() => handleSave()} variant="primary" leftIcon={Save} isLoading={isSaving}>
            Save Catalog Changes
          </Button>
        </div>
      </Card>

      {/* Timeline Modal */}
      <Modal isOpen={isTimelineModalOpen} onClose={() => { setIsTimelineModalOpen(false); setEditingTimelineItem(null); }} title={editingTimelineItem?.id ? "Edit Timeline Event" : "New Timeline Event"} size="lg">
        {editingTimelineItem && (
          <form onSubmit={handleSaveTimelineItem} className="space-y-4">
            <div>
              <Label>Event Title</Label>
              <Input required value={editingTimelineItem.title} onChange={e => setEditingTimelineItem({...editingTimelineItem, title: e.target.value})} placeholder="e.g. Opening Ceremony" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Time</Label>
                <Input 
                  required 
                  type="time" 
                  value={editingTimelineItem.time ? editingTimelineItem.time.slice(11, 16) : ''}
                  onChange={e => setEditingTimelineItem({
                    ...editingTimelineItem, 
                    time: e.target.value ? `2026-01-01T${e.target.value}` : ''
                  })} 
                />
              </div>
              
              <div>
                <Label>Event Day (1 or 2)</Label>
                <Input required type="number" min="1" max="5" value={editingTimelineItem.day} onChange={e => setEditingTimelineItem({...editingTimelineItem, day: Number(e.target.value)})} />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Input required value={editingTimelineItem.description} onChange={e => setEditingTimelineItem({...editingTimelineItem, description: e.target.value})} placeholder="Brief description of what happens" />
            </div>
            
            <div className="pt-4 flex justify-end">
              <Button type="submit" variant="primary">Confirm Event</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Catalog Modal */}
      <Modal isOpen={isCatalogModalOpen} onClose={() => { setIsCatalogModalOpen(false); setEditingItem(null); }} title={editingItem?.id ? "Edit Catalog Item" : "New Catalog Item"} size="2xl">
        {editingItem && (
          <form onSubmit={handleSaveCatalogItem} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Item Name</Label>
                <Input required value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} placeholder="e.g. Day 1 Meals" />
              </div>
              
              <div>
                <Label>Price (₹)</Label>
                <Input required type="number" min="0" value={editingItem.price} onChange={e => setEditingItem({...editingItem, price: Number(e.target.value)})} />
              </div>
              
              <div>
                <Label>Type</Label>
                <select 
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary/50 font-inter text-sm"
                  value={editingItem.type} 
                  onChange={e => setEditingItem({...editingItem, type: e.target.value as CatalogItemType})}
                >
                  <option value="registration">Registration</option>
                  <option value="food">Food</option>
                  <option value="swag">Swag / Merch</option>
                  <option value="stay">Stay / Accommodation</option>
                  <option value="addon">Other Addon</option>
                </select>
              </div>

              <div className="col-span-2">
                <Label>Description (Optional)</Label>
                <Input value={editingItem.description || ''} onChange={e => setEditingItem({...editingItem, description: e.target.value})} placeholder="Brief description of the item" />
              </div>

              <div className="col-span-2 space-y-4">
                <div>
                  <Label>Image URL (Optional)</Label>
                  <Input value={editingItem.imageUrl || ''} onChange={e => setEditingItem({...editingItem, imageUrl: e.target.value})} placeholder="https://..." />
                </div>
                <div className="text-gray-500 font-inter text-sm w-full text-center border-b border-white/10 pb-2">
                  OR UPLOAD IMAGE
                </div>
                <div>
                  <Input 
                    type="file" 
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploadingImage}
                  />
                  {isUploadingImage && <p className="text-xs text-primary mt-1 font-inter">Uploading image...</p>}
                </div>
              </div>
            </div>
            
            <div className="pt-4 flex justify-end">
              <Button type="submit" variant="primary">Confirm & Add to Draft</Button>
            </div>
          </form>
        )}
      </Modal>
      {/* Generated IDs Modal */}
      {generatedIds && (
        <Modal title="Missing IDs Generated" onClose={() => setGeneratedIds(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-400 font-inter">
              Successfully assigned new IDs to {generatedIds.length} participants.
            </p>
            <div className="max-h-[60vh] overflow-y-auto bg-gray-800/50 rounded-lg p-2 border border-white/5">
              {generatedIds.map(p => (
                <div key={p.newId} className="flex flex-col p-2 border-b border-white/5 last:border-0">
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-medium text-white">{p.name}</span>
                    <span className="text-xs font-bebas text-primary tracking-widest">{p.newId}</span>
                  </div>
                  <span className="text-xs text-gray-500">{p.email}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={() => setGeneratedIds(null)} variant="primary">Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
