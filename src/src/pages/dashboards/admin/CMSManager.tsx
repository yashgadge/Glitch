import React, { useState, useEffect } from 'react';
import { LayoutTemplate, Link as LinkIcon, Trash2, Plus, Globe } from 'lucide-react';
import { ResourceService } from '../../../services/ResourceService';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input, Label } from '../../../components/ui/Form';
import { useToast } from '../../../components/ui/ToastContext';
import type { Role, Resource } from '../../../types/models';

export default function CMSManager() {
  const { success, error: toastError } = useToast();
  const [resources, setResources] = useState<Resource[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // New Resource Form
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState('document');
  const [targetRoles, setTargetRoles] = useState<Role[]>(['participant']);

  useEffect(() => {
    const unsubscribe = ResourceService.subscribeToResources((data) => {
      setResources(data);
    });
    return () => unsubscribe();
  }, []);

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !url || targetRoles.length === 0) {
      toastError('Validation', 'Title, URL, and Target Roles are required.');
      return;
    }

    setIsSaving(true);
    try {
      await ResourceService.addResource({
        title,
        url,
        type: type as any,
        targetRoles,
        createdAt: new Date().toISOString()
      } as any);
      
      success('Resource Added', 'The link is now available on selected dashboards.');
      setTitle('');
      setUrl('');
    } catch (err: any) {
      toastError('Failed to add resource', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this resource?')) return;
    try {
      await ResourceService.deleteResource(id);
      success('Resource deleted');
    } catch (err: any) {
      toastError('Failed to delete resource', err.message);
    }
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
          <LayoutTemplate className="w-8 h-8 text-primary" /> CONTENT MANAGEMENT
        </h2>
        <p className="font-inter text-gray-400">Manage external resources, links, and problem statements displayed on dashboards.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        <Card className="lg:col-span-1 flex flex-col h-full max-h-[calc(100vh-250px)]">
          <CardHeader>
            <CardTitle className="text-xl">ADD RESOURCE</CardTitle>
          </CardHeader>
          <CardContent className="overflow-y-auto">
            <form onSubmit={handleAddResource} className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Problem Statement API Docs" />
              </div>
              <div>
                <Label>Resource URL</Label>
                <Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} required placeholder="https://..." />
              </div>
              <div>
                <Label>Content Type</Label>
                <select 
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary/50 font-inter text-sm"
                >
                  <option className="bg-[#111]" value="document">Document / PDF</option>
                  <option className="bg-[#111]" value="link">External Link</option>
                  <option className="bg-[#111]" value="video">Video</option>
                  <option className="bg-[#111]" value="code">Code Repository</option>
                </select>
              </div>
              <div>
                <Label>Visible To</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(['participant', 'judge', 'mentor'] as Role[]).map(r => (
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
              <Button type="submit" isLoading={isSaving} leftIcon={Plus} className="w-full mt-4">ADD LINK</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 flex flex-col h-full max-h-[calc(100vh-250px)]">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2"><Globe className="w-5 h-5 text-primary" /> ACTIVE RESOURCES</CardTitle>
          </CardHeader>
          <div className="flex-1 overflow-y-auto p-6 space-y-4 pt-0">
            {resources.map(r => (
              <div key={r.id} className="p-4 border border-white/10 rounded-xl bg-black/40 flex items-start justify-between group hover:border-primary/30 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white/5 rounded-lg text-gray-400">
                    <LinkIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-white font-inter">{r.title}</h4>
                    <a href={r.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline font-mono break-all">{r.url}</a>
                    <div className="flex gap-2 mt-2">
                      <span className="text-[10px] font-mono text-gray-500 uppercase">{r.type}</span>
                      <span className="text-[10px] font-mono text-gray-600">•</span>
                      <span className="text-[10px] font-mono text-gray-500 uppercase">For: {r.targetRoles.join(', ')}</span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDeleteResource(r.id)} className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {resources.length === 0 && (
              <div className="text-center p-8 text-gray-500 font-inter text-sm">No resources added yet.</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
