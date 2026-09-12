import React, { useState, useEffect } from 'react';
import { ShoppingCart, Check, CreditCard, Pizza, Shirt, Plus, X, Users, Package } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useAuth } from '@shared/contexts/AuthContext';
import { OrderService } from '@shared/services/OrderService';
import { TeamService } from '@shared/services/TeamService';
import { ParticipantService } from '@shared/services/ParticipantService';
import { EntitlementService } from '@shared/services/EntitlementService';
import type { Order, OrderItem, CatalogItem, Team, Participant, Entitlement, OrderItemAllocation } from '@shared/types/models';
import { useToast } from '../../../components/ui/ToastContext';
import { db, functions } from '@shared/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { collection, onSnapshot, query, where, doc, deleteDoc } from 'firebase/firestore';

export default function ParticipantOrders() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<Participant[]>([]);
  const [isLeader, setIsLeader] = useState(false);
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;
    
    let unsubTeam = () => {};
    let unsubEntitlements = () => {};
    let unsubOrders = () => {};
    let unsubCatalog = () => {};

    const loadData = async () => {
       try {
         const pDoc = await ParticipantService.getParticipant(user.uid);
         if (pDoc && pDoc.teamId) {
            unsubTeam = TeamService.subscribeToTeam(pDoc.teamId, async (teamData) => {
               setTeam(teamData);
               setIsLeader(teamData?.leaderId === user.uid);
               
               if (teamData) {
                 const memberIds = teamData.memberIds || (teamData as any).members || [];
                 const members = await Promise.all(memberIds.map(id => ParticipantService.getParticipant(id)));
                 setTeamMembers(members.filter(Boolean) as Participant[]);
               }
            });
            
            unsubEntitlements = EntitlementService.subscribeToParticipantEntitlements(user.uid, pDoc.teamId, (data) => {
               setEntitlements(EntitlementService.aggregateEntitlements(data));
            });
         } else {
            setLoading(false);
         }
       } catch (err) {
         console.error("Failed to load participant data", err);
         setLoading(false);
       }
    };
    
    loadData();

    unsubOrders = OrderService.subscribeToParticipantOrders(user.uid, (data) => {
      setOrders(data);
      setLoading(false);
    });

    // Fetch all catalog items and filter in memory to avoid missing items without isActive field
    unsubCatalog = onSnapshot(collection(db, 'eventProducts'), (snap) => {
       const prods: CatalogItem[] = [];
       snap.forEach(doc => {
          const data = doc.data();
          if (data.isActive !== false) { // Default to true if missing
            prods.push({ id: doc.id, ...data } as CatalogItem);
          }
       });
       setCatalog(prods.filter(p => p.purchaseEnabled !== false));
    });

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      unsubTeam();
      unsubEntitlements();
      unsubOrders();
      unsubCatalog();
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [user]);

  const openAllocationModal = (item: CatalogItem) => {
    setSelectedItem(item);
    
    // Load existing allocations from cart if present
    const existingCartItem = cart.find(i => i.id === item.id);
    const initialAlloc: Record<string, number> = {};
    if (existingCartItem && existingCartItem.allocations) {
       existingCartItem.allocations.forEach(a => {
          initialAlloc[a.participantId] = a.quantity;
       });
    } else {
       teamMembers.forEach(m => initialAlloc[m.id] = 0);
    }
    setAllocations(initialAlloc);
  };

  const handleUpdateAllocation = (participantId: string, delta: number) => {
     setAllocations(prev => {
        const current = prev[participantId] || 0;
        const next = Math.max(0, current + delta);
        return { ...prev, [participantId]: next };
     });
  };

  const saveAllocationsToCart = () => {
     if (!selectedItem) return;
     
     const newAllocations: OrderItemAllocation[] = [];
     let totalQty = 0;
     
     Object.entries(allocations).forEach(([pId, qty]) => {
        if (qty > 0) {
           newAllocations.push({ participantId: pId, quantity: qty });
           totalQty += qty;
        }
     });
     
     if (totalQty === 0) {
        removeFromCart(selectedItem.id);
        setSelectedItem(null);
        return;
     }
     
     setCart(prev => {
        const filtered = prev.filter(i => i.id !== selectedItem.id);
        return [...filtered, {
           id: selectedItem.id,
           name: selectedItem.name,
           type: selectedItem.type,
           quantity: totalQty,
           unitPrice: selectedItem.price,
           totalPrice: totalQty * selectedItem.price,
           allocations: newAllocations
        }];
     });
     
     success('Cart Updated', `${selectedItem.name} allocations saved.`);
     setSelectedItem(null);
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);

  const handleCheckout = async () => {
    if (!user || !team || cart.length === 0) return;
    
    const isTeamPaidOrLocked = team.paymentStatus?.toLowerCase() === 'paid' || team.status === 'locked';
    if (!isTeamPaidOrLocked) {
       toastError('Team Payment Required', 'You must pay the team registration fee before purchasing add-ons.');
       return;
    }
    
    setIsProcessing(true);
    try {
      const createOrderCallable = httpsCallable(functions, 'createRazorpayOrder');
      const { data: rzpOrder } = await createOrderCallable({
        items: cart.map(i => ({ 
           id: i.id, 
           quantity: i.quantity,
           allocations: i.allocations 
        })),
        notes: { participantId: user.uid, teamId: team.id }
      }) as any;
      
      const firestoreOrderId = rzpOrder.firestoreOrderId;
      
      if (!firestoreOrderId) {
        throw new Error("Failed to initialize order on server.");
      }
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'mock_key_id',
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        name: 'GLITCH 36',
        description: 'Team Add-ons',
        order_id: rzpOrder.id,
        handler: async function (response: any) {
          success('Payment Processing', 'Verifying your payment...');
          try {
            const verifyPaymentCallable = httpsCallable(functions, 'verifyRazorpayPayment');
            await verifyPaymentCallable({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId: firestoreOrderId
            });
            success('Payment Successful', 'Your team order has been confirmed.');
            setCart([]);
          } catch (verifyErr: any) {
            toastError('Verification Failed', verifyErr.message);
          }
        },
        prefill: {
          name: user.displayName || 'Team Leader',
          email: user.email || '',
        },
        theme: {
          color: '#E30613'
        }
      };

      if (options.key === 'mock_key_id' || !(window as any).Razorpay) {
        toastError('Payment Gateway Error', 'Razorpay is not loaded or configured for this environment. Mock payments are disabled in production.');
        setIsProcessing(false);
      } else {
        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', function (response: any) {
          toastError('Payment Failed', response.error.description);
        });
        rzp.open();
      }
      
    } catch (err: any) {
      toastError('Checkout Failed', err.message);
      setIsProcessing(false);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      <div>
        <h2 className="font-bebas text-4xl tracking-widest text-white flex items-center gap-3">
          <ShoppingCart className="w-8 h-8 text-primary" /> TEAM ADD-ONS
        </h2>
        <p className="font-inter text-gray-400">Order meals, official swag, and extra add-ons for your team.</p>
      </div>

      {!isLeader ? (
        <div className="space-y-6">
           <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-center">
              <Users className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="font-bebas text-2xl text-yellow-500 mb-2">TEAM-MANAGED ADD-ONS</h3>
              <p className="font-inter text-gray-300">
                Your team leader manages all purchases and add-on allocations for your team. 
                Please contact your team leader if you need to purchase anything.
              </p>
           </div>
           
           <h3 className="font-bebas text-2xl tracking-wider text-white mt-8 flex items-center gap-2">
             <Package className="w-6 h-6 text-primary" /> MY ENTITLEMENTS
           </h3>
           
           {entitlements.length === 0 ? (
             <div className="text-center p-8 border border-dashed border-white/10 rounded-xl bg-white/5">
                <p className="text-gray-400 font-inter">You do not have any active entitlements yet.</p>
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {entitlements.map(ent => (
                 <Card key={ent.id} className="bg-black/50 border-primary/20">
                    <CardContent className="p-4 flex justify-between items-center">
                       <div>
                         <div className="font-inter text-xs text-gray-400 uppercase tracking-wider">{ent.category}</div>
                         <div className="font-bebas text-xl text-white">{ent.productNameSnapshot}</div>
                       </div>
                       <div className="text-right">
                         <div className="font-bebas text-3xl text-primary">{ent.quantityRemaining}</div>
                         <div className="text-xs text-gray-500">REMAINING</div>
                       </div>
                    </CardContent>
                 </Card>
               ))}
             </div>
           )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <h3 className="font-bebas text-2xl tracking-wider text-white">AVAILABLE CATALOG</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {catalog.map(item => {
                const Icon = item.type === 'food' ? Pizza : Shirt;
                return (
                  <Card key={item.id} className="hover:border-primary/50 transition-colors">
                    <CardContent className="p-4 flex flex-col h-full">
                      <div className="flex justify-between items-start mb-2">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-gray-300" />
                        </div>
                        <span className="font-bebas text-xl text-primary">₹{item.price}</span>
                      </div>
                      <h4 className="font-inter font-medium text-white mb-1">{item.name}</h4>
                      <p className="font-inter text-xs text-gray-400 flex-1 mb-4">{item.description}</p>
                      <Button variant="outline" size="sm" className="w-full" onClick={() => openAllocationModal(item)} leftIcon={Plus}>
                        ALLOCATE TO TEAM
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
              {catalog.length === 0 && (
                <div className="col-span-full text-center p-8 border border-dashed border-white/10 rounded-xl bg-white/5">
                  <p className="text-gray-400 font-inter">No items currently available in the catalog.</p>
                </div>
              )}
            </div>

            <h3 className="font-bebas text-2xl tracking-wider text-white mt-8">YOUR ORDERS</h3>
            {orders.length === 0 ? (
              <div className="text-center p-8 border border-dashed border-white/10 rounded-xl bg-white/5">
                <ShoppingCart className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 font-inter">No previous orders found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <Card key={order.id} className="bg-black/50">
                    <CardContent className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm text-gray-400">#{order.id}</span>
                          {order.status === 'paid' ? <Badge variant="success">PAID</Badge> : 
                           order.status === 'pending_payment' ? <Badge variant="warning">PENDING</Badge> : 
                           <Badge variant="default">{order.status}</Badge>}
                        </div>
                        <div className="font-inter text-sm text-white">
                          {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Ordered on {new Date(order.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="font-bebas text-2xl text-white">
                          ₹{order.totalAmount}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardContent className="p-6">
                <h3 className="font-bebas text-2xl tracking-wider text-white mb-4">CURRENT CART</h3>
                
                {cart.length === 0 ? (
                  <p className="font-inter text-sm text-gray-500 text-center py-4">Your cart is empty.</p>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div key={item.id} className="flex justify-between items-start bg-white/5 p-3 rounded-lg border border-white/10">
                        <div className="flex-1">
                          <div className="font-inter text-sm text-white font-medium">{item.name}</div>
                          <div className="font-mono text-xs text-gray-400 mb-2">Total Qty: {item.quantity} × ₹{item.unitPrice}</div>
                          <div className="space-y-1">
                            {item.allocations?.map(a => {
                               const member = teamMembers.find(m => m.id === a.participantId);
                               return (
                                 <div key={a.participantId} className="flex justify-between text-xs text-gray-400 bg-black/40 p-1 rounded">
                                   <span className="truncate max-w-[120px]">{member?.name || 'Unknown'}</span>
                                   <span>{a.quantity}</span>
                                 </div>
                               );
                            })}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 ml-3">
                          <span className="font-bebas text-lg text-primary leading-none">₹{item.totalPrice}</span>
                          <button onClick={() => removeFromCart(item.id)} className="text-gray-500 hover:text-red-400 text-xs font-bold mt-1">✕ REMOVE</button>
                          <button onClick={() => openAllocationModal(catalog.find(c => c.id === item.id)!)} className="text-gray-500 hover:text-white text-xs font-inter mt-1 underline">Edit</button>
                        </div>
                      </div>
                    ))}
                    
                    <div className="pt-4 border-t border-white/10 mt-4">
                      <div className="flex justify-between items-center mb-6">
                        <span className="font-inter text-gray-400">Total</span>
                        <span className="font-bebas text-3xl text-white">₹{cartTotal}</span>
                      </div>
                      
                      <Button 
                        className="w-full" 
                        onClick={handleCheckout}
                        isLoading={isProcessing}
                        leftIcon={CreditCard}
                      >
                        PROCEED TO CHECKOUT
                      </Button>
                      <div className="text-center text-xs text-gray-500 mt-3 font-inter flex flex-col gap-1">
                        <span>Secure payment.</span>
                        <div className="flex justify-center gap-2 text-primary">
                          <a href="/terms" target="_blank" className="hover:text-white underline">Terms & Conditions</a>
                          <span className="text-gray-600">|</span>
                          <a href="/refund-policy" target="_blank" className="hover:text-white underline">Refund Policy</a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      
      {/* Recipient Selection Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <Card className="w-full max-w-md bg-[#111] border-white/10 shadow-2xl">
             <CardContent className="p-6">
                <div className="flex justify-between items-start mb-6">
                   <div>
                     <h3 className="font-bebas text-2xl text-white">ALLOCATE: {selectedItem.name}</h3>
                     <p className="text-gray-400 text-sm font-inter">Assign quantities for your team members.</p>
                   </div>
                   <button onClick={() => setSelectedItem(null)} className="text-gray-500 hover:text-white">
                      <X className="w-6 h-6" />
                   </button>
                </div>
                
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                   {teamMembers.map(member => (
                      <div key={member.id} className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5">
                         <div className="truncate pr-4 flex-1">
                            <div className="font-inter text-white text-sm font-medium">{member.name}</div>
                            <div className="text-xs text-gray-500">{member.glitchId || 'Pending ID'}</div>
                         </div>
                         <div className="flex items-center gap-3">
                            <button 
                              onClick={() => handleUpdateAllocation(member.id, -1)}
                              disabled={(allocations[member.id] || 0) <= 0}
                              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white disabled:opacity-30 transition-opacity"
                            >-</button>
                            <span className="font-mono text-lg w-6 text-center text-white">{allocations[member.id] || 0}</span>
                            <button 
                              onClick={() => handleUpdateAllocation(member.id, 1)}
                              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary/90 transition-colors"
                            >+</button>
                         </div>
                      </div>
                   ))}
                </div>
                
                <div className="mt-6 pt-4 border-t border-white/10 flex justify-end gap-3">
                   <Button variant="outline" onClick={() => setSelectedItem(null)}>CANCEL</Button>
                   <Button onClick={saveAllocationsToCart}>SAVE TO CART</Button>
                </div>
             </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
