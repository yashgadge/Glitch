import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Download, Edit2, Search, Filter } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input, Label } from '../../../components/ui/Form';
import { DataTable, type Column } from '../../../components/ui/DataTable';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/ToastContext';
import { OrderService } from '@shared/services/OrderService';
import { ParticipantService } from '@shared/services/ParticipantService';
import { TeamService } from '@shared/services/TeamService';
import type { Order, OrderStatus, Participant, Team } from '@shared/types/models';
import * as XLSX from 'xlsx';

export default function OrderManager() {
  const { success, error: toastError } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [participants, setParticipants] = useState<Record<string, Participant>>({});
  const [teams, setTeams] = useState<Record<string, Team>>({});
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const unsubOrders = OrderService.subscribeToAllOrders((data) => {
      setOrders(data);
    });

    const unsubParticipants = ParticipantService.subscribeToAllParticipants((data) => {
      const map: Record<string, Participant> = {};
      data.forEach(p => map[p.id] = p);
      setParticipants(map);
    });

    const unsubTeams = TeamService.subscribeToAllTeams((data) => {
      const map: Record<string, Team> = {};
      data.forEach(t => map[t.id] = t);
      setTeams(map);
    });

    return () => {
      unsubOrders();
      unsubParticipants();
      unsubTeams();
    };
  }, []);

  const handleUpdateStatus = async (status: OrderStatus) => {
    if (!selectedOrder) return;
    setIsProcessing(true);
    try {
      await OrderService.updateOrderStatus(selectedOrder.id, status);
      success('Order Updated', `Status changed to ${status}`);
      setIsModalOpen(false);
    } catch (err: any) {
      toastError('Update Failed', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const enrichedOrders = useMemo(() => {
    return orders.map(order => {
      const participant = participants[order.participantId];
      const team = participant?.teamId ? teams[participant.teamId] : null;
      return {
        ...order,
        participantName: participant ? participant.name : 'Unknown',
        teamName: team ? team.name : 'No Team',
      };
    });
  }, [orders, participants, teams]);

  const filteredOrders = useMemo(() => {
    return enrichedOrders.filter(o => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        o.id.toLowerCase().includes(searchLower) || 
        o.participantId.toLowerCase().includes(searchLower) ||
        o.participantName.toLowerCase().includes(searchLower) ||
        o.teamName.toLowerCase().includes(searchLower);
        
      const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
      
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const orderDate = new Date(o.createdAt);
        const now = new Date();
        const diffDays = (now.getTime() - orderDate.getTime()) / (1000 * 3600 * 24);
        
        if (dateFilter === 'today') matchesDate = diffDays <= 1;
        if (dateFilter === '7days') matchesDate = diffDays <= 7;
        if (dateFilter === '30days') matchesDate = diffDays <= 30;
      }
      
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [enrichedOrders, searchTerm, statusFilter, dateFilter]);

  const exportExcel = () => {
    if (filteredOrders.length === 0) {
      toastError("No data to export");
      return;
    }
    
    const exportData = filteredOrders.map(o => ({
      'Order ID': o.id,
      'Date': new Date(o.createdAt).toLocaleString(),
      'Participant Name': o.participantName,
      'Participant ID': o.participantId,
      'Team Name': o.teamName,
      'Total Amount': o.totalAmount,
      'Currency': o.currency,
      'Status': o.status.toUpperCase(),
      'Items': o.items.map(i => `${i.quantity}x ${i.name}`).join(', ')
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Auto-size columns loosely
    const colWidths = [
      { wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 30 }, 
      { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 50 }
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
    XLSX.writeFile(workbook, "Glitch36_Orders_Export.xlsx");
  };

  const columns: Column<any>[] = [
    {
      header: 'Order ID',
      accessorKey: 'id',
      sortable: true,
      cell: (row) => <span className="font-mono text-primary text-xs">{row.id}</span>
    },
    {
      header: 'Participant',
      accessorKey: 'participantName',
      sortable: true,
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-inter text-white text-sm">{row.participantName}</span>
          <span className="font-mono text-gray-500 text-[10px]">{row.participantId}</span>
        </div>
      )
    },
    {
      header: 'Team',
      accessorKey: 'teamName',
      sortable: true,
      cell: (row) => <span className="font-inter text-gray-300 text-sm">{row.teamName}</span>
    },
    {
      header: 'Items',
      accessorKey: 'items',
      cell: (row) => (
        <div className="flex flex-col gap-1 max-w-[200px]">
          {row.items.map((item: any, idx: number) => (
            <span key={idx} className="text-xs text-gray-400 font-inter truncate" title={item.name}>
              {item.quantity}x {item.name}
            </span>
          ))}
        </div>
      )
    },
    {
      header: 'Total',
      accessorKey: 'totalAmount',
      sortable: true,
      cell: (row) => <span className="font-bebas text-lg text-white">{row.totalAmount} {row.currency}</span>
    },
    {
      header: 'Status',
      accessorKey: 'status',
      sortable: true,
      cell: (row) => {
        if (row.status === 'paid' || row.status === 'delivered') return <Badge variant="success">{row.status.replace('_', ' ')}</Badge>;
        if (row.status === 'pending_payment') return <Badge variant="warning">{row.status.replace('_', ' ')}</Badge>;
        return <Badge variant="danger">{row.status.replace('_', ' ')}</Badge>;
      }
    },
    {
      header: 'Date',
      accessorKey: 'createdAt',
      sortable: true,
      cell: (row) => <span className="text-xs text-gray-400">{new Date(row.createdAt).toLocaleDateString()}</span>
    },
    {
      header: 'Actions',
      accessorKey: 'id',
      cell: (row) => (
        <Button variant="ghost" size="sm" onClick={() => { setSelectedOrder(row); setIsModalOpen(true); }} className="text-blue-400">
          <Edit2 className="w-4 h-4" />
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <h2 className="font-bebas text-4xl tracking-widest text-white flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-primary" /> ORDER MANAGEMENT
          </h2>
          <p className="font-inter text-gray-400">Manage participant orders, registration fees, and add-ons.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" leftIcon={Download} onClick={exportExcel}>EXPORT EXCEL</Button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-white/10 shrink-0 bg-white/5 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search orders, participants, or teams..."
              className="pl-9"
            />
          </div>
          
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-black/50 border border-white/10 rounded-lg text-white font-inter text-sm px-3 py-2 focus:outline-none focus:border-primary transition-colors"
              >
                <option value="all">All Statuses</option>
                <option value="pending_payment">Pending Payment</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
                <option value="refunded">Refunded</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <select 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-black/50 border border-white/10 rounded-lg text-white font-inter text-sm px-3 py-2 focus:outline-none focus:border-primary transition-colors max-w-[200px]"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-0">
          <DataTable 
            columns={columns} 
            data={filteredOrders}
            emptyMessage="No orders found matching criteria."
          />
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Manage Order" size="xl">
        {selectedOrder && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-500">Order ID</Label>
                <div className="text-white font-mono text-sm">{selectedOrder.id}</div>
              </div>
              <div>
                <Label className="text-gray-500">Participant ID</Label>
                <div className="text-white font-mono text-sm">{selectedOrder.participantId}</div>
              </div>
            </div>

            <div>
              <Label className="text-gray-500 mb-2">Order Items</Label>
              <div className="space-y-2">
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-white/5 border border-white/10 rounded-lg">
                    <div>
                      <div className="text-white font-medium">{item.name}</div>
                      <div className="text-xs text-gray-400 font-mono">Qty: {item.quantity} × {item.unitPrice} {selectedOrder.currency}</div>
                    </div>
                    <div className="font-bebas text-lg text-primary">{item.totalPrice} {selectedOrder.currency}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center p-4 bg-primary/10 border border-primary/20 rounded-xl">
              <span className="font-inter text-gray-300">Total Amount</span>
              <span className="font-bebas text-3xl text-white">{selectedOrder.totalAmount} {selectedOrder.currency}</span>
            </div>

            <div className="pt-4 border-t border-white/10">
              <Label className="mb-2">Update Status</Label>
              <div className="flex flex-wrap gap-2">
                {(['pending_payment', 'paid', 'delivered', 'refunded', 'cancelled'] as OrderStatus[]).map(status => (
                  <Button 
                    key={status}
                    variant={selectedOrder.status === status ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => handleUpdateStatus(status)}
                    isLoading={isProcessing && selectedOrder.status !== status}
                  >
                    {status.replace('_', ' ').toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

