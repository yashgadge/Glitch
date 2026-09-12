import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input, Label } from '../../../components/ui/Form';
import { useToast } from '../../../components/ui/ToastContext';
import { TrackService } from '@shared/services/TrackService';
import type { Track, ProblemStatement } from '@shared/types/models';
import { Plus, Trash2, Edit2, Save, X, Eye, EyeOff, ChevronLeft, CheckCircle2, ArrowRightLeft, Upload } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { hackathonTracks, hackathonProblems } from './hackathonData';

export default function TrackManager() {
  const { success, error } = useToast();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [problemStatements, setProblemStatements] = useState<Record<string, ProblemStatement[]>>({});
  const [loading, setLoading] = useState(true);

  // View States
  const [activeView, setActiveView] = useState<'list' | 'detail'>('list');
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);

  // Modal/Form States
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [trackForm, setTrackForm] = useState<Partial<Track>>({ name: '', description: '', active: true, published: false });

  const [isPSModalOpen, setIsPSModalOpen] = useState(false);
  const [editingPS, setEditingPS] = useState<ProblemStatement | null>(null);
  const [psForm, setPsForm] = useState<Partial<ProblemStatement>>({
    trackId: '', title: '', description: '', links: [], customSections: [], isReleased: false, active: true, published: false
  });

  useEffect(() => {
    const unsub = TrackService.subscribeToTracks((data) => {
      // Sort by displayOrder or name
      const sorted = [...data].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      setTracks(sorted);
      
      if (selectedTrack) {
        const updatedSelected = data.find(t => t.id === selectedTrack.id);
        if (updatedSelected) setSelectedTrack(updatedSelected);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [selectedTrack?.id]);

  useEffect(() => {
    const unsubs = tracks.map(track => {
      return TrackService.subscribeToProblemStatements(track.id, (statements) => {
        setProblemStatements(prev => ({ ...prev, [track.id]: statements }));
      });
    });
    return () => unsubs.forEach(unsub => unsub());
  }, [tracks]);

  const handleImportData = async () => {
    if (!window.confirm("Are you sure you want to import the pre-filled competition data? This will create multiple tracks and problem statements.")) return;
    try {
      setLoading(true);
      for (const t of hackathonTracks) {
        const trackId = await TrackService.createTrack(t as any);
        const relevantProblems = hackathonProblems.filter(p => p.trackCode === t.code);
        for (const p of relevantProblems) {
          await TrackService.createProblemStatement({
            ...p,
            trackId: trackId as string
          } as any);
        }
      }
      success('Data imported successfully!');
    } catch (err: any) {
      error('Failed to import data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTrack) {
        await TrackService.updateTrack(editingTrack.id, trackForm);
        success('Track updated successfully!');
      } else {
        await TrackService.createTrack({ 
          ...trackForm, 
          active: trackForm.active ?? true, 
          published: trackForm.published ?? false 
        } as Omit<Track, 'id' | 'createdAt' | 'updatedAt'>);
        success('Track created successfully!');
      }
      setIsTrackModalOpen(false);
    } catch (err: any) {
      error(err.message || 'Failed to save track');
    }
  };

  const handleDeleteTrack = async (id: string) => {
    if (!window.confirm("Are you sure? This will delete the track AND all its problem statements! Ensure no teams or submissions reference this track before proceeding.")) return;
    try {
      await TrackService.deleteTrack(id);
      if (selectedTrack?.id === id) setActiveView('list');
      success('Track deleted.');
    } catch (err: any) {
      error(err.message || 'Failed to delete track');
    }
  };

  const handleSavePS = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // If editing and trackId changed, it's a move
      const isMove = editingPS && editingPS.trackId !== psForm.trackId;
      if (isMove) {
        if (!window.confirm("Are you sure you want to move this problem statement to a different track? This could affect teams currently assigned to it.")) {
          return;
        }
      }

      if (editingPS) {
        await TrackService.updateProblemStatement(editingPS.id, psForm);
        success('Problem statement updated!');
      } else {
        await TrackService.createProblemStatement({
          ...psForm,
          active: psForm.active ?? true,
          published: psForm.published ?? false,
          isReleased: psForm.published ?? false, // Sync legacy field
          links: psForm.links || [],
          customSections: psForm.customSections || []
        } as Omit<ProblemStatement, 'id' | 'createdAt' | 'updatedAt'>);
        success('Problem statement created!');
      }
      setIsPSModalOpen(false);
    } catch (err: any) {
      error(err.message || 'Failed to save problem statement');
    }
  };

  const handleDeletePS = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this problem statement?")) return;
    try {
      await TrackService.deleteProblemStatement(id);
      success('Problem statement deleted.');
    } catch (err: any) {
      error(err.message || 'Failed to delete problem statement');
    }
  };

  const handleToggleTrackStatus = async (track: Track, field: 'active' | 'published') => {
    try {
      await TrackService.updateTrack(track.id, { [field]: !track[field] });
      success(`Track ${field} status updated.`);
    } catch (err) {
      error('Failed to update status');
    }
  };

  const handleTogglePSStatus = async (ps: ProblemStatement, field: 'active' | 'published') => {
    try {
      const updates: any = { [field]: !ps[field] };
      if (field === 'published') updates.isReleased = !ps.published; // Sync legacy field
      await TrackService.updateProblemStatement(ps.id, updates);
      success(`Problem statement ${field} status updated.`);
    } catch (err) {
      error('Failed to update status');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // LIST VIEW
  if (activeView === 'list') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="font-bebas text-4xl tracking-widest text-white mb-2">TRACKS MANAGEMENT</h1>
            <p className="font-inter text-gray-400">Manage competition tracks and their configurations.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleImportData} className="border-green-500/30 text-green-400 hover:bg-green-500/10">
              IMPORT PRE-FILLED DATA
            </Button>
            <Button onClick={() => {
              setEditingTrack(null);
              setTrackForm({ name: '', shortName: '', description: '', active: true, published: false, displayOrder: tracks.length + 1 });
              setIsTrackModalOpen(true);
            }}>
              <Plus className="w-5 h-5 mr-2" /> CREATE TRACK
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tracks.map((track) => {
            const trackPSCount = (problemStatements[track.id] || []).length;
            return (
              <Card key={track.id} className="border-white/10 bg-black/60 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => {
                setSelectedTrack(track);
                setActiveView('detail');
              }}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant={track.active ? 'success' : 'outline'}>{track.active ? 'ACTIVE' : 'INACTIVE'}</Badge>
                    <Badge variant={track.published ? 'default' : 'secondary'} className={track.published ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' : ''}>
                      {track.published ? 'PUBLISHED' : 'DRAFT'}
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl font-bebas text-white tracking-widest truncate">{track.name}</CardTitle>
                  <p className="text-xs font-mono text-gray-500">{track.id}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-inter text-gray-400 line-clamp-2 mb-4 h-10">{track.description}</p>
                  
                  <div className="flex justify-between items-center pt-4 border-t border-white/10">
                    <div className="text-sm text-gray-400">
                      <span className="text-white font-medium">{trackPSCount}</span> Problems
                    </div>
                    <Button size="sm" variant="outline" className="text-xs" onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTrack(track);
                      setActiveView('detail');
                    }}>
                      MANAGE
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {tracks.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed border-white/10 rounded-lg">
            <h3 className="font-bebas text-2xl text-gray-500 tracking-wider mb-2">NO TRACKS CONFIGURED</h3>
            <p className="font-inter text-gray-600 text-sm mb-4">Create your first track to begin organizing problem statements.</p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" onClick={handleImportData} className="border-green-500/30 text-green-400 hover:bg-green-500/10">
                IMPORT PRE-FILLED DATA
              </Button>
              <Button onClick={() => {
                setEditingTrack(null);
                setTrackForm({ name: '', active: true, published: false });
                setIsTrackModalOpen(true);
              }}>CREATE TRACK</Button>
            </div>
          </div>
        )}

        {/* Track Modal */}
        {isTrackModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#111] border border-white/10 p-6 rounded-xl w-full max-w-lg">
              <h2 className="font-bebas text-2xl text-white tracking-widest mb-4">{editingTrack ? 'EDIT TRACK' : 'CREATE TRACK'}</h2>
              <form onSubmit={handleSaveTrack} className="space-y-4">
                <div>
                  <Label>Track Name *</Label>
                  <Input required value={trackForm.name || ''} onChange={e => setTrackForm({...trackForm, name: e.target.value})} placeholder="e.g. AI & Machine Learning" />
                </div>
                <div>
                  <Label>Short Name / Code</Label>
                  <Input value={trackForm.shortName || trackForm.code || ''} onChange={e => setTrackForm({...trackForm, shortName: e.target.value, code: e.target.value})} placeholder="e.g. AI-ML" />
                </div>
                <div>
                  <Label>Description</Label>
                  <textarea 
                    value={trackForm.description || ''} 
                    onChange={e => setTrackForm({...trackForm, description: e.target.value})} 
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white font-inter text-sm focus:border-primary/50 outline-none h-24"
                    placeholder="Brief description of the track"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Display Order</Label>
                    <Input type="number" value={trackForm.displayOrder || 0} onChange={e => setTrackForm({...trackForm, displayOrder: parseInt(e.target.value)})} />
                  </div>
                </div>

                <div className="flex gap-3 mt-6 pt-4 border-t border-white/10">
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsTrackModalOpen(false)}>CANCEL</Button>
                  <Button type="submit" className="flex-1"><Save className="w-4 h-4 mr-2" /> {editingTrack ? 'UPDATE' : 'CREATE'} TRACK</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    );
  }

  // DETAIL VIEW
  if (!selectedTrack) return null;

  const currentProblems = problemStatements[selectedTrack.id] || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="outline" size="sm" onClick={() => setActiveView('list')}>
          <ChevronLeft className="w-4 h-4 mr-1" /> BACK TO TRACKS
        </Button>
      </div>

      <Card className="border-white/10 bg-black/60">
        <CardHeader className="flex flex-row justify-between items-start border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-bebas text-4xl text-white tracking-widest m-0">{selectedTrack.name}</h1>
              <Badge variant={selectedTrack.active ? 'success' : 'outline'}>{selectedTrack.active ? 'ACTIVE' : 'INACTIVE'}</Badge>
              <Badge variant={selectedTrack.published ? 'default' : 'secondary'} className={selectedTrack.published ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' : ''}>
                {selectedTrack.published ? 'PUBLISHED' : 'DRAFT'}
              </Badge>
            </div>
            <p className="text-gray-400 font-inter text-sm max-w-3xl">{selectedTrack.description}</p>
            <p className="text-xs font-mono text-gray-500 mt-2">Track ID: {selectedTrack.id}</p>
          </div>
          <div className="flex flex-col gap-2 min-w-[150px]">
            <Button size="sm" variant="secondary" onClick={() => {
              setEditingTrack(selectedTrack);
              setTrackForm(selectedTrack);
              setIsTrackModalOpen(true);
            }}><Edit2 className="w-4 h-4 mr-2" /> EDIT TRACK</Button>
            
            <Button size="sm" variant={selectedTrack.published ? 'outline' : 'primary'} onClick={() => handleToggleTrackStatus(selectedTrack, 'published')}>
              {selectedTrack.published ? 'UNPUBLISH' : 'PUBLISH'}
            </Button>
            
            <Button size="sm" variant="danger" onClick={() => handleDeleteTrack(selectedTrack.id)}>
              <Trash2 className="w-4 h-4 mr-2" /> DELETE
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="font-bebas text-2xl text-white tracking-wider">PROBLEM STATEMENTS</h2>
              <p className="text-sm text-gray-400 font-inter">Problems assigned to this track: {currentProblems.length}</p>
            </div>
            <Button onClick={() => {
              setEditingPS(null);
              setPsForm({ trackId: selectedTrack.id, title: '', description: '', links: [], customSections: [], active: true, published: false });
              setIsPSModalOpen(true);
            }}>
              <Plus className="w-5 h-5 mr-2" /> ADD PROBLEM
            </Button>
          </div>

          <div className="space-y-4">
            {currentProblems.length === 0 ? (
              <div className="p-8 border border-dashed border-white/10 rounded-lg text-center">
                <p className="text-gray-500 font-inter">No problem statements have been added to this track yet.</p>
              </div>
            ) : (
              currentProblems.map(ps => (
                <div key={ps.id} className="p-4 rounded-lg border border-white/10 bg-[#111] flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-bebas text-xl text-white tracking-wider">{ps.title}</h4>
                      <Badge variant={ps.active ? 'success' : 'outline'} className="text-[10px] py-0">{ps.active ? 'ACTIVE' : 'INACTIVE'}</Badge>
                      <Badge variant={ps.published ? 'default' : 'secondary'} className={`text-[10px] py-0 ${ps.published ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' : ''}`}>
                        {ps.published ? 'PUBLISHED' : 'DRAFT'}
                      </Badge>
                    </div>
                    <p className="text-sm font-inter text-gray-400 line-clamp-2">{ps.description}</p>
                    <p className="text-xs font-mono text-gray-600 mt-2">PS ID: {ps.id}</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant={ps.published ? 'outline' : 'secondary'} onClick={() => handleTogglePSStatus(ps, 'published')}>
                      {ps.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => {
                      setEditingPS(ps);
                      setPsForm(ps);
                      setIsPSModalOpen(true);
                    }}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleDeletePS(ps.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

        </CardContent>
      </Card>

      {/* Track Modal (Reused) */}
      {isTrackModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#111] border border-white/10 p-6 rounded-xl w-full max-w-lg">
              <h2 className="font-bebas text-2xl text-white tracking-widest mb-4">{editingTrack ? 'EDIT TRACK' : 'CREATE TRACK'}</h2>
              <form onSubmit={handleSaveTrack} className="space-y-4">
                <div>
                  <Label>Track Name *</Label>
                  <Input required value={trackForm.name || ''} onChange={e => setTrackForm({...trackForm, name: e.target.value})} placeholder="e.g. AI & Machine Learning" />
                </div>
                <div>
                  <Label>Description</Label>
                  <textarea 
                    value={trackForm.description || ''} 
                    onChange={e => setTrackForm({...trackForm, description: e.target.value})} 
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white font-inter text-sm focus:border-primary/50 outline-none h-24"
                  />
                </div>
                
                <div className="flex justify-between items-center border border-white/10 p-3 rounded-lg mt-2">
                   <Label className="mb-0">Active Status</Label>
                   <Button type="button" variant={trackForm.active ? 'success' : 'outline'} size="sm" onClick={() => setTrackForm({...trackForm, active: !trackForm.active})}>
                     {trackForm.active ? 'ACTIVE' : 'INACTIVE'}
                   </Button>
                </div>

                <div className="flex gap-3 mt-6 pt-4 border-t border-white/10">
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsTrackModalOpen(false)}>CANCEL</Button>
                  <Button type="submit" className="flex-1"><Save className="w-4 h-4 mr-2" /> SAVE</Button>
                </div>
              </form>
            </motion.div>
          </div>
      )}

      {/* Problem Statement Modal */}
      {isPSModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 py-10">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#111] border border-white/10 p-6 rounded-xl w-full max-w-3xl max-h-full overflow-y-auto">
            <h2 className="font-bebas text-2xl text-white tracking-widest mb-4">{editingPS ? 'EDIT PROBLEM STATEMENT' : 'NEW PROBLEM STATEMENT'}</h2>
            <form onSubmit={handleSavePS} className="space-y-6">
              
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg mb-6">
                <Label className="text-primary mb-2 block">Assigned Track</Label>
                <select 
                  className="w-full bg-black/50 border border-white/20 rounded p-2 text-white font-bebas text-xl outline-none"
                  value={psForm.trackId || ''}
                  onChange={e => setPsForm({...psForm, trackId: e.target.value})}
                  required
                >
                  <option value="" disabled>Select a Track...</option>
                  {tracks.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                {editingPS && editingPS.trackId !== psForm.trackId && (
                  <p className="text-xs text-yellow-400 mt-2 font-inter flex items-center gap-1">
                    <ArrowRightLeft className="w-3 h-3" /> Moving this problem to a different track.
                  </p>
                )}
              </div>

              <div className="space-y-4 border-b border-white/10 pb-6">
                <div>
                  <Label>Title *</Label>
                  <Input required value={psForm.title || ''} onChange={e => setPsForm({...psForm, title: e.target.value})} placeholder="e.g. Smart City Traffic Optimization" />
                </div>
                <div>
                  <Label>Main Description *</Label>
                  <textarea 
                    required 
                    value={psForm.description || ''} 
                    onChange={e => setPsForm({...psForm, description: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white font-inter text-sm h-32 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none"
                    placeholder="Describe the main challenge..."
                  />
                </div>
              </div>

              {/* Resource Links Section */}
              <div className="space-y-4 border-b border-white/10 pb-6">
                <div className="flex justify-between items-center">
                  <Label>Resource Links</Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => setPsForm(p => ({...p, links: [...(p.links||[]), {label: '', url: ''}]}))}>
                    <Plus className="w-3 h-3 mr-1" /> Add Link
                  </Button>
                </div>
                {(psForm.links||[]).map((link, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input required value={link.label} onChange={e => {
                      const newLinks = [...(psForm.links||[])];
                      newLinks[idx].label = e.target.value;
                      setPsForm({...psForm, links: newLinks});
                    }} placeholder="Label (e.g. API Docs)" className="flex-1" />
                    <Input required type="url" value={link.url} onChange={e => {
                      const newLinks = [...(psForm.links||[])];
                      newLinks[idx].url = e.target.value;
                      setPsForm({...psForm, links: newLinks});
                    }} placeholder="https://..." className="flex-[2]" />
                    <Button type="button" variant="danger" size="sm" onClick={() => {
                      setPsForm(p => ({...p, links: (p.links||[]).filter((_, i) => i !== idx)}));
                    }}><X className="w-4 h-4" /></Button>
                  </div>
                ))}
              </div>

              {/* Custom Sections */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Custom Sections (Requirements, Expected Outcome, etc.)</Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => setPsForm(p => ({...p, customSections: [...(p.customSections||[]), {heading: '', content: ''}]}))}>
                    <Plus className="w-3 h-3 mr-1" /> Add Section
                  </Button>
                </div>
                {(psForm.customSections||[]).map((sec, idx) => (
                  <div key={idx} className="p-4 border border-white/10 rounded-lg bg-white/5 space-y-3 relative">
                    <Button type="button" variant="danger" size="sm" className="absolute top-2 right-2 w-8 h-8 p-0 flex items-center justify-center" onClick={() => {
                      setPsForm(p => ({...p, customSections: (p.customSections||[]).filter((_, i) => i !== idx)}));
                    }}><X className="w-4 h-4" /></Button>
                    <div>
                      <Label>Heading</Label>
                      <Input required value={sec.heading} onChange={e => {
                        const newSecs = [...(psForm.customSections||[])];
                        newSecs[idx].heading = e.target.value;
                        setPsForm({...psForm, customSections: newSecs});
                      }} placeholder="e.g. Technical Requirements" className="w-[calc(100%-40px)]" />
                    </div>
                    <div>
                      <Label>Content</Label>
                      <textarea 
                        required 
                        value={sec.content} 
                        onChange={e => {
                          const newSecs = [...(psForm.customSections||[])];
                          newSecs[idx].content = e.target.value;
                          setPsForm({...psForm, customSections: newSecs});
                        }}
                        className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white font-inter text-sm h-24 focus:border-primary/50 outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-white/10">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsPSModalOpen(false)}>CANCEL</Button>
                <Button type="submit" className="flex-1"><Save className="w-4 h-4 mr-2" /> SAVE STATEMENT</Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
