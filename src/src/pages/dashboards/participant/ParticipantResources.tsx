import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../../components/ui/Card';
import { BookOpen, AlertTriangle, ExternalLink, Download } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { ResourceService } from '../../../services/ResourceService';
import type { Resource } from '../../../types/models';
import { motion } from 'framer-motion';

export default function ParticipantResources() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = ResourceService.subscribeToResources((data) => {
      // Filter for Participant targeted resources
      const participantResources = data.filter(r => r.targetRoles.includes('participant'));
      setResources(participantResources);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="font-bebas text-4xl tracking-widest text-white mb-2 flex items-center gap-2">
          <BookOpen className="w-8 h-8 text-primary" /> RESOURCES
        </h1>
        <p className="font-inter text-gray-400">Rulebooks, templates, and essential APIs for the hackathon.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {resources.length === 0 ? (
          <Card className="col-span-1 md:col-span-2 border-dashed border-2 border-white/20 bg-black/50">
            <CardContent className="p-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
                <BookOpen className="w-8 h-8 text-gray-500" />
              </div>
              <h3 className="font-bebas text-2xl text-white mb-2 tracking-wider">NO RESOURCES YET</h3>
              <p className="font-inter text-gray-400 text-sm leading-relaxed max-w-md mx-auto">
                Check back later. The organizing team will post rulebooks, templates, and essential links here.
              </p>
            </CardContent>
          </Card>
        ) : (
          resources.map((resource, index) => (
            <motion.div key={resource.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
              <a href={resource.url} target="_blank" rel="noopener noreferrer" className="block group">
                <Card className="h-full transition-all duration-300 hover:border-primary/50 group-hover:bg-white/[0.02]">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="uppercase text-[10px] border-primary/20 text-primary">
                            {resource.type}
                          </Badge>
                        </div>
                        <h4 className="font-bebas text-xl text-white tracking-wider mb-2 group-hover:text-primary transition-colors">
                          {resource.title}
                        </h4>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-black transition-colors">
                        {resource.type === 'document' ? <Download className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </a>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
