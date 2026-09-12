import React, { useEffect, useState } from 'react';
import { Settings, Save, AlertTriangle, Trophy } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input, Label } from '../../../components/ui/Form';
import { useToast } from '../../../components/ui/ToastContext';
import { EventConfigService } from '../../../services/EventConfigService';
import { useAuth } from '../../../contexts/AuthContext';

export default function EventSettings() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  // Local form state
  const [formData, setFormData] = useState({
    activeRoundId: '',
    isRegistrationOpen: false,
    isHackathonActive: false,
    announcementsEnabled: false,
  });

  useEffect(() => {
    const unsubConfig = EventConfigService.subscribeToConfig((data) => {
      if (data) {
        setFormData({
          activeRoundId: data.activeRoundId,
          isRegistrationOpen: data.isRegistrationOpen,
          isHackathonActive: data.isHackathonActive,
          announcementsEnabled: data.announcementsEnabled,
        });
      }
    });

    // We can't fetch all rounds perfectly since RoundService only has active round subscription currently,
    // but we'll assume a method exists or we can only select active round.
    // Wait, RoundService only has subscribeToActiveRound. We might not be able to list all rounds.
    // We will leave the round selection as a simple text input or disabled if we can't query all rounds yet.
    // Actually, I can use a standard Firestore query here or just allow editing the ID manually for now.
    
    return () => {
      unsubConfig();
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    try {
      await EventConfigService.updateConfig({
        activeRoundId: formData.activeRoundId,
        isRegistrationOpen: formData.isRegistrationOpen,
        isHackathonActive: formData.isHackathonActive,
        announcementsEnabled: formData.announcementsEnabled
      }, user.uid);
      success('Event settings updated successfully');
    } catch (err: any) {
      toastError('Failed to update settings', err.message);
    } finally {
      setIsSaving(false);
    }
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
            Extended event metadata (Name, Edition, Venue, Dates, Tracks) cannot be configured because the backend architecture is frozen and `EventConfig` model does not support these fields. Proceeding with supported toggles only.
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
                <input 
                  type="checkbox" 
                  name="isRegistrationOpen"
                  checked={formData.isRegistrationOpen}
                  onChange={handleChange}
                  className="peer sr-only" 
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </div>
            </label>

            <label className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
              <div>
                <span className="block text-sm font-medium text-white font-inter">Hackathon Active</span>
                <span className="block text-xs text-gray-400 mt-0.5 font-inter">Enable core functionality for active event runtime</span>
              </div>
              <div className="relative inline-block w-12 h-6 rounded-full transition-colors">
                <input 
                  type="checkbox" 
                  name="isHackathonActive"
                  checked={formData.isHackathonActive}
                  onChange={handleChange}
                  className="peer sr-only" 
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </div>
            </label>

            <label className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
              <div>
                <span className="block text-sm font-medium text-white font-inter">Announcements Enabled</span>
                <span className="block text-xs text-gray-400 mt-0.5 font-inter">Allow push of global announcements to dashboards</span>
              </div>
              <div className="relative inline-block w-12 h-6 rounded-full transition-colors">
                <input 
                  type="checkbox" 
                  name="announcementsEnabled"
                  checked={formData.announcementsEnabled}
                  onChange={handleChange}
                  className="peer sr-only" 
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </div>
            </label>
          </div>
        </Card>

        <Card className="p-6 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-medium text-white font-inter">Round Configuration</h3>
          </div>
          
          <div>
            <Label>Active Round ID</Label>
            <Input 
              name="activeRoundId"
              value={formData.activeRoundId}
              onChange={handleChange}
              placeholder="e.g. round_1"
              required
            />
            <p className="text-xs text-gray-500 mt-2 font-inter">
              Controls which round is currently active across all dashboards. Must match an existing Round Document ID.
            </p>
          </div>

          <div className="pt-6 border-t border-white/10 flex justify-end">
             <Button type="submit" variant="primary" leftIcon={Save} isLoading={isSaving}>
               Save Configuration
             </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
