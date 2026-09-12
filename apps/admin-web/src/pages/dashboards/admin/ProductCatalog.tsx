import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Input, Label, Select } from '../../../components/ui/Form';
import { useToast } from '../../../components/ui/ToastContext';
import { Package, Plus, Edit2, Trash2 } from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@shared/lib/firebase';
import type { CatalogItem } from '@shared/types/models';

export default function ProductCatalog() {
  const { success, error: toastError } = useToast();
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<CatalogItem> | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'eventProducts'), (snap) => {
      const data: CatalogItem[] = [];
      snap.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() } as CatalogItem);
      });
      setProducts(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.id || !editingItem.name || !editingItem.price || !editingItem.type) {
      toastError('Validation Error', 'ID, Name, Price, and Type are required.');
      return;
    }

    try {
      await setDoc(doc(db, 'eventProducts', editingItem.id), {
        ...editingItem,
        price: Number(editingItem.price),
        inventory: editingItem.inventory ? Number(editingItem.inventory) : null,
        maxQuantityPerParticipant: editingItem.maxQuantityPerParticipant ? Number(editingItem.maxQuantityPerParticipant) : null,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      success('Saved', 'Product saved successfully.');
      setIsModalOpen(false);
    } catch (err: any) {
      toastError('Save Failed', err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteDoc(doc(db, 'eventProducts', id));
      success('Deleted', 'Product deleted.');
    } catch (err: any) {
      toastError('Delete Failed', err.message);
    }
  };

  const openNewModal = () => {
    setEditingItem({
      id: `prod-${Date.now()}`,
      name: '',
      price: 0,
      type: 'addon',
      entitlementType: 'QUANTITY_BASED',
      ownership: 'PARTICIPANT',
      purchaseEnabled: true,
      redemptionEnabled: true,
      isActive: true
    } as any);
    setIsModalOpen(true);
  };

  const openEditModal = (item: CatalogItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  if (loading) return <div className="text-center py-10 font-bebas text-2xl tracking-widest text-primary animate-pulse">LOADING CATALOG...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-bebas text-4xl tracking-widest text-white flex items-center gap-3">
            <Package className="w-8 h-8 text-primary" /> PRODUCT CATALOG
          </h2>
          <p className="font-inter text-gray-400">Manage add-ons, food, and merchandise for team purchases.</p>
        </div>
        <Button onClick={openNewModal} leftIcon={Plus}>
          ADD PRODUCT
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map(product => (
          <Card key={product.id} className="bg-black/50 border-white/10">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <Badge variant={product.purchaseEnabled === false ? 'danger' : 'success'}>
                    {product.purchaseEnabled === false ? 'DISABLED' : 'ACTIVE'}
                  </Badge>
                  <h3 className="font-bebas text-2xl text-white mt-2">{product.name}</h3>
                  <p className="font-mono text-xs text-primary uppercase">{product.type}</p>
                </div>
                <span className="font-bebas text-3xl text-white">₹{product.price}</span>
              </div>
              
              <div className="space-y-2 mb-6 font-mono text-xs text-gray-400">
                <div className="flex justify-between"><span>Inventory:</span> <span>{product.inventory !== undefined && product.inventory !== null ? product.inventory : 'Unlimited'}</span></div>
                <div className="flex justify-between"><span>Entitlement:</span> <span>{product.entitlementType}</span></div>
                <div className="flex justify-between"><span>Ownership:</span> <span>{product.ownership}</span></div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEditModal(product)} className="flex-1">
                  <Edit2 className="w-4 h-4 mr-2" /> EDIT
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(product.id)} className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {products.length === 0 && (
          <div className="col-span-full text-center p-12 border border-dashed border-white/10 rounded-xl">
            <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 font-inter">No products in the catalog.</p>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem?.id?.startsWith('prod-') ? 'Add Product' : 'Edit Product'} size="lg">
        {editingItem && (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Product ID</Label>
                <Input value={editingItem.id || ''} onChange={e => setEditingItem({ ...editingItem, id: e.target.value })} disabled={!editingItem.id?.startsWith('prod-')} required />
              </div>
              <div>
                <Label>Name</Label>
                <Input value={editingItem.name || ''} onChange={e => setEditingItem({ ...editingItem, name: e.target.value })} required />
              </div>
              <div>
                <Label>Price (INR)</Label>
                <Input type="number" value={editingItem.price || 0} onChange={e => setEditingItem({ ...editingItem, price: Number(e.target.value) })} required min={0} />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={editingItem.type || 'addon'} onChange={e => setEditingItem({ ...editingItem, type: e.target.value as any })}>
                  <option value="registration">Registration Fee</option>
                  <option value="food">Food</option>
                  <option value="addon">Add-on</option>
                  <option value="swag">Merchandise</option>
                  <option value="stay">Accommodation</option>
                </Select>
              </div>
              <div>
                <Label>Inventory (Leave empty for unlimited)</Label>
                <Input type="number" value={editingItem.inventory === null ? '' : editingItem.inventory} onChange={e => setEditingItem({ ...editingItem, inventory: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div>
                <Label>Entitlement Type</Label>
                <Select value={editingItem.entitlementType || 'QUANTITY_BASED'} onChange={e => setEditingItem({ ...editingItem, entitlementType: e.target.value as any })}>
                  <option value="QUANTITY_BASED">Quantity Based (Consumable)</option>
                  <option value="NON_CONSUMABLE">Non-Consumable (e.g. Swag)</option>
                  <option value="ACCESS_PASS">Access Pass</option>
                </Select>
              </div>
              <div>
                <Label>Ownership</Label>
                <Select value={editingItem.ownership || 'PARTICIPANT'} onChange={e => setEditingItem({ ...editingItem, ownership: e.target.value as any })}>
                  <option value="PARTICIPANT">Participant Level</option>
                  <option value="TEAM">Team Level</option>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Input value={editingItem.description || ''} onChange={e => setEditingItem({ ...editingItem, description: e.target.value })} />
              </div>
              <div className="col-span-2 flex gap-6 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editingItem.purchaseEnabled !== false} onChange={e => setEditingItem({ ...editingItem, purchaseEnabled: e.target.checked, isActive: e.target.checked })} className="rounded bg-black/50 border-white/20 text-primary focus:ring-primary" />
                  <span className="text-sm text-gray-300">Purchase Enabled</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editingItem.redemptionEnabled !== false} onChange={e => setEditingItem({ ...editingItem, redemptionEnabled: e.target.checked })} className="rounded bg-black/50 border-white/20 text-primary focus:ring-primary" />
                  <span className="text-sm text-gray-300">Redemption Enabled</span>
                </label>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit">Save Product</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
