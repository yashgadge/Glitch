import React, { useState, useEffect, FormEvent } from 'react';
import { Settings, Plus, Calendar, ChevronRight, Edit2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input, Select, Label } from '../../../components/ui/Form';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/ToastContext';
import { RoundService } from '@shared/services/RoundService';
import type { Round } from '@shared/types/models';
import { DataTable, type Column } from '../../../components/ui/DataTable';
import { Badge } from '../../../components/ui/Badge';
import { motion } from 'framer-motion';

export default function RoundManager() {
  const { success, error } = useToast();
  const navigate = useNavigate();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRounds();
  }, []);

  const loadRounds = async () => {
    try {
      setIsLoading(true);
      const data = await RoundService.getAllRounds();
      setRounds(data.sort((a, b) => a.order - b.order));
    } catch (err) {
      error('Failed to load rounds');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (roundId: string, roundName: string) => {
    if (!window.confirm(`Are you sure you want to completely delete ${roundName}? This action cannot be undone.`)) {
      return;
    }
    try {
      setIsLoading(true);
      await RoundService.deleteRound(roundId);
      success('ROUND DELETED');
      await loadRounds();
    } catch (err: any) {
      error(`Failed to delete round: ${err.message}`);
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsCreating(true);
    const formData = new FormData(e.currentTarget);
    
    // Auto-calculate order based on max existing
    const maxOrder = rounds.length > 0 ? Math.max(...rounds.map(r => r.order)) : 0;
    const newOrder = maxOrder + 1;
    
    const data: Partial<Round> = {
      name: formData.get('name') as string,
      displayName: formData.get('displayName') as string,
      type: formData.get('type') as any,
      description: formData.get('description') as string,
      order: newOrder,
      status: 'DRAFT', // Strictly enforced default
      maxRevisions: 2, // Backend default
      qualifiedCount: 0
    };

    try {
      const id = newOrder.toString();
      await RoundService.createRound(id, data as Omit<Round, 'id' | 'createdAt' | 'updatedAt'>);
      success('ROUND CREATED');
      setIsModalOpen(false);
      // Wait briefly for the toast to be seen
      setTimeout(() => {
        navigate(`/workspace/rounds/${id}`);
      }, 300);
    } catch (err: any) {
      console.error(err);
      error(`Failed to create round: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const columns: Column<Round>[] = [
    {
      header: 'Order',
      accessorKey: 'order',
      cell: (row) => <span className="text-gray-400 font-mono">Round {row.order}</span>
    },
    {
      header: 'Name',
      accessorKey: 'name',
      cell: (row) => (
        <div>
          <div className="font-bebas text-lg tracking-wider text-white">{row.name}</div>
          <div className="text-xs text-gray-500 font-inter">{row.displayName}</div>
        </div>
      )
    },
    {
      header: 'Type',
      accessorKey: 'type',
      cell: (row) => <Badge variant="default">{row.type || 'Custom'}</Badge>
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (row) => {
        const isActive = ['SUBMISSION_OPEN', 'EVALUATION_OPEN'].includes(row.status);
        const isDraft = row.status === 'DRAFT';
        return <Badge variant={isActive ? 'success' : isDraft ? 'default' : 'warning'}>{row.status}</Badge>;
      }
    },
    {
      header: 'Actions',
      accessorKey: 'id',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(`/workspace/rounds/${row.id}`)} 
            className="text-primary hover:text-white transition-colors"
          >
            CONFIGURE <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
          <button 
            type="button"
            onClick={() => handleDelete(row.id as string, row.name)}
            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Delete Round"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-start">
        <div>
          <h2 className="font-bebas text-4xl tracking-widest text-white flex items-center gap-3">
            <Calendar className="w-8 h-8 text-primary" /> ROUND ENGINE
          </h2>
          <p className="font-inter text-gray-400">Configure rounds, schedules, and transition states</p>
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)} leftIcon={Plus}>
          NEW ROUND
        </Button>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        {isLoading ? (
          <div className="space-y-4 p-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-white/5 rounded-lg border border-white/10" />
            ))}
          </div>
        ) : (
          <DataTable columns={columns} data={rounds} emptyMessage="No rounds created yet." />
        )}
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => !isCreating && setIsModalOpen(false)} 
        title="NEW ROUND" 
        size="lg"
      >
        <form onSubmit={handleCreate}>
          <div className="space-y-4 p-1">
            <p className="text-gray-400 text-sm mb-4">
              Create a new competition round. Advanced configuration like schedules and rules can be set up in the management view after creation.
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Round Name (Internal)</Label>
                <Input name="name" placeholder="e.g. Round 1" required disabled={isCreating} />
              </div>
              
              <div className="col-span-2">
                <Label>Display Name (Public)</Label>
                <Input name="displayName" placeholder="e.g. Preliminary Screening" required disabled={isCreating} />
              </div>

              <div className="col-span-2">
                <Label>Round Type</Label>
                <Select name="type" defaultValue="Screening" disabled={isCreating}>
                  <option value="Screening">Screening</option>
                  <option value="Preliminary">Preliminary</option>
                  <option value="Technical">Technical</option>
                  <option value="Development">Development</option>
                  <option value="Presentation">Presentation</option>
                  <option value="Final">Final</option>
                  <option value="Custom">Custom</option>
                </Select>
              </div>

              <div className="col-span-2">
                <Label>Description (Optional)</Label>
                <Input name="description" placeholder="Briefly describe this round..." disabled={isCreating} />
              </div>

              <div className="col-span-2 mt-4 p-4 bg-black/40 border border-white/5 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-bebas text-lg tracking-widest text-gray-300">STATUS</div>
                  <div className="text-xs text-gray-500">Managed automatically by the system</div>
                </div>
                <Badge variant="default">● DRAFT</Badge>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isCreating}>CANCEL</Button>
            <Button type="submit" variant="primary" disabled={isCreating}>
              {isCreating ? 'CREATING...' : 'CREATE ROUND'}
            </Button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}
